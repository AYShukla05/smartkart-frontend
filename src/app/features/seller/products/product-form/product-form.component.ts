import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import {
  ProductService,
  CategoryService,
  Category,
  ProductImage,
  convertToWebp,
  isValidImageType,
  isValidFileSize,
} from "../../../../core";
import { ToastService, ConfirmModalComponent } from "../../../../shared";

@Component({
  selector: "app-product-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ConfirmModalComponent],
  templateUrl: "./product-form.component.html",
  styleUrl: "./product-form.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly editId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.editId() !== null);
  readonly pageTitle = computed(() =>
    this.isEditMode() ? "Edit Product" : "Add New Product"
  );

  // Image management
  readonly images = signal<ProductImage[]>([]);
  readonly pendingFiles = signal<File[]>([]);
  readonly pendingPreviews = signal<{ name: string; url: string }[]>([]);
  readonly isUploading = signal(false);
  readonly uploadProgress = signal<string | null>(null);
  readonly deleteModalOpen = signal(false);
  readonly deletingImageId = signal<number | null>(null);
  readonly isDeletingImage = signal(false);

  readonly productForm = this.fb.group({
    name: ["", [Validators.required, Validators.maxLength(255)]],
    description: [""],
    price: [0, [Validators.required, Validators.min(0.01)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    category: [0, [Validators.required, Validators.min(1)]],
    is_active: [true],
  });

  ngOnInit(): void {
    this.loadCategories();

    const idParam = this.route.snapshot.paramMap.get("id");
    if (idParam) {
      const id = Number(idParam);
      if (!isNaN(id)) {
        this.editId.set(id);
        this.loadProduct(id);
      }
    }
  }

  private loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.toast.error("Failed to load categories"),
    });
  }

  private loadProduct(id: number): void {
    this.isLoading.set(true);
    this.productService.getById(id).subscribe({
      next: (product) => {
        this.productForm.patchValue({
          name: product.name,
          description: product.description,
          price: +product.price,
          stock: product.stock,
          category: product.category,
          is_active: product.is_active,
        });
        this.images.set(product.images);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error("Failed to load product");
        this.router.navigate(["/seller/products"]);
      },
    });
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const data = this.productForm.getRawValue();
    const editId = this.editId();

    const request = editId
      ? this.productService.update(editId, data)
      : this.productService.create(data);

    request.subscribe({
      next: async (result) => {
        const pending = this.pendingFiles();
        if (!editId && pending.length > 0 && result?.id) {
          this.pendingPreviews().forEach((p) => URL.revokeObjectURL(p.url));
          this.pendingFiles.set([]);
          this.pendingPreviews.set([]);
          await this.uploadFiles(result.id, pending);
        }
        this.toast.success(editId ? "Product updated" : "Product created");
        this.router.navigate(["/seller/products"]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 400 && err.error) {
          const errors = err.error;
          const firstKey = Object.keys(errors)[0];
          if (firstKey && Array.isArray(errors[firstKey])) {
            this.errorMessage.set(errors[firstKey][0]);
          } else {
            this.errorMessage.set("Validation failed. Please check your inputs.");
          }
        } else {
          this.errorMessage.set("An error occurred. Please try again.");
        }
      },
    });
  }

  get name() {
    return this.productForm.get("name");
  }

  get price() {
    return this.productForm.get("price");
  }

  get stock() {
    return this.productForm.get("stock");
  }

  get category() {
    return this.productForm.get("category");
  }

  // --- Image management ---

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!isValidImageType(file)) {
        this.toast.error(`"${file.name}" is not a supported format. Use JPG or PNG.`);
        continue;
      }
      if (!isValidFileSize(file)) {
        this.toast.error(`"${file.name}" exceeds 10 MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      input.value = "";
      return;
    }

    const productId = this.editId();
    if (productId) {
      this.uploadFiles(productId, validFiles);
    } else {
      this.queueFiles(validFiles);
    }
    input.value = "";
  }

  private queueFiles(files: File[]): void {
    this.pendingFiles.update((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
    }));
    this.pendingPreviews.update((prev) => [...prev, ...newPreviews]);
  }

  removePendingFile(index: number): void {
    const previews = this.pendingPreviews();
    URL.revokeObjectURL(previews[index].url);
    this.pendingFiles.update((prev) => prev.filter((_, i) => i !== index));
    this.pendingPreviews.update((prev) => prev.filter((_, i) => i !== index));
  }

  private async uploadFiles(productId: number, files: File[]): Promise<void> {
    this.isUploading.set(true);
    this.uploadProgress.set(
      `Uploading ${files.length} ${files.length === 1 ? "image" : "images"}...`
    );

    const results = await Promise.allSettled(
      files.map(async (file) => {
        const webpBlob = await convertToWebp(file);
        const presignResponse = await firstValueFrom(
          this.productService.getPresignedUrl(productId, file.name)
        );
        await firstValueFrom(
          this.productService.uploadToS3(presignResponse.upload_url, webpBlob)
        );
        return firstValueFrom(
          this.productService.saveImageUrl(productId, presignResponse.file_url)
        );
      })
    );

    let successCount = 0;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        this.images.update((imgs) => [...imgs, result.value]);
        successCount++;
      } else {
        this.toast.error(`Failed to upload "${files[i].name}"`);
      }
    }

    this.isUploading.set(false);
    this.uploadProgress.set(null);
    if (successCount > 0) {
      this.toast.success(
        `${successCount} ${successCount === 1 ? "image" : "images"} uploaded`
      );
    }
  }

  setThumbnail(imageId: number): void {
    const productId = this.editId();
    if (!productId) return;

    this.productService.setThumbnail(productId, imageId).subscribe({
      next: () => {
        this.images.update((imgs) =>
          imgs.map((img) => ({ ...img, is_thumbnail: img.id === imageId }))
        );
        this.toast.success("Thumbnail updated");
      },
      error: () => this.toast.error("Failed to set thumbnail"),
    });
  }

  confirmDeleteImage(imageId: number): void {
    this.deletingImageId.set(imageId);
    this.deleteModalOpen.set(true);
  }

  cancelDeleteImage(): void {
    this.deleteModalOpen.set(false);
    this.deletingImageId.set(null);
  }

  executeDeleteImage(): void {
    const imageId = this.deletingImageId();
    const productId = this.editId();
    if (!imageId || !productId) return;

    this.isDeletingImage.set(true);
    this.productService.deleteImage(productId, imageId).subscribe({
      next: () => {
        this.images.update((imgs) => imgs.filter((img) => img.id !== imageId));
        this.toast.success("Image deleted");
        this.cancelDeleteImage();
        this.isDeletingImage.set(false);
      },
      error: () => {
        this.toast.error("Failed to delete image");
        this.isDeletingImage.set(false);
      },
    });
  }
}

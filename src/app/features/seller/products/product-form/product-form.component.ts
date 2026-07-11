import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy } from "@angular/core";
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
  AuthService,
  convertToWebp,
  isValidImageType,
  isValidFileSize,
  normalizeApiError,
} from "../../../../core";
import { ToastService, ConfirmModalComponent } from "../../../../shared";
import { environment } from "../../../../../environments/environment";

interface AiDescriptionSuggestions {
  title: string;
  bullets: string[];
  seoKeywords: string[];
}

@Component({
  selector: "app-product-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ConfirmModalComponent],
  templateUrl: "./product-form.component.html",
  styleUrl: "./product-form.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly authService = inject(AuthService);
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

  // AI description generation
  readonly isGeneratingDescription = signal(false);
  readonly aiGenerationError = signal<string | null>(null);
  readonly aiSuggestions = signal<AiDescriptionSuggestions | null>(null);
  // Keywords already saved on the product before this edit session (empty for
  // a new product). Submitted as-is whenever aiSuggestions is null, so
  // editing unrelated fields (price, stock) never silently wipes keywords
  // from an earlier generation that this session didn't touch.
  readonly existingSeoKeywords = signal<string[]>([]);
  // Whether the "Also suggested" panel is expanded. Purely cosmetic - never
  // clears aiSuggestions itself, so Hide is always reversible via Show.
  readonly suggestionsVisible = signal(true);
  // Free text the seller can add to steer generation (materials, warranty,
  // target keywords, etc.) - not part of productForm since it's only ever
  // used to build the AI prompt, never submitted with the product itself.
  readonly aiAdditionalDetails = this.fb.control("", [Validators.maxLength(500)]);
  // Undo/redo pair for the description field around the most recent
  // generation: preAiDescription is what was there before, aiDescription is
  // what the AI wrote. Both non-null exactly while that generation's result
  // is still available to switch between; Discard clears both.
  readonly preAiDescription = signal<string | null>(null);
  readonly aiDescription = signal<string | null>(null);
  // Which of the two the description field currently holds.
  readonly showingAiDescription = signal(false);

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

  ngOnDestroy(): void {
    // Revoke any pending preview object URLs still outstanding if the user
    // navigates away mid-form (submit/removal already revoke their own).
    this.pendingPreviews().forEach((p) => URL.revokeObjectURL(p.url));
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
        this.existingSeoKeywords.set(product.seo_keywords);
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

    const suggestions = this.aiSuggestions();
    const data = {
      ...this.productForm.getRawValue(),
      // A live (non-discarded) generation's keywords take over; otherwise
      // whatever the product already had (empty for a new product) carries
      // through unchanged.
      seo_keywords: suggestions ? suggestions.seoKeywords : this.existingSeoKeywords(),
    };
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
        this.errorMessage.set(normalizeApiError(err).message);
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

  // --- AI description generation ---

  async generateDescription(): Promise<void> {
    const { name, category: categoryId, price, description: previousDescription } =
      this.productForm.getRawValue();
    const category = this.categories().find((c) => c.id === categoryId);

    if (!name.trim() || !category || !price) {
      this.toast.error("Enter a product name, category, and price first.");
      return;
    }

    this.isGeneratingDescription.set(true);
    this.aiGenerationError.set(null);
    this.aiSuggestions.set(null);
    this.suggestionsVisible.set(true);
    this.preAiDescription.set(previousDescription);
    this.aiDescription.set(null);
    this.showingAiDescription.set(true);
    this.productForm.controls.description.setValue("");

    let streamError: string | null = null;

    try {
      const response = await fetch(`${environment.apiUrl}/ai/generate-description/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authService.getAccessToken()}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          category: category.name,
          price,
          additional_details: this.aiAdditionalDetails.value.trim(),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        streamDone = done;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }

        // SSE events are separated by a blank line ("\n\n"). A single
        // fetch read() chunk isn't guaranteed to end on that boundary, so
        // hold back any trailing partial event for the next chunk -
        // mirrors the buffering the backend does for the JSON marker.
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          if (this.applySseEvent(event) === "error") {
            streamError = this.aiGenerationError();
          }
        }
      }
    } catch {
      streamError = "Failed to generate description. Please try again.";
    }

    if (streamError) {
      this.productForm.controls.description.setValue(previousDescription);
      this.aiSuggestions.set(null);
      this.preAiDescription.set(null);
      this.aiDescription.set(null);
      this.showingAiDescription.set(false);
      this.aiGenerationError.set(streamError);
    }
    this.isGeneratingDescription.set(false);
  }

  /** Switch the description field back to what it was before this generation. */
  undoAiDescription(): void {
    if (!this.showingAiDescription()) return;
    this.productForm.controls.description.setValue(this.preAiDescription() ?? "");
    this.showingAiDescription.set(false);
  }

  /** Switch the description field back to the AI-written version. */
  redoAiDescription(): void {
    const ai = this.aiDescription();
    if (this.showingAiDescription() || ai === null) return;
    this.productForm.controls.description.setValue(ai);
    this.showingAiDescription.set(true);
  }

  /** Permanently reject this generation's description - restores the previous text and closes the banner. */
  discardAiDescription(): void {
    this.productForm.controls.description.setValue(this.preAiDescription() ?? "");
    this.preAiDescription.set(null);
    this.aiDescription.set(null);
    this.showingAiDescription.set(false);
  }

  hideSuggestions(): void {
    this.suggestionsVisible.set(false);
  }

  showSuggestions(): void {
    this.suggestionsVisible.set(true);
  }

  /** Permanently reject this generation's title/bullet/keyword suggestions. */
  discardSuggestions(): void {
    this.aiSuggestions.set(null);
  }

  private applySseEvent(event: string): "error" | void {
    if (!event.startsWith("data: ")) return;
    const data = event.slice("data: ".length);

    if (data === "[DONE]") {
      return;
    }

    if (data.startsWith("[ERROR]")) {
      this.aiGenerationError.set(data.slice("[ERROR]".length).trim());
      return "error";
    }

    if (data.startsWith("[RESULT]")) {
      const result = JSON.parse(data.slice("[RESULT]".length));
      this.aiSuggestions.set({
        title: result.title ?? "",
        bullets: result.bullets ?? [],
        seoKeywords: result.seo_keywords ?? [],
      });
      this.aiDescription.set(result.description ?? "");
      this.productForm.controls.description.setValue(result.description ?? "");
      return;
    }

    // Plain description text token - append live as it streams in.
    this.productForm.controls.description.setValue(
      this.productForm.controls.description.value + data
    );
  }

  useSuggestedTitle(): void {
    const suggestions = this.aiSuggestions();
    if (suggestions?.title) {
      this.productForm.controls.name.setValue(suggestions.title);
    }
  }

  dismissAiSuggestions(): void {
    this.aiSuggestions.set(null);
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

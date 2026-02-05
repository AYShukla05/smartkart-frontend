import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ProductService } from "../../../../core";
import { CategoryService, Category } from "../../../../core";
import { ToastService } from "../../../../shared";

@Component({
  selector: "app-product-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
      next: () => {
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
}

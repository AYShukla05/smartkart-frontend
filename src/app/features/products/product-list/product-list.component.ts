import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import {
  ProductService,
  Product,
  CategoryService,
  Category,
} from "../../../core";
import { ToastService } from "../../../shared";

@Component({
  selector: "app-public-product-list",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./product-list.component.html",
  styleUrl: "./product-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(true);

  readonly searchQuery = signal("");
  readonly selectedCategoryId = signal<number | null>(null);

  readonly filteredProducts = computed(() => {
    let result = this.products();
    const query = this.searchQuery().toLowerCase().trim();
    const catId = this.selectedCategoryId();

    if (query) {
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }
    if (catId !== null) {
      result = result.filter((p) => p.category === catId);
    }
    return result;
  });

  readonly hasActiveFilters = computed(
    () => this.searchQuery().trim() !== "" || this.selectedCategoryId() !== null
  );

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  private loadProducts(): void {
    this.isLoading.set(true);
    this.productService.getPublicList().subscribe({
      next: (products) => {
        this.products.set(products);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error("Failed to load products");
        this.isLoading.set(false);
      },
    });
  }

  private loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.toast.error("Failed to load categories"),
    });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(value ? Number(value) : null);
  }

  clearFilters(): void {
    this.searchQuery.set("");
    this.selectedCategoryId.set(null);
  }
}

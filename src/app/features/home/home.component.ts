import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ProductService, Product, CategoryService, Category } from "../../core";
import { ToastService } from "../../shared";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./home.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly featuredProducts = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(true);
  readonly searchTerm = signal("");

  ngOnInit(): void {
    this.productService.getPublicList({ page_size: 4 }).subscribe({
      next: (response) => {
        this.featuredProducts.set(response.results);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error("Failed to load products.");
        this.isLoading.set(false);
      },
    });

    // Only needed for the quick-link pills below the hero - errors here
    // shouldn't block the rest of the page, so no toast on failure.
    this.categoryService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => {},
    });
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  submitSearch(): void {
    const term = this.searchTerm().trim();
    this.router.navigate(["/products"], term ? { queryParams: { search: term } } : {});
  }
}

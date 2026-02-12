import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ProductService, Product } from "../../../../core";
import { ToastService, ConfirmModalComponent, PaginationComponent } from "../../../../shared";

@Component({
  selector: "app-product-list",
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent, PaginationComponent],
  templateUrl: "./product-list.component.html",
  styleUrl: "./product-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly currentPage = signal(1);
  readonly totalCount = signal(0);
  readonly pageSize = 12;

  readonly searchQuery = signal("");
  readonly selectedOrdering = signal("-created_at");
  private readonly searchSubject = new Subject<string>();

  readonly orderingOptions = [
    { value: "-created_at", label: "Newest First" },
    { value: "created_at", label: "Oldest First" },
    { value: "name", label: "Name: A to Z" },
    { value: "-name", label: "Name: Z to A" },
    { value: "price", label: "Price: Low to High" },
    { value: "-price", label: "Price: High to Low" },
    { value: "stock", label: "Stock: Low to High" },
    { value: "-stock", label: "Stock: High to Low" },
  ];

  readonly hasActiveFilters = () => this.searchQuery().trim() !== "";

  // Delete confirmation state
  readonly deleteModalOpen = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly isDeleting = signal(false);

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.loadProducts();
      });

    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.productService
      .getAll({
        page: this.currentPage(),
        search: this.searchQuery().trim() || undefined,
        ordering: this.selectedOrdering(),
      })
      .subscribe({
        next: (response) => {
          this.products.set(response.results);
          this.totalCount.set(response.count);
          this.isLoading.set(false);
        },
        error: () => {
          this.toast.error("Failed to load products");
          this.isLoading.set(false);
        },
      });
  }

  onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  onOrderingChange(event: Event): void {
    this.selectedOrdering.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
    this.loadProducts();
  }

  clearFilters(): void {
    this.searchQuery.set("");
    this.selectedOrdering.set("-created_at");
    this.currentPage.set(1);
    this.loadProducts();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadProducts();
  }

  confirmDelete(id: number): void {
    this.deletingId.set(id);
    this.deleteModalOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteModalOpen.set(false);
    this.deletingId.set(null);
  }

  executeDelete(): void {
    const id = this.deletingId();
    if (!id) return;

    this.isDeleting.set(true);
    this.productService.delete(id).subscribe({
      next: () => {
        this.toast.success("Product deleted");
        this.loadProducts();
        this.cancelDelete();
        this.isDeleting.set(false);
      },
      error: () => {
        this.toast.error("Failed to delete product");
        this.isDeleting.set(false);
      },
    });
  }
}

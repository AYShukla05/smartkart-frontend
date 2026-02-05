import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { ProductService, Product } from "../../../../core";
import { ToastService, ConfirmModalComponent } from "../../../../shared";

@Component({
  selector: "app-product-list",
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmModalComponent],
  templateUrl: "./product-list.component.html",
  styleUrl: "./product-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);

  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);

  // Delete confirmation state
  readonly deleteModalOpen = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly isDeleting = signal(false);

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.productService.getAll().subscribe({
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

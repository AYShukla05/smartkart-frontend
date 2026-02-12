import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { OrderService, SellerOrder } from "../../../../core";
import { ToastService, PaginationComponent } from "../../../../shared";

@Component({
  selector: "app-seller-order-list",
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: "./order-list.component.html",
  styleUrl: "./order-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerOrderListComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly orders = signal<SellerOrder[]>([]);
  readonly isLoading = signal(true);
  readonly currentPage = signal(1);
  readonly totalCount = signal(0);
  readonly pageSize = 10;

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.orderService.getSellerOrders(this.currentPage()).subscribe({
      next: (response) => {
        this.orders.set(response.results);
        this.totalCount.set(response.count);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error("Failed to load orders");
        this.isLoading.set(false);
      },
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadOrders();
  }

  orderRevenue(order: SellerOrder): number {
    return order.items.reduce(
      (sum, item) => sum + item.price_at_purchase * item.quantity,
      0
    );
  }
}

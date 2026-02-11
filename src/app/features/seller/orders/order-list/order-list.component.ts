import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { OrderService, SellerOrder } from "../../../../core";
import { ToastService } from "../../../../shared";

@Component({
  selector: "app-seller-order-list",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./order-list.component.html",
  styleUrl: "./order-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerOrderListComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly orders = signal<SellerOrder[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    this.orderService.getSellerOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error("Failed to load orders");
        this.isLoading.set(false);
      },
    });
  }

  orderRevenue(order: SellerOrder): number {
    return order.items.reduce(
      (sum, item) => sum + item.price_at_purchase * item.quantity,
      0
    );
  }
}

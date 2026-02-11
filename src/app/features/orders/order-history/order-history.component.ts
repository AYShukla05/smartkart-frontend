import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { OrderService, Order } from "../../../core";
import { ToastService } from "../../../shared";

@Component({
  selector: "app-order-history",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./order-history.component.html",
  styleUrl: "./order-history.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistoryComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly orders = signal<Order[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    this.orderService.getOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error("Failed to load orders.");
        this.isLoading.set(false);
      },
    });
  }
}

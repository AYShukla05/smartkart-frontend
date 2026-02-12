import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";
import { OrderService, SellerOrder } from "../../../core";
import { ToastService } from "../../../shared";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

@Component({
  selector: "app-seller-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./dashboard.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerDashboardComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly stats = signal<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  readonly recentOrders = signal<SellerOrder[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    forkJoin({
      stats: this.orderService.getSellerStats(),
      orders: this.orderService.getSellerOrders(),
    }).subscribe({
      next: ({ stats, orders }) => {
        this.stats.set({
          totalProducts: stats.total_products,
          totalOrders: stats.total_orders,
          totalRevenue: stats.total_revenue,
        });
        this.recentOrders.set(orders.results.slice(0, 5));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error("Failed to load dashboard data.");
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

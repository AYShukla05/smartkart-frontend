import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";
import { ProductService, OrderService, SellerOrder } from "../../../core";
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
  private readonly productService = inject(ProductService);
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
      products: this.productService.getAll(),
      orders: this.orderService.getSellerOrders(),
    }).subscribe({
      next: ({ products, orders }) => {
        const totalRevenue = orders.reduce(
          (sum, order) =>
            sum +
            order.items.reduce(
              (itemSum, item) =>
                itemSum + item.price_at_purchase * item.quantity,
              0
            ),
          0
        );

        this.stats.set({
          totalProducts: products.length,
          totalOrders: orders.length,
          totalRevenue,
        });
        this.recentOrders.set(orders.slice(0, 5));
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

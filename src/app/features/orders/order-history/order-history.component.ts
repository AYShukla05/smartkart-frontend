import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { OrderService, Order } from "../../../core";
import { PaginationComponent, ToastService } from "../../../shared";

@Component({
  selector: "app-order-history",
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationComponent],
  templateUrl: "./order-history.component.html",
  styleUrl: "./order-history.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistoryComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly orders = signal<Order[]>([]);
  readonly isLoading = signal(true);
  readonly currentPage = signal(1);
  readonly totalCount = signal(0);
  readonly pageSize = 10;

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.orderService.getOrders(this.currentPage()).subscribe({
      next: (response) => {
        this.orders.set(response.results);
        this.totalCount.set(response.count);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error("Failed to load orders.");
        this.isLoading.set(false);
      },
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadOrders();
  }
}

import { Component, ChangeDetectionStrategy, inject, signal, DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { OrderService, Order } from "../../../core";
import { ToastService } from "../../../shared";

@Component({
  selector: "app-order-detail",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./order-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly order = signal<Order | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal(false);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    this.orderService
      .getOrderById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.isLoading.set(false);
        },
        error: () => {
          this.toast.error("Failed to load order details.");
          this.error.set(true);
          this.isLoading.set(false);
        },
      });
  }
}

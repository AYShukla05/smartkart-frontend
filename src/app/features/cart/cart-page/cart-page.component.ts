import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { CartService, CartItem, OrderService } from "../../../core";
import { ToastService } from "../../../shared";

@Component({
  selector: "app-cart-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./cart-page.component.html",
  styleUrl: "./cart-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPageComponent implements OnInit {
  readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly checkingOut = signal(false);

  ngOnInit(): void {
    this.cartService.loadCart();
  }

  increment(item: CartItem): void {
    this.cartService
      .updateQuantity(item.id, item.product_id, item.quantity + 1)
      .subscribe({
        error: () => this.toast.error("Failed to update quantity"),
      });
  }

  decrement(item: CartItem): void {
    if (item.quantity > 1) {
      this.cartService
        .updateQuantity(item.id, item.product_id, item.quantity - 1)
        .subscribe({
          error: () => this.toast.error("Failed to update quantity"),
        });
    } else {
      this.removeItem(item);
    }
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(item.id).subscribe({
      next: () => this.toast.success("Item removed from cart"),
      error: () => this.toast.error("Failed to remove item"),
    });
  }

  checkout(): void {
    this.checkingOut.set(true);
    this.orderService.checkout().subscribe({
      next: (res) => {
        this.cartService.clearLocal();
        this.router.navigate(["/orders/success", res.order_id], {
          state: { totalAmount: res.total_amount },
        });
      },
      error: (err) => {
        this.checkingOut.set(false);
        const detail = err.error?.detail;
        this.toast.error(detail || "Checkout failed. Please try again.");
      },
    });
  }
}

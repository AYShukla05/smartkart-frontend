import { Component, ChangeDetectionStrategy, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { CartService, CartItem } from "../../../core";
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
  private readonly toast = inject(ToastService);

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
    this.toast.info("Checkout coming soon!");
  }
}

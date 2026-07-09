import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { finalize } from "rxjs";
import { CartService, CartItem, OrderService, normalizeApiError } from "../../../core";
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

  /** Item ids with an in-flight quantity/remove request, to guard against dropped rapid clicks. */
  private readonly _pendingItemIds = signal<ReadonlySet<number>>(new Set());
  readonly pendingItemIds = this._pendingItemIds.asReadonly();

  ngOnInit(): void {
    this.cartService.loadCart();
  }

  isPending(itemId: number): boolean {
    return this._pendingItemIds().has(itemId);
  }

  private setPending(itemId: number, pending: boolean): void {
    this._pendingItemIds.update((ids) => {
      const next = new Set(ids);
      if (pending) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  }

  increment(item: CartItem): void {
    if (this.isPending(item.id)) return;

    // Read the live quantity from the cart signal rather than the template-bound
    // `item` snapshot, so two rapid clicks don't both compute from a stale value.
    const current = this.cartService.items().find((i) => i.id === item.id);
    if (!current) return;

    this.setPending(item.id, true);
    this.cartService
      .updateQuantity(item.id, item.product_id, current.quantity + 1)
      .pipe(finalize(() => this.setPending(item.id, false)))
      .subscribe({
        error: () => this.toast.error("Failed to update quantity"),
      });
  }

  decrement(item: CartItem): void {
    if (this.isPending(item.id)) return;

    const current = this.cartService.items().find((i) => i.id === item.id);
    if (!current) return;

    if (current.quantity > 1) {
      this.setPending(item.id, true);
      this.cartService
        .updateQuantity(item.id, item.product_id, current.quantity - 1)
        .pipe(finalize(() => this.setPending(item.id, false)))
        .subscribe({
          error: () => this.toast.error("Failed to update quantity"),
        });
    } else {
      this.removeItem(item);
    }
  }

  removeItem(item: CartItem): void {
    if (this.isPending(item.id)) return;

    this.setPending(item.id, true);
    this.cartService
      .removeItem(item.id)
      .pipe(finalize(() => this.setPending(item.id, false)))
      .subscribe({
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
        this.toast.error(normalizeApiError(err).message);
      },
    });
  }
}

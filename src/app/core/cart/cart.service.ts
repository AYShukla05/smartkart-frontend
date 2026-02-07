import { inject, Injectable, signal, computed } from "@angular/core";
import { EMPTY, Observable, Subject, switchMap, tap, catchError } from "rxjs";
import { ApiService } from "../api/api.service";
import { Cart, CartItem } from "./cart.models";

@Injectable({
  providedIn: "root",
})
export class CartService {
  private readonly api = inject(ApiService);

  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();
  private readonly _isLoaded = signal(false);
  readonly isLoaded = this._isLoaded.asReadonly();

  readonly itemCount = computed<number>(() =>
    this._items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly subtotal = computed<number>(() =>
    this._items().reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  );

  private readonly loadTrigger = new Subject<void>();

  constructor() {
    this.loadTrigger
      .pipe(
        switchMap(() =>
          this.api.get<Cart>("/cart/").pipe(
            catchError(() => {
              this._items.set([]);
              this._isLoaded.set(true);
              return EMPTY;
            })
          )
        )
      )
      .subscribe((cart) => {
        this._items.set(cart.items);
        this._isLoaded.set(true);
      });
  }

  getItemByProductId(productId: number): CartItem | undefined {
    return this._items().find((item) => item.product_id === productId);
  }

  loadCart(): void {
    this.loadTrigger.next();
  }

  addItem(productId: number, quantity: number): Observable<CartItem> {
    return this.api
      .post<CartItem>("/cart/items/", { product_id: productId, quantity })
      .pipe(tap(() => this.loadCart()));
  }

  updateQuantity(
    itemId: number,
    productId: number,
    quantity: number
  ): Observable<CartItem> {
    this._items.update((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
    return this.api
      .patch<CartItem>(`/cart/items/${itemId}/`, {
        product_id: productId,
        quantity,
      })
      .pipe(
        catchError((err) => {
          this.loadCart();
          throw err;
        })
      );
  }

  removeItem(itemId: number): Observable<void> {
    this._items.update((items) => items.filter((item) => item.id !== itemId));
    return this.api
      .delete<void>(`/cart/items/${itemId}/`)
      .pipe(
        catchError((err) => {
          this.loadCart();
          throw err;
        })
      );
  }

  clearLocal(): void {
    this._items.set([]);
    this._isLoaded.set(false);
  }
}

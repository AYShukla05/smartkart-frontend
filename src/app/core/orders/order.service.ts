import { inject, Injectable } from "@angular/core";
import { Observable, map } from "rxjs";
import { ApiService } from "../api/api.service";
import { Order, CheckoutResponse } from "./order.models";

@Injectable({
  providedIn: "root",
})
export class OrderService {
  private readonly api = inject(ApiService);

  checkout(): Observable<CheckoutResponse> {
    return this.api
      .post<CheckoutResponse>("/orders/checkout/", {})
      .pipe(
        map((res) => ({ ...res, total_amount: Number(res.total_amount) }))
      );
  }

  getOrderById(id: number): Observable<Order> {
    return this.api.get<Order>(`/orders/${id}/`).pipe(
      map((order) => ({
        ...order,
        total_amount: Number(order.total_amount),
        items: order.items.map((item) => ({
          ...item,
          price_at_purchase: Number(item.price_at_purchase),
        })),
      }))
    );
  }

  getOrders(): Observable<Order[]> {
    return this.api.get<Order[]>("/orders/").pipe(
      map((orders) =>
        orders.map((order) => ({
          ...order,
          total_amount: Number(order.total_amount),
          items: order.items.map((item) => ({
            ...item,
            price_at_purchase: Number(item.price_at_purchase),
          })),
        }))
      )
    );
  }
}

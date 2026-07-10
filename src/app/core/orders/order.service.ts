import { inject, Injectable } from "@angular/core";
import { Observable, map } from "rxjs";
import { ApiService } from "../api/api.service";
import { PaginatedResponse } from "../../shared";
import { AdminOrder, Order, SellerOrder, CheckoutResponse } from "./order.models";

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

  getOrders(page?: number): Observable<PaginatedResponse<Order>> {
    const query: Record<string, string | number> = {};
    if (page) query["page"] = page;
    return this.api
      .get<PaginatedResponse<Order>>("/orders/", query)
      .pipe(
        map((res) => ({
          ...res,
          results: res.results.map((order) => ({
            ...order,
            total_amount: Number(order.total_amount),
            items: order.items.map((item) => ({
              ...item,
              price_at_purchase: Number(item.price_at_purchase),
            })),
          })),
        }))
      );
  }

  getSellerOrders(page?: number): Observable<PaginatedResponse<SellerOrder>> {
    const query: Record<string, string | number> = {};
    if (page) query["page"] = page;
    return this.api
      .get<PaginatedResponse<SellerOrder>>("/orders/seller/", query)
      .pipe(
        map((res) => ({
          ...res,
          results: res.results.map((order) => ({
            ...order,
            items: order.items.map((item) => ({
              ...item,
              price_at_purchase: Number(item.price_at_purchase),
            })),
          })),
        }))
      );
  }

  /** Fetches every order platform-wide, regardless of buyer (admin only) */
  getAdminOrders(params?: {
    page?: number;
    search?: string;
    status?: "PLACED" | "CANCELLED";
  }): Observable<PaginatedResponse<AdminOrder>> {
    const query: Record<string, string | number> = {};
    if (params?.page) query["page"] = params.page;
    if (params?.search) query["search"] = params.search;
    if (params?.status) query["status"] = params.status;
    return this.api
      .get<PaginatedResponse<AdminOrder>>("/orders/admin/", query)
      .pipe(
        map((res) => ({
          ...res,
          results: res.results.map((order) => ({
            ...order,
            total_amount: Number(order.total_amount),
            items: order.items.map((item) => ({
              ...item,
              price_at_purchase: Number(item.price_at_purchase),
            })),
          })),
        }))
      );
  }

  getSellerStats(): Observable<{
    total_orders: number;
    total_revenue: number;
    total_products: number;
  }> {
    return this.api
      .get<{
        total_orders: number;
        total_revenue: string;
        total_products: number;
      }>("/orders/seller/stats/")
      .pipe(
        map((stats) => ({
          ...stats,
          total_revenue: Number(stats.total_revenue),
        }))
      );
  }
}

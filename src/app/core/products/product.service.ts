import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "../api/api.service";
import { Product, ProductDetail, ProductRequest } from "./product.models";

@Injectable({
  providedIn: "root",
})
export class ProductService {
  private readonly api = inject(ApiService);

  // --- Public endpoints ---

  /** Fetches all active products (public) */
  getPublicList(): Observable<Product[]> {
    return this.api.get<Product[]>("/products/");
  }

  /** Fetches a single product's full details (public, active only) */
  getPublicDetail(id: number): Observable<ProductDetail> {
    return this.api.get<ProductDetail>(`/products/${id}/`);
  }

  // --- Seller endpoints ---

  /** Fetches all products owned by the current seller */
  getAll(): Observable<Product[]> {
    return this.api.get<Product[]>("/products/my/");
  }

  /** Fetches a single product by ID (seller's own, for edit form) */
  getById(id: number): Observable<ProductDetail> {
    return this.api.get<ProductDetail>(`/products/my/${id}/`);
  }

  /** Creates a new product */
  create(data: ProductRequest): Observable<ProductDetail> {
    return this.api.post<ProductDetail>("/products/my/", data);
  }

  /** Updates an existing product (partial) */
  update(id: number, data: ProductRequest): Observable<ProductDetail> {
    return this.api.patch<ProductDetail>(`/products/my/${id}/`, data);
  }

  /** Deletes a product */
  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/products/my/${id}/`);
  }
}

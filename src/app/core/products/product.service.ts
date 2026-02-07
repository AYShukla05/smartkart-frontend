import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { ApiService } from "../api/api.service";
import {
  Product,
  ProductDetail,
  ProductImage,
  ProductRequest,
  PresignedUrlResponse,
} from "./product.models";

@Injectable({
  providedIn: "root",
})
export class ProductService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

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

  // --- Image endpoints ---

  /** Requests a presigned S3 PUT URL for image upload */
  getPresignedUrl(
    productId: number,
    fileName: string
  ): Observable<PresignedUrlResponse> {
    return this.api.post<PresignedUrlResponse>(
      `/products/my/${productId}/images/presign/`,
      { file_name: fileName }
    );
  }

  /** Uploads a webp blob directly to S3 using the presigned URL */
  uploadToS3(presignedUrl: string, file: Blob): Observable<void> {
    return this.http.put<void>(presignedUrl, file, {
      headers: { "Content-Type": "image/webp" },
    });
  }

  /** Saves the S3 file URL to the backend DB */
  saveImageUrl(
    productId: number,
    imageUrl: string
  ): Observable<ProductImage> {
    return this.api.post<ProductImage>(
      `/products/my/${productId}/images/`,
      { image_url: imageUrl }
    );
  }

  /** Sets an image as the product thumbnail */
  setThumbnail(productId: number, imageId: number): Observable<void> {
    return this.api.patch<void>(
      `/products/my/${productId}/images/${imageId}/thumbnail/`,
      {}
    );
  }

  /** Deletes a product image (from DB and S3) */
  deleteImage(productId: number, imageId: number): Observable<void> {
    return this.api.delete<void>(
      `/products/my/${productId}/images/${imageId}/`
    );
  }
}

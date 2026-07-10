import { inject, Injectable } from "@angular/core";
import { Observable, map } from "rxjs";
import { ApiService } from "../api/api.service";
import { PaginatedResponse } from "../../shared";
import { Category, CategoryRequest } from "./category.models";

@Injectable({
  providedIn: "root",
})
export class CategoryService {
  private readonly api = inject(ApiService);

  /**
   * Fetches all categories (public). The backend paginates this endpoint
   * (max_page_size 50), so this requests the maximum page size to cover
   * realistic category counts and unwraps `.results` to keep callers
   * working with a plain array.
   */
  getAll(): Observable<Category[]> {
    return this.api
      .get<PaginatedResponse<Category>>("/categories/", { page_size: 50 })
      .pipe(map((response) => response.results));
  }

  /** Fetches a single category by ID */
  getById(id: number): Observable<Category> {
    return this.api.get<Category>(`/categories/${id}/`);
  }

  /** Creates a new category (admin only) */
  create(data: CategoryRequest): Observable<Category> {
    return this.api.post<Category>("/categories/", data);
  }

  /** Updates an existing category (admin only) */
  update(id: number, data: CategoryRequest): Observable<Category> {
    return this.api.patch<Category>(`/categories/${id}/`, data);
  }

  /** Deletes a category (admin only) */
  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/categories/${id}/`);
  }
}

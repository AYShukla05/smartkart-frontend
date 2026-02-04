import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "../api/api.service";
import { Category, CategoryRequest } from "./category.models";

@Injectable({
  providedIn: "root",
})
export class CategoryService {
  private readonly api = inject(ApiService);

  /** Fetches all categories (public) */
  getAll(): Observable<Category[]> {
    return this.api.get<Category[]>("/categories/");
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

import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "../api/api.service";
import { PaginatedResponse } from "../../shared";
import { AdminUser } from "./user.models";

@Injectable({
  providedIn: "root",
})
export class UserService {
  private readonly api = inject(ApiService);

  /** Fetches every user platform-wide (admin only) */
  getAdminList(params?: {
    page?: number;
    search?: string;
    role?: "BUYER" | "SELLER";
    is_active?: boolean;
  }): Observable<PaginatedResponse<AdminUser>> {
    const query: Record<string, string | number> = {};
    if (params?.page) query["page"] = params.page;
    if (params?.search) query["search"] = params.search;
    if (params?.role) query["role"] = params.role;
    if (params?.is_active !== undefined) query["is_active"] = String(params.is_active);
    return this.api.get<PaginatedResponse<AdminUser>>("/users/admin/", query);
  }
}

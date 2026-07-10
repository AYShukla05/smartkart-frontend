/** Shape returned by GET /api/users/admin/ */
export interface AdminUser {
  id: number;
  email: string;
  role: "BUYER" | "SELLER";
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface CategoryRequest {
  name: string;
}

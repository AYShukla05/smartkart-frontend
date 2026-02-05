/** Shape returned by GET /api/products/my/ (list) */
export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  category: number;
  category_name: string;
  seller_id: number;
}

export interface ProductImage {
  id: number;
  image_url: string;
}

/** Shape returned by GET /api/products/:id/ or /api/products/my/:id/ */
export interface ProductDetail {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: number;
  category_name: string;
  is_active: boolean;
  seller_id: number;
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}

/** Shape sent to POST/PATCH /api/products/my/ */
export interface ProductRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: number;
  is_active: boolean;
}

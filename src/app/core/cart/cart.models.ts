export interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  thumbnail: string | null;
}

export interface Cart {
  items: CartItem[];
}

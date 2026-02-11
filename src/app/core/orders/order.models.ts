export interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
}

export interface Order {
  id: number;
  status: "PLACED" | "CANCELLED";
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

export interface CheckoutResponse {
  order_id: number;
  total_amount: number;
}

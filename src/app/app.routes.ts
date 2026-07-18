import { Routes } from "@angular/router";
import { guestGuard, buyerGuard, sellerGuard, adminGuard } from "./core";

export const routes: Routes = [
  // Auth routes (guest only)
  {
    path: "login",
    title: "Login - SmartKart",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/login/login.component").then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: "register",
    title: "Register - SmartKart",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/register/register.component").then(
        (m) => m.RegisterComponent
      ),
  },

  // Public home (no auth required)
  {
    path: "",
    loadComponent: () =>
      import("./layouts/main-layout/main-layout.component").then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: "",
        title: "Home - SmartKart",
        loadComponent: () =>
          import("./features/home/home.component").then((m) => m.HomeComponent),
      },
      {
        path: "products",
        title: "Products - SmartKart",
        loadComponent: () =>
          import(
            "./features/products/product-list/product-list.component"
          ).then((m) => m.PublicProductListComponent),
      },
      {
        path: "products/:id",
        title: "Product Details - SmartKart",
        loadComponent: () =>
          import(
            "./features/products/product-detail/product-detail.component"
          ).then((m) => m.PublicProductDetailComponent),
      },
      {
        path: "cart",
        title: "Cart - SmartKart",
        canActivate: [buyerGuard],
        loadComponent: () =>
          import("./features/cart/cart-page/cart-page.component").then(
            (m) => m.CartPageComponent
          ),
      },
      {
        path: "orders/success/:id",
        title: "Order Confirmed - SmartKart",
        canActivate: [buyerGuard],
        loadComponent: () =>
          import(
            "./features/orders/order-success/order-success.component"
          ).then((m) => m.OrderSuccessComponent),
      },
      {
        path: "orders/:id",
        canActivate: [buyerGuard],
        loadComponent: () =>
          import(
            "./features/orders/order-detail/order-detail.component"
          ).then((m) => m.OrderDetailComponent),
      },
      {
        path: "orders",
        title: "My Orders - SmartKart",
        canActivate: [buyerGuard],
        loadComponent: () =>
          import(
            "./features/orders/order-history/order-history.component"
          ).then((m) => m.OrderHistoryComponent),
      },
    ],
  },

  // Seller routes (seller only)
  {
    path: "seller",
    canActivate: [sellerGuard],
    loadComponent: () =>
      import("./layouts/main-layout/main-layout.component").then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: "",
        title: "Dashboard - SmartKart Seller",
        loadComponent: () =>
          import("./features/seller/dashboard/dashboard.component").then(
            (m) => m.SellerDashboardComponent
          ),
      },
      {
        path: "products",
        title: "My Products - SmartKart Seller",
        loadComponent: () =>
          import(
            "./features/seller/products/product-list/product-list.component"
          ).then((m) => m.ProductListComponent),
      },
      {
        path: "products/new",
        title: "New Product - SmartKart Seller",
        loadComponent: () =>
          import(
            "./features/seller/products/product-form/product-form.component"
          ).then((m) => m.ProductFormComponent),
      },
      {
        path: "products/:id/edit",
        title: "Edit Product - SmartKart Seller",
        loadComponent: () =>
          import(
            "./features/seller/products/product-form/product-form.component"
          ).then((m) => m.ProductFormComponent),
      },
      {
        path: "orders",
        title: "Orders - SmartKart Seller",
        loadComponent: () =>
          import(
            "./features/seller/orders/order-list/order-list.component"
          ).then((m) => m.SellerOrderListComponent),
      },
      {
        path: "assistant",
        title: "Seller Assistant - SmartKart Seller",
        loadComponent: () =>
          import(
            "./features/seller/assistant/assistant.component"
          ).then((m) => m.SellerAssistantComponent),
      },
    ],
  },

  // Admin routes (is_staff only)
  {
    path: "admin",
    canActivate: [adminGuard],
    loadComponent: () =>
      import("./layouts/main-layout/main-layout.component").then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: "",
        redirectTo: "categories",
        pathMatch: "full",
      },
      {
        path: "categories",
        title: "Categories - SmartKart Admin",
        loadComponent: () =>
          import("./features/admin/categories/category-list.component").then(
            (m) => m.CategoryListComponent
          ),
      },
      {
        path: "users",
        title: "Users - SmartKart Admin",
        loadComponent: () =>
          import("./features/admin/users/user-list.component").then(
            (m) => m.AdminUserListComponent
          ),
      },
      {
        path: "products",
        title: "Products - SmartKart Admin",
        loadComponent: () =>
          import("./features/admin/products/product-list.component").then(
            (m) => m.AdminProductListComponent
          ),
      },
      {
        path: "orders",
        title: "Orders - SmartKart Admin",
        loadComponent: () =>
          import("./features/admin/orders/order-list.component").then(
            (m) => m.AdminOrderListComponent
          ),
      },
    ],
  },

  {
    path: "not-found",
    loadComponent: () =>
      import("./features/not-found/not-found.component").then(
        (m) => m.NotFoundComponent
      ),
  },
  { path: "**", redirectTo: "/not-found" },
];

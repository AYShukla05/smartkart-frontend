import { Routes } from "@angular/router";
import { guestGuard, buyerGuard, sellerGuard, adminGuard } from "./core";

export const routes: Routes = [
  // Auth routes (guest only)
  {
    path: "login",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/login/login.component").then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: "register",
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
        loadComponent: () =>
          import("./features/home/home.component").then((m) => m.HomeComponent),
      },
      {
        path: "products",
        loadComponent: () =>
          import(
            "./features/products/product-list/product-list.component"
          ).then((m) => m.PublicProductListComponent),
      },
      {
        path: "products/:id",
        loadComponent: () =>
          import(
            "./features/products/product-detail/product-detail.component"
          ).then((m) => m.PublicProductDetailComponent),
      },
      {
        path: "cart",
        canActivate: [buyerGuard],
        loadComponent: () =>
          import("./features/cart/cart-page/cart-page.component").then(
            (m) => m.CartPageComponent
          ),
      },
      {
        path: "orders/success/:id",
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
        loadComponent: () =>
          import("./features/seller/dashboard/dashboard.component").then(
            (m) => m.SellerDashboardComponent
          ),
      },
      {
        path: "products",
        loadComponent: () =>
          import(
            "./features/seller/products/product-list/product-list.component"
          ).then((m) => m.ProductListComponent),
      },
      {
        path: "products/new",
        loadComponent: () =>
          import(
            "./features/seller/products/product-form/product-form.component"
          ).then((m) => m.ProductFormComponent),
      },
      {
        path: "products/:id/edit",
        loadComponent: () =>
          import(
            "./features/seller/products/product-form/product-form.component"
          ).then((m) => m.ProductFormComponent),
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
        loadComponent: () =>
          import("./features/admin/categories/category-list.component").then(
            (m) => m.CategoryListComponent
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

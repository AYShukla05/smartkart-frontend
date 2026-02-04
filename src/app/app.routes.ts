import { Routes } from "@angular/router";
import { guestGuard, buyerGuard, sellerGuard } from "./core";

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

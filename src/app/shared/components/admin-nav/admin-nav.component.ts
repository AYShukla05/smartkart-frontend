import { Component, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  selector: "app-admin-nav",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: "./admin-nav.component.html",
  styleUrl: "./admin-nav.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNavComponent {
  readonly links = [
    { path: "/admin/categories", label: "Categories" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/products", label: "Products" },
    { path: "/admin/orders", label: "Orders" },
  ];
}

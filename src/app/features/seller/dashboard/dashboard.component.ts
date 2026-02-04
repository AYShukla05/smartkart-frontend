import { Component, ChangeDetectionStrategy } from "@angular/core";

@Component({
  selector: "app-seller-dashboard",
  standalone: true,
  templateUrl: "./dashboard.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerDashboardComponent {}

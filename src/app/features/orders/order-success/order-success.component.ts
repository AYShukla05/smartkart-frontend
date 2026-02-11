import { Component, ChangeDetectionStrategy, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

@Component({
  selector: "app-order-success",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./order-success.component.html",
  styleUrl: "./order-success.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSuccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  orderId: number | null = null;
  totalAmount: number | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (id) {
      this.orderId = id;
      this.totalAmount = history.state?.totalAmount ?? null;
    } else {
      this.router.navigate(["/orders"]);
    }
  }
}

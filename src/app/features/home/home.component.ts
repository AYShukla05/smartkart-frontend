import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { ProductService, Product } from "../../core";
import { ToastService } from "../../shared";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./home.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);

  readonly featuredProducts = signal<Product[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    this.productService.getPublicList({ page_size: 4 }).subscribe({
      next: (response) => {
        this.featuredProducts.set(response.results);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error("Failed to load products.");
        this.isLoading.set(false);
      },
    });
  }
}

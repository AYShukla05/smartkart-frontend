import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ProductService, ProductDetail } from "../../../core";
import { ToastService } from "../../../shared";

@Component({
  selector: "app-public-product-detail",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./product-detail.component.html",
  styleUrl: "./product-detail.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);

  readonly product = signal<ProductDetail | null>(null);
  readonly isLoading = signal(true);
  readonly selectedImageIndex = signal(0);

  readonly selectedImage = computed(() => {
    const p = this.product();
    if (!p || p.images.length === 0) return null;
    return p.images[this.selectedImageIndex()];
  });

  readonly isInStock = computed(() => {
    const p = this.product();
    return p !== null && p.stock > 0;
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get("id");
    if (idParam) {
      const id = Number(idParam);
      if (!isNaN(id)) {
        this.loadProduct(id);
        return;
      }
    }
    this.router.navigate(["/products"]);
  }

  private loadProduct(id: number): void {
    this.isLoading.set(true);
    this.productService.getPublicDetail(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error("Product not found");
        this.router.navigate(["/products"]);
      },
    });
  }

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  addToCart(): void {
    this.toast.info("Cart feature coming soon!");
  }
}

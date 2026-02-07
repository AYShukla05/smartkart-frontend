import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ProductService, ProductDetail, CartService, CartItem, AuthService } from "../../../core";
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
  readonly cartService = inject(CartService);
  readonly auth = inject(AuthService);
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

  readonly cartItem = computed<CartItem | undefined>(() => {
    const p = this.product();
    if (!p) return undefined;
    return this.cartService.getItemByProductId(p.id);
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
    if (!this.auth.isBuyer()) {
      this.toast.info("Please log in as a buyer to add items to cart");
      return;
    }
    const product = this.product();
    if (!product) return;
    this.cartService.addItem(product.id, 1).subscribe({
      next: () => this.toast.success("Added to cart"),
      error: () => this.toast.error("Failed to add to cart"),
    });
  }

  incrementCart(): void {
    const item = this.cartItem();
    if (!item) return;
    this.cartService
      .updateQuantity(item.id, item.product_id, item.quantity + 1)
      .subscribe({
        error: () => this.toast.error("Failed to update quantity"),
      });
  }

  decrementCart(): void {
    const item = this.cartItem();
    if (!item) return;
    if (item.quantity > 1) {
      this.cartService
        .updateQuantity(item.id, item.product_id, item.quantity - 1)
        .subscribe({
          error: () => this.toast.error("Failed to update quantity"),
        });
    } else {
      this.removeFromCart();
    }
  }

  removeFromCart(): void {
    const item = this.cartItem();
    if (!item) return;
    this.cartService.removeItem(item.id).subscribe({
      next: () => this.toast.success("Removed from cart"),
      error: () => this.toast.error("Failed to remove from cart"),
    });
  }
}

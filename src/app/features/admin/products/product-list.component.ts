import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ProductService, AdminProduct, CategoryService, Category } from "../../../core";
import { ToastService, PaginationComponent, AdminNavComponent } from "../../../shared";

@Component({
  selector: "app-admin-product-list",
  standalone: true,
  imports: [CommonModule, PaginationComponent, AdminNavComponent],
  templateUrl: "./product-list.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<AdminProduct[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(true);
  readonly searchQuery = signal("");
  readonly selectedCategoryId = signal<number | null>(null);
  readonly selectedActive = signal<"true" | "false" | "">("");
  readonly currentPage = signal(1);
  readonly totalCount = signal(0);
  readonly pageSize = 20;

  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.loadProducts();
      });

    this.loadProducts();
    this.categoryService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.toast.error("Failed to load categories"),
    });
  }

  loadProducts(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const category = this.selectedCategoryId();
    const active = this.selectedActive();

    this.productService
      .getAdminList({
        page: this.currentPage(),
        ...(search ? { search } : {}),
        ...(category !== null ? { category } : {}),
        ...(active !== "" ? { is_active: active === "true" } : {}),
      })
      .subscribe({
        next: (response) => {
          this.products.set(response.results);
          this.totalCount.set(response.count);
          this.isLoading.set(false);
        },
        error: () => {
          this.toast.error("Failed to load products");
          this.isLoading.set(false);
        },
      });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(value ? Number(value) : null);
    this.currentPage.set(1);
    this.loadProducts();
  }

  onActiveChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedActive.set(value as "true" | "false" | "");
    this.currentPage.set(1);
    this.loadProducts();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadProducts();
  }
}

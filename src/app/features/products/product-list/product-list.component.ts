import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  ProductService,
  Product,
  CategoryService,
  Category,
} from "../../../core";
import { ToastService, PaginationComponent } from "../../../shared";

@Component({
  selector: "app-public-product-list",
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationComponent],
  templateUrl: "./product-list.component.html",
  styleUrl: "./product-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(true);

  readonly searchQuery = signal("");
  readonly selectedCategoryId = signal<number | null>(null);
  readonly selectedOrdering = signal("-created_at");
  readonly currentPage = signal(1);
  readonly totalCount = signal(0);
  readonly pageSize = 12;

  private readonly searchSubject = new Subject<string>();

  readonly orderingOptions = [
    { value: "-created_at", label: "Newest First" },
    { value: "created_at", label: "Oldest First" },
    { value: "price", label: "Price: Low to High" },
    { value: "-price", label: "Price: High to Low" },
    { value: "name", label: "Name: A to Z" },
    { value: "-name", label: "Name: Z to A" },
  ];

  readonly hasActiveFilters = () =>
    this.searchQuery().trim() !== "" || this.selectedCategoryId() !== null;

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.loadProducts();
      });

    this.loadProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    const params: {
      page?: number;
      search?: string;
      category?: number;
      ordering?: string;
    } = {
      page: this.currentPage(),
      ordering: this.selectedOrdering(),
    };

    const search = this.searchQuery().trim();
    if (search) params.search = search;

    const catId = this.selectedCategoryId();
    if (catId !== null) params.category = catId;

    this.productService.getPublicList(params).subscribe({
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

  private loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.toast.error("Failed to load categories"),
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

  onOrderingChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedOrdering.set(value);
    this.currentPage.set(1);
    this.loadProducts();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadProducts();
  }

  clearFilters(): void {
    this.searchQuery.set("");
    this.selectedCategoryId.set(null);
    this.selectedOrdering.set("-created_at");
    this.currentPage.set(1);
    this.loadProducts();
  }
}

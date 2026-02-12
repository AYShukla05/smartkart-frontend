import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  ProductService,
  ProductListStateService,
  Product,
  CategoryService,
  Category,
} from "../../../core";
import { ToastService, PaginationComponent, AppLoaderComponent } from "../../../shared";

@Component({
  selector: "app-public-product-list",
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationComponent, AppLoaderComponent],
  templateUrl: "./product-list.component.html",
  styleUrl: "./product-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly listState = inject(ProductListStateService);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(true);

  readonly searchQuery = signal("");
  readonly selectedCategoryId = signal<number | null>(null);
  readonly selectedOrdering = signal("-created_at");
  readonly currentPage = signal(1);
  readonly totalCount = signal(0);
  readonly pageSize = 12; // must match backend's ProductPagination.page_size

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
        this.updateUrl();
      });

    // Read initial filters from the URL - lets links from elsewhere (e.g.
    // the home page's category quick-links) land here pre-filtered, and
    // lets a buyer return to exactly the search/page they left, instead of
    // always opening to an unfiltered list.
    const params = this.route.snapshot.queryParamMap;
    const categoryParam = params.get("category");
    if (categoryParam) {
      this.selectedCategoryId.set(Number(categoryParam));
    }
    const searchParam = params.get("search");
    if (searchParam) {
      this.searchQuery.set(searchParam);
    }
    const orderingParam = params.get("ordering");
    if (orderingParam) {
      this.selectedOrdering.set(orderingParam);
    }
    const pageParam = params.get("page");
    if (pageParam) {
      this.currentPage.set(Number(pageParam));
    }

    // If this exact search/filter/page was already fetched (e.g. the buyer
    // is returning from a product's detail page), restore it directly
    // instead of refetching and showing a loading state again.
    const cached = this.listState.get(this.buildCacheKey());
    if (cached) {
      this.products.set(cached.products);
      this.totalCount.set(cached.totalCount);
      this.isLoading.set(false);
    } else {
      this.loadProducts();
    }

    this.loadCategories();
  }

  // Keeps the address bar in sync with the current search/filter/page state,
  // replacing rather than pushing a history entry so typing or paging
  // doesn't spam browser history - the one meaningful history entry is the
  // navigation away to a product's detail page, which this makes returnable
  // to via the browser's own back behavior.
  private updateUrl(): void {
    const queryParams: Record<string, string | number> = {};

    const search = this.searchQuery().trim();
    if (search) queryParams["search"] = search;

    const catId = this.selectedCategoryId();
    if (catId !== null) queryParams["category"] = catId;

    const ordering = this.selectedOrdering();
    if (ordering !== "-created_at") {
      queryParams["ordering"] = ordering;
    }

    const page = this.currentPage();
    if (page > 1) queryParams["page"] = page;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  // Shared by the API call and the cache key, so both always agree on
  // exactly what search/filter/page state they represent.
  private buildRequestParams(): {
    page?: number;
    search?: string;
    category?: number;
    ordering?: string;
  } {
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

    return params;
  }

  private buildCacheKey(): string {
    return JSON.stringify(this.buildRequestParams());
  }

  loadProducts(): void {
    this.isLoading.set(true);
    const params = this.buildRequestParams();
    // Captured now rather than read fresh inside the response handler - if
    // the buyer changes the search again before this request resolves, the
    // result should still be cached under the params it actually answers.
    const key = JSON.stringify(params);

    this.productService.getPublicList(params).subscribe({
      next: (response) => {
        this.products.set(response.results);
        this.totalCount.set(response.count);
        this.isLoading.set(false);
        this.listState.set({
          key,
          products: response.results,
          totalCount: response.count,
        });
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
    this.updateUrl();
  }

  onOrderingChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedOrdering.set(value);
    this.currentPage.set(1);
    this.loadProducts();
    this.updateUrl();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadProducts();
    this.updateUrl();
  }

  clearFilters(): void {
    this.searchQuery.set("");
    this.selectedCategoryId.set(null);
    this.selectedOrdering.set("-created_at");
    this.currentPage.set(1);
    this.loadProducts();
    this.updateUrl();
  }
}

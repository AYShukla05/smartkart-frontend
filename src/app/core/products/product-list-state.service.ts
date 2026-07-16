import { Injectable } from "@angular/core";
import { Product } from "./product.models";

interface CachedProductListResult {
  key: string;
  products: Product[];
  totalCount: number;
  isSemantic: boolean;
  categoryRelaxed: boolean;
  confidentCount: number;
}

/**
 * Holds the last-fetched product list result, keyed by the search/filter/page
 * params that produced it, so returning to the list from a product's detail
 * page can restore it instantly instead of refetching - a single cached
 * entry is enough since only one search state is ever "current" at a time.
 */
@Injectable({ providedIn: "root" })
export class ProductListStateService {
  private cached: CachedProductListResult | null = null;

  get(key: string): CachedProductListResult | null {
    return this.cached?.key === key ? this.cached : null;
  }

  set(result: CachedProductListResult): void {
    this.cached = result;
  }
}

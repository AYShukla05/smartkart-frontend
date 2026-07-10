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
import { OrderService, AdminOrder } from "../../../core";
import { ToastService, PaginationComponent, AdminNavComponent } from "../../../shared";

@Component({
  selector: "app-admin-order-list",
  standalone: true,
  imports: [CommonModule, PaginationComponent, AdminNavComponent],
  templateUrl: "./order-list.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrderListComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly orders = signal<AdminOrder[]>([]);
  readonly isLoading = signal(true);
  readonly searchQuery = signal("");
  readonly selectedStatus = signal<"PLACED" | "CANCELLED" | "">("");
  readonly currentPage = signal(1);
  readonly totalCount = signal(0);
  readonly pageSize = 20;
  readonly expandedOrderId = signal<number | null>(null);

  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.loadOrders();
      });

    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const status = this.selectedStatus();

    this.orderService
      .getAdminOrders({
        page: this.currentPage(),
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
      })
      .subscribe({
        next: (response) => {
          this.orders.set(response.results);
          this.totalCount.set(response.count);
          this.isLoading.set(false);
        },
        error: () => {
          this.toast.error("Failed to load orders");
          this.isLoading.set(false);
        },
      });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStatus.set(value as "PLACED" | "CANCELLED" | "");
    this.currentPage.set(1);
    this.loadOrders();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadOrders();
  }

  toggleExpand(orderId: number): void {
    this.expandedOrderId.set(this.expandedOrderId() === orderId ? null : orderId);
  }
}

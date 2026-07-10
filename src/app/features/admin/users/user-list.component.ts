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
import { UserService, AdminUser } from "../../../core";
import { ToastService, PaginationComponent, AdminNavComponent } from "../../../shared";

@Component({
  selector: "app-admin-user-list",
  standalone: true,
  imports: [CommonModule, PaginationComponent, AdminNavComponent],
  templateUrl: "./user-list.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly users = signal<AdminUser[]>([]);
  readonly isLoading = signal(true);
  readonly searchQuery = signal("");
  readonly selectedRole = signal<"BUYER" | "SELLER" | "">("");
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
        this.loadUsers();
      });

    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const role = this.selectedRole();

    this.userService
      .getAdminList({
        page: this.currentPage(),
        ...(search ? { search } : {}),
        ...(role ? { role } : {}),
      })
      .subscribe({
        next: (response) => {
          this.users.set(response.results);
          this.totalCount.set(response.count);
          this.isLoading.set(false);
        },
        error: () => {
          this.toast.error("Failed to load users");
          this.isLoading.set(false);
        },
      });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  onRoleChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedRole.set(value as "BUYER" | "SELLER" | "");
    this.currentPage.set(1);
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadUsers();
  }
}

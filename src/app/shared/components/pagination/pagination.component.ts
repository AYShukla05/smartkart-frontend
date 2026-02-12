import { Component, ChangeDetectionStrategy, input, output, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-pagination",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./pagination.component.html",
  styleUrl: "./pagination.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  readonly currentPage = input.required<number>();
  readonly totalItems = input.required<number>();
  readonly pageSize = input.required<number>();

  readonly pageChange = output<number>();

  readonly totalPages = computed(() =>
    Math.ceil(this.totalItems() / this.pageSize())
  );

  readonly hasPrevious = computed(() => this.currentPage() > 1);
  readonly hasNext = computed(() => this.currentPage() < this.totalPages());

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | "...")[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push("...");
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push("...");
      pages.push(total);
    }
    return pages;
  });

  readonly showingFrom = computed(
    () => (this.currentPage() - 1) * this.pageSize() + 1
  );

  readonly showingTo = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.totalItems())
  );

  goToPage(page: number): void {
    if (
      page >= 1 &&
      page <= this.totalPages() &&
      page !== this.currentPage()
    ) {
      this.pageChange.emit(page);
    }
  }
}

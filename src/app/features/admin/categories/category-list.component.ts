import { Component, ChangeDetectionStrategy, inject, signal, OnInit, ElementRef, ViewChild, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CategoryService, Category } from "../../../core";
import { ToastService, ConfirmModalComponent } from "../../../shared";

@Component({
  selector: "app-category-list",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmModalComponent],
  templateUrl: "./category-list.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryListComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(ToastService);

  @ViewChild("nameInput") nameInput!: ElementRef<HTMLInputElement>;

  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(true);
  readonly editingId = signal<number | null>(null);
  readonly isSubmitting = signal(false);

  // Delete confirmation state
  readonly deleteModalOpen = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly isDeleting = signal(false);

  readonly categoryForm = this.fb.group({
    name: ["", [Validators.required, Validators.minLength(2)]],
  });

  @HostListener("document:keydown.escape")
  onEscapeKey(): void {
    // Only handle edit cancel - modal handles its own escape
    if (!this.deleteModalOpen() && this.editingId()) {
      this.cancelEdit();
    }
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);

    this.categoryService.getAll().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error("Failed to load categories");
        this.isLoading.set(false);
      },
    });
  }

  startEdit(category: Category): void {
    this.editingId.set(category.id);
    this.categoryForm.patchValue({ name: category.name });

    // Focus the input after Angular updates the view
    setTimeout(() => this.nameInput?.nativeElement?.focus(), 0);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.categoryForm.reset();
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const data = this.categoryForm.getRawValue();
    const editId = this.editingId();

    const request = editId
      ? this.categoryService.update(editId, data)
      : this.categoryService.create(data);

    request.subscribe({
      next: () => {
        this.toast.success(editId ? "Category updated" : "Category created");
        this.loadCategories();
        this.cancelEdit();
        this.isSubmitting.set(false);
      },
      error: () => {
        this.toast.error(editId ? "Failed to update category" : "Failed to create category");
        this.isSubmitting.set(false);
      },
    });
  }

  confirmDelete(id: number): void {
    this.deletingId.set(id);
    this.deleteModalOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteModalOpen.set(false);
    this.deletingId.set(null);
  }

  executeDelete(): void {
    const id = this.deletingId();
    if (!id) return;

    this.isDeleting.set(true);

    this.categoryService.delete(id).subscribe({
      next: () => {
        this.toast.success("Category deleted");
        this.loadCategories();
        this.cancelDelete();
        this.isDeleting.set(false);
      },
      error: () => {
        this.toast.error("Failed to delete category");
        this.isDeleting.set(false);
      },
    });
  }

  get name() {
    return this.categoryForm.get("name");
  }
}

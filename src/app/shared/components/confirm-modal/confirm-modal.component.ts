import { Component, ChangeDetectionStrategy, input, output, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-confirm-modal",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./confirm-modal.component.html",
  styleUrl: "./confirm-modal.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmModalComponent {
  readonly isOpen = input(false);
  readonly title = input("Confirm Action");
  readonly message = input("Are you sure you want to proceed?");
  readonly confirmText = input("Confirm");
  readonly cancelText = input("Cancel");
  readonly variant = input<"danger" | "primary">("danger");
  readonly isLoading = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  @HostListener("document:keydown.escape")
  onEscapeKey(): void {
    if (this.isOpen() && !this.isLoading()) {
      this.onCancel();
    }
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.isLoading()) {
      this.onCancel();
    }
  }
}

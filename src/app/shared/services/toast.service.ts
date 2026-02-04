import { Injectable, signal } from "@angular/core";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

@Injectable({
  providedIn: "root",
})
export class ToastService {
  private nextId = 0;
  private readonly _toasts = signal<Toast[]>([]);

  readonly toasts = this._toasts.asReadonly();

  success(message: string): void {
    this.show(message, "success");
  }

  error(message: string): void {
    this.show(message, "error");
  }

  info(message: string): void {
    this.show(message, "info");
  }

  private show(message: string, type: Toast["type"]): void {
    const id = this.nextId++;
    const toast: Toast = { id, message, type };

    this._toasts.update((toasts) => [...toasts, toast]);

    setTimeout(() => this.dismiss(id), 4000);
  }

  dismiss(id: number): void {
    this._toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }
}

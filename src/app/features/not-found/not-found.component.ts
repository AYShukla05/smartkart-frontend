import { Component, ChangeDetectionStrategy } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-not-found",
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1
        class="text-6xl font-bold mb-2"
        style="color: var(--color-primary)"
      >
        404
      </h1>
      <p
        class="text-xl font-medium mb-1"
        style="color: var(--color-text)"
      >
        Page not found
      </p>
      <p
        class="text-sm mb-6"
        style="color: var(--color-text-secondary)"
      >
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a
        routerLink="/"
        class="px-6 py-2.5 text-sm font-medium transition-all hover:opacity-90"
        style="
          background: var(--color-primary);
          color: var(--color-text-inverse);
          border-radius: var(--radius-md);
        "
      >
        Go Home
      </a>
    </div>
  `,
})
export class NotFoundComponent {}

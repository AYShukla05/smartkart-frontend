import { inject, Injectable, signal } from "@angular/core";
import { catchError, of, timeout, timer } from "rxjs";
import { ApiService } from "../api";

export type HealthState = "checking" | "slow" | "healthy";

const REQUEST_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 3000;
const SLOW_AFTER_ATTEMPTS = 2;

/**
 * Polls the backend health endpoint until it responds, absorbing the Render
 * free-tier cold start (which can take up to ~60s on the first request).
 */
@Injectable({ providedIn: "root" })
export class HealthService {
  private readonly api = inject(ApiService);

  private readonly _state = signal<HealthState>("checking");
  readonly state = this._state.asReadonly();

  private started = false;
  private attempts = 0;

  check(): void {
    if (this.started) return;
    this.started = true;
    this.attempt();
  }

  private attempt(): void {
    this.attempts++;
    this.api
      .get<{ status: string }>("/health/")
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        catchError(() => of(null))
      )
      .subscribe((result) => {
        if (result) {
          this._state.set("healthy");
          return;
        }
        this._state.set(this.attempts >= SLOW_AFTER_ATTEMPTS ? "slow" : "checking");
        timer(RETRY_DELAY_MS).subscribe(() => this.attempt());
      });
  }
}

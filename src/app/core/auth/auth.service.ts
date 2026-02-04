import { Injectable, signal, computed, inject, DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";
import { Observable, tap, switchMap } from "rxjs";
import { ApiService } from "../api/api.service";
import {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "./auth.models";

const ACCESS_TOKEN_KEY = "smartkart_access_token";
const REFRESH_TOKEN_KEY = "smartkart_refresh_token";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _user = signal<User | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _isInitialized = signal(false);

  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isBuyer = computed(() => this._user()?.role === "BUYER");
  readonly isSeller = computed(() => this._user()?.role === "SELLER");
  readonly userRole = computed(() => this._user()?.role ?? null);

  constructor() {
    this.initializeAuthState();
  }

  /** Authenticates user and returns their profile */
  login(credentials: LoginRequest): Observable<User> {
    this._isLoading.set(true);

    return this.api.post<LoginResponse>("/auth/login/", credentials).pipe(
      tap((response) => this.setTokens(response.access, response.refresh)),
      switchMap(() => this.api.get<User>("/users/me/")),
      tap({
        next: (user) => {
          this._user.set(user);
          this._isLoading.set(false);
          this._isInitialized.set(true);
        },
        error: () => this._isLoading.set(false),
      })
    );
  }

  /** Creates account and returns the new user profile */
  register(data: RegisterRequest): Observable<User> {
    this._isLoading.set(true);

    return this.api.post<RegisterResponse>("/auth/register/", data).pipe(
      tap((response) => this.setTokens(response.tokens.access, response.tokens.refresh)),
      switchMap(() => this.api.get<User>("/users/me/")),
      tap({
        next: (user) => {
          this._user.set(user);
          this._isLoading.set(false);
          this._isInitialized.set(true);
        },
        error: () => this._isLoading.set(false),
      })
    );
  }

  /** Clears session and redirects to login */
  logout(): void {
    this.clearTokens();
    this._user.set(null);
    this.router.navigate(["/login"]);
  }

  /** Refreshes the access token using stored refresh token */
  refreshToken(): Observable<{ access: string }> {
    const refreshToken = this.getRefreshToken();

    return this.api
      .post<{ access: string }>("/auth/refresh/", { refresh: refreshToken })
      .pipe(tap((response) => this.setAccessToken(response.access)));
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  hasValidToken(): boolean {
    return !!this.getAccessToken();
  }

  private initializeAuthState(): void {
    if (this.hasValidToken()) {
      this.loadCurrentUser();
    } else {
      this._isInitialized.set(true);
    }
  }

  private loadCurrentUser(): void {
    this._isLoading.set(true);

    this.api
      .get<User>("/users/me/")
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this._user.set(user);
          this._isLoading.set(false);
          this._isInitialized.set(true);
        },
        error: () => {
          this.clearTokens();
          this._user.set(null);
          this._isLoading.set(false);
          this._isInitialized.set(true);
        },
      });
  }

  private setTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }

  private setAccessToken(access: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
  }

  private clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

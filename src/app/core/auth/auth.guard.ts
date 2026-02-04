import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { toObservable } from "@angular/core/rxjs-interop";
import { filter, map, take } from "rxjs";
import { AuthService } from "./auth.service";

/** Redirects authenticated users away from login/register pages */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.hasValidToken()) {
    return true;
  }

  return toObservable(authService.isInitialized).pipe(
    filter(Boolean),
    take(1),
    map(() => {
      if (authService.isAdmin()) {
        router.navigate(["/admin"]);
      } else if (authService.isSeller()) {
        router.navigate(["/seller"]);
      } else {
        router.navigate(["/"]);
      }
      return false;
    })
  );
};

/** Restricts access to buyers only */
export const buyerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.hasValidToken()) {
    router.navigate(["/login"]);
    return false;
  }

  return toObservable(authService.isInitialized).pipe(
    filter(Boolean),
    take(1),
    map(() => {
      if (authService.isBuyer()) {
        return true;
      }
      router.navigate(["/"]);
      return false;
    })
  );
};

/** Restricts access to sellers only */
export const sellerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.hasValidToken()) {
    router.navigate(["/login"]);
    return false;
  }

  return toObservable(authService.isInitialized).pipe(
    filter(Boolean),
    take(1),
    map(() => {
      if (authService.isSeller()) {
        return true;
      }
      router.navigate(["/"]);
      return false;
    })
  );
};

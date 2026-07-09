import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
  HttpContextToken,
} from "@angular/common/http";
import { inject } from "@angular/core";
import {
  catchError,
  throwError,
  switchMap,
  filter,
  take,
  race,
  BehaviorSubject,
  Subject,
  Observable,
} from "rxjs";
import { AuthService } from "./auth.service";
import { environment } from "../../../environments/environment";

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);
const refreshFailed$ = new Subject<void>();

/** Marks a request as already retried once after a token refresh, to cap retries at one. */
const IS_RETRY = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();

  let authReq = req;
  if (accessToken && req.url.startsWith(environment.apiUrl)) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const isAuthEndpoint =
          req.url.includes("/auth/login") ||
          req.url.includes("/auth/register") ||
          req.url.includes("/auth/refresh");

        if (!isAuthEndpoint) {
          return handle401Error(req, next, authService);
        }
      }

      return throwError(() => error);
    })
  );
};

function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<any> {
  // Already retried once after a refresh - don't loop, fail out.
  if (req.context.get(IS_RETRY)) {
    authService.logout();
    return throwError(() => new Error("Session expired"));
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.access);
        return next(
          req.clone({
            setHeaders: { Authorization: `Bearer ${response.access}` },
            context: req.context.set(IS_RETRY, true),
          })
        );
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        refreshFailed$.next();
        authService.logout();
        return throwError(() => err);
      })
    );
  }

  return race(
    refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) =>
        next(
          req.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
            context: req.context.set(IS_RETRY, true),
          })
        )
      )
    ),
    refreshFailed$.pipe(
      switchMap(() => throwError(() => new Error("Session expired")))
    )
  );
}

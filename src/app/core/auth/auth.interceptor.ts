import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from "@angular/common/http";
import { inject } from "@angular/core";
import {
  catchError,
  throwError,
  switchMap,
  filter,
  take,
  BehaviorSubject,
  Observable,
} from "rxjs";
import { AuthService } from "./auth.service";
import { environment } from "../../../environments/environment";

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

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
          })
        );
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        authService.logout();
        return throwError(() => err);
      })
    );
  }

  return refreshTokenSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((token) =>
      next(
        req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      )
    )
  );
}

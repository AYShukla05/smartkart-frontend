import { TestBed } from "@angular/core/testing";
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from "@angular/common/http";
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing";
import { of, Subject } from "rxjs";
import { authInterceptor } from "./auth.interceptor";
import { AuthService } from "./auth.service";

const API = "http://localhost:8000/api";

describe("authInterceptor", () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  const mockAuthService = {
    getAccessToken: jasmine.createSpy("getAccessToken").and.returnValue("test-token"),
    getRefreshToken: jasmine.createSpy("getRefreshToken").and.returnValue("r-token"),
    refreshToken: jasmine
      .createSpy("refreshToken")
      .and.returnValue(of({ access: "new-token" })),
    logout: jasmine.createSpy("logout"),
    hasValidToken: jasmine.createSpy("hasValidToken").and.returnValue(true),
  };

  beforeEach(() => {
    mockAuthService.getAccessToken.and.returnValue("test-token");
    mockAuthService.refreshToken.and.returnValue(of({ access: "new-token" }));
    mockAuthService.refreshToken.calls.reset();
    mockAuthService.logout.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should add Authorization header to API requests", () => {
    httpClient.get(`${API}/products/`).subscribe();
    const req = httpMock.expectOne(`${API}/products/`);
    expect(req.request.headers.get("Authorization")).toBe("Bearer test-token");
    req.flush([]);
  });

  it("should not add token for non-API URLs", () => {
    httpClient.get("https://s3.amazonaws.com/bucket/img.jpg").subscribe();
    const req = httpMock.expectOne("https://s3.amazonaws.com/bucket/img.jpg");
    expect(req.request.headers.has("Authorization")).toBeFalse();
    req.flush("");
  });

  it("should refresh token on 401 and retry", () => {
    let result: unknown;
    httpClient.get(`${API}/products/`).subscribe((res) => (result = res));

    httpMock
      .expectOne(`${API}/products/`)
      .flush(null, { status: 401, statusText: "Unauthorized" });

    const retry = httpMock.expectOne(`${API}/products/`);
    expect(retry.request.headers.get("Authorization")).toBe("Bearer new-token");
    retry.flush({ data: "ok" });

    expect(result).toEqual({ data: "ok" });
    expect(mockAuthService.refreshToken).toHaveBeenCalled();
  });

  it("should queue concurrent 401s behind a single refresh call and retry all with the new token", () => {
    // Use a controllable Subject instead of `of(...)` so the refresh call
    // stays pending until we complete it, letting us simulate a second 401
    // arriving while the first refresh is genuinely still in flight.
    const refreshSubject = new Subject<{ access: string }>();
    mockAuthService.refreshToken.and.returnValue(refreshSubject.asObservable());

    let result1: unknown;
    let result2: unknown;
    httpClient.get(`${API}/products/`).subscribe((res) => (result1 = res));
    httpClient.get(`${API}/orders/`).subscribe((res) => (result2 = res));

    const req1 = httpMock.expectOne(`${API}/products/`);
    const req2 = httpMock.expectOne(`${API}/orders/`);

    // First 401 kicks off the (still-pending) refresh call.
    req1.flush(null, { status: 401, statusText: "Unauthorized" });
    // Second 401 arrives while the refresh is still in flight -> must queue,
    // not trigger a second refresh call.
    req2.flush(null, { status: 401, statusText: "Unauthorized" });

    expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);

    // Complete the refresh.
    refreshSubject.next({ access: "new-token" });
    refreshSubject.complete();

    expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);

    const retry1 = httpMock.expectOne(`${API}/products/`);
    const retry2 = httpMock.expectOne(`${API}/orders/`);
    expect(retry1.request.headers.get("Authorization")).toBe("Bearer new-token");
    expect(retry2.request.headers.get("Authorization")).toBe("Bearer new-token");

    retry1.flush({ data: "p" });
    retry2.flush({ data: "o" });

    expect(result1).toEqual({ data: "p" });
    expect(result2).toEqual({ data: "o" });
  });

  it("should error out all queued requests when the refresh call itself fails, instead of hanging", () => {
    const refreshSubject = new Subject<{ access: string }>();
    mockAuthService.refreshToken.and.returnValue(refreshSubject.asObservable());

    let error1: unknown;
    let error2: unknown;
    httpClient.get(`${API}/products/`).subscribe({
      next: () => fail("should not succeed"),
      error: (err) => (error1 = err),
    });
    httpClient.get(`${API}/orders/`).subscribe({
      next: () => fail("should not succeed"),
      error: (err) => (error2 = err),
    });

    const req1 = httpMock.expectOne(`${API}/products/`);
    const req2 = httpMock.expectOne(`${API}/orders/`);

    req1.flush(null, { status: 401, statusText: "Unauthorized" });
    // Queues behind the in-flight refresh.
    req2.flush(null, { status: 401, statusText: "Unauthorized" });

    // The refresh call itself fails.
    refreshSubject.error(new Error("refresh failed"));

    // Regression check for the hang: both the request that triggered the
    // refresh AND the queued request must error out, not hang forever.
    expect(error1).toBeTruthy();
    expect(error2).toBeTruthy();
    expect(mockAuthService.logout).toHaveBeenCalled();

    // Nothing should be left pending (i.e. queued requests aren't retried).
    httpMock.expectNone(`${API}/products/`);
    httpMock.expectNone(`${API}/orders/`);
  });
});

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
import { of } from "rxjs";
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
});

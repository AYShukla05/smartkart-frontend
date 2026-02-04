import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing";
import { provideRouter, Router } from "@angular/router";
import { AuthService } from "./auth.service";

const API = "http://localhost:8000/api";

describe("AuthService", () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser = {
    id: 1,
    email: "test@test.com",
    role: "BUYER" as const,
    is_active: true,
    is_staff: false,
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it("should login and set user signal", () => {
    service
      .login({ email: "test@test.com", password: "pass123" })
      .subscribe();

    httpMock
      .expectOne(`${API}/auth/login/`)
      .flush({ access: "a-token", refresh: "r-token" });
    httpMock.expectOne(`${API}/users/me/`).flush(mockUser);

    expect(service.user()).toEqual(mockUser);
    expect(service.isAuthenticated()).toBeTrue();
    expect(localStorage.getItem("smartkart_access_token")).toBe("a-token");
  });

  it("should register and set user signal", () => {
    service
      .register({ email: "new@test.com", password: "pass123", role: "BUYER" })
      .subscribe();

    httpMock.expectOne(`${API}/auth/register/`).flush({
      user: { email: "new@test.com", role: "BUYER" },
      tokens: { access: "a-token", refresh: "r-token" },
    });
    httpMock.expectOne(`${API}/users/me/`).flush(mockUser);

    expect(service.user()).toEqual(mockUser);
    expect(localStorage.getItem("smartkart_refresh_token")).toBe("r-token");
  });

  it("should clear state on logout", () => {
    service
      .login({ email: "test@test.com", password: "pass123" })
      .subscribe();
    httpMock
      .expectOne(`${API}/auth/login/`)
      .flush({ access: "a-token", refresh: "r-token" });
    httpMock.expectOne(`${API}/users/me/`).flush(mockUser);

    spyOn(TestBed.inject(Router), "navigate");
    service.logout();

    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem("smartkart_access_token")).toBeNull();
  });

  it("should compute role signals correctly", () => {
    service
      .login({ email: "test@test.com", password: "pass123" })
      .subscribe();
    httpMock
      .expectOne(`${API}/auth/login/`)
      .flush({ access: "a-token", refresh: "r-token" });
    httpMock.expectOne(`${API}/users/me/`).flush(mockUser);

    expect(service.isBuyer()).toBeTrue();
    expect(service.isSeller()).toBeFalse();
    expect(service.isAdmin()).toBeFalse();
  });

  it("should refresh and update stored access token", () => {
    localStorage.setItem("smartkart_refresh_token", "old-refresh");

    service.refreshToken().subscribe();
    httpMock
      .expectOne(`${API}/auth/refresh/`)
      .flush({ access: "new-access" });

    expect(localStorage.getItem("smartkart_access_token")).toBe("new-access");
  });
});

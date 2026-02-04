import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { signal, computed } from "@angular/core";
import { Observable } from "rxjs";
import { guestGuard, buyerGuard, sellerGuard, adminGuard } from "./auth.guard";
import { AuthService } from "./auth.service";

describe("Auth Guards", () => {
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuth: {
    hasValidToken: jasmine.Spy;
    isInitialized: ReturnType<typeof signal<boolean>>;
    isAdmin: ReturnType<typeof computed<boolean>>;
    isSeller: ReturnType<typeof computed<boolean>>;
    isBuyer: ReturnType<typeof computed<boolean>>;
  };

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj("Router", ["navigate"]);
    mockAuth = {
      hasValidToken: jasmine.createSpy("hasValidToken"),
      isInitialized: signal(true),
      isAdmin: computed(() => false),
      isSeller: computed(() => false),
      isBuyer: computed(() => false),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuth },
      ],
    });
  });

  describe("guestGuard", () => {
    it("should allow access when no token exists", () => {
      mockAuth.hasValidToken.and.returnValue(false);
      const result = TestBed.runInInjectionContext(() =>
        guestGuard(dummyRoute, dummyState)
      );
      expect(result).toBeTrue();
    });

    it("should redirect authenticated buyer to home", fakeAsync(() => {
      mockAuth.hasValidToken.and.returnValue(true);
      mockAuth.isBuyer = computed(() => true);
      // Re-configure to pick up new mock
      TestBed.overrideProvider(AuthService, { useValue: mockAuth });

      const result$ = TestBed.runInInjectionContext(() =>
        guestGuard(dummyRoute, dummyState)
      );

      let emitted: boolean | undefined;
      (result$ as Observable<boolean>).subscribe((v) => (emitted = v));
      tick();

      expect(emitted).toBeFalse();
      expect(mockRouter.navigate).toHaveBeenCalledWith(["/"]);
    }));
  });

  describe("buyerGuard", () => {
    it("should redirect to login when no token", () => {
      mockAuth.hasValidToken.and.returnValue(false);
      const result = TestBed.runInInjectionContext(() =>
        buyerGuard(dummyRoute, dummyState)
      );
      expect(result).toBeFalse();
      expect(mockRouter.navigate).toHaveBeenCalledWith(["/login"]);
    });

    it("should allow buyer access", fakeAsync(() => {
      mockAuth.hasValidToken.and.returnValue(true);
      mockAuth.isBuyer = computed(() => true);
      TestBed.overrideProvider(AuthService, { useValue: mockAuth });

      const result$ = TestBed.runInInjectionContext(() =>
        buyerGuard(dummyRoute, dummyState)
      );

      let emitted: boolean | undefined;
      (result$ as Observable<boolean>).subscribe((v) => (emitted = v));
      tick();

      expect(emitted).toBeTrue();
    }));
  });
});

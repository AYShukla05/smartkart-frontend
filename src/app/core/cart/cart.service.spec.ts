import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing";
import { CartService } from "./cart.service";
import { CartItem } from "./cart.models";

const API = "http://localhost:8000/api";

describe("CartService", () => {
  let service: CartService;
  let httpMock: HttpTestingController;

  const mockItems: CartItem[] = [
    { id: 1, product_id: 10, product_name: "Phone", price: 999, quantity: 2, thumbnail: null },
    { id: 2, product_id: 20, product_name: "Case", price: 49, quantity: 1, thumbnail: null },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);

    // Load initial cart
    service.loadCart();
    httpMock.expectOne(`${API}/cart/`).flush({ items: mockItems });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should compute itemCount and subtotal", () => {
    expect(service.itemCount()).toBe(3); // 2 + 1
    expect(service.subtotal()).toBe(999 * 2 + 49 * 1);
  });

  it("should optimistically update quantity before HTTP response", () => {
    service.updateQuantity(1, 10, 5).subscribe();

    // Signal already updated before HTTP flush
    expect(service.items().find((i) => i.id === 1)?.quantity).toBe(5);

    httpMock.expectOne(`${API}/cart/items/1/`).flush({ ...mockItems[0], quantity: 5 });
  });

  it("should optimistically remove item from signal", () => {
    service.removeItem(1).subscribe();

    // Item removed before HTTP flush
    expect(service.items().length).toBe(1);
    expect(service.items()[0].id).toBe(2);

    httpMock.expectOne(`${API}/cart/items/1/`).flush(null);
  });

  it("should restore prior state locally on update error, without refetching the cart", () => {
    service.updateQuantity(1, 10, 5).subscribe({ error: () => {} });

    // Optimistic update applied before the response
    expect(service.items().find((i) => i.id === 1)?.quantity).toBe(5);

    // Flush PATCH with error
    httpMock
      .expectOne(`${API}/cart/items/1/`)
      .flush(null, { status: 500, statusText: "Server Error" });

    // Recovery is a local snapshot restore - no GET /cart/ refetch is triggered
    httpMock.expectNone(`${API}/cart/`);

    // Items restored to original
    expect(service.items().find((i) => i.id === 1)?.quantity).toBe(2);
  });

  it("should restore prior state locally on remove error, without refetching the cart", () => {
    service.removeItem(1).subscribe({ error: () => {} });

    // Optimistic removal applied before the response
    expect(service.items().length).toBe(1);

    httpMock
      .expectOne(`${API}/cart/items/1/`)
      .flush(null, { status: 500, statusText: "Server Error" });

    // Recovery is a local snapshot restore - no GET /cart/ refetch is triggered
    httpMock.expectNone(`${API}/cart/`);

    expect(service.items().length).toBe(2);
    expect(service.items().find((i) => i.id === 1)?.quantity).toBe(2);
  });
});

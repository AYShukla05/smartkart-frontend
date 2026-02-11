import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing";
import { OrderService } from "./order.service";

const API = "http://localhost:8000/api";

describe("OrderService", () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should checkout and convert total_amount to number", () => {
    let result: { order_id: number; total_amount: number } | undefined;
    service.checkout().subscribe((res) => (result = res));

    httpMock
      .expectOne(`${API}/orders/checkout/`)
      .flush({ order_id: 42, total_amount: "1299.50" });

    expect(result!.total_amount).toBe(1299.5);
    expect(typeof result!.total_amount).toBe("number");
  });

  it("should convert nested prices in getOrderById", () => {
    let result: any;
    service.getOrderById(1).subscribe((res) => (result = res));

    httpMock.expectOne(`${API}/orders/1/`).flush({
      id: 1,
      status: "PLACED",
      total_amount: "2500.00",
      created_at: "2026-01-20T10:00:00Z",
      items: [
        { id: 1, product_name: "Phone", quantity: 1, price_at_purchase: "2500.00" },
      ],
    });

    expect(typeof result.total_amount).toBe("number");
    expect(typeof result.items[0].price_at_purchase).toBe("number");
    expect(result.items[0].price_at_purchase).toBe(2500);
  });

  it("should convert total_revenue in seller stats", () => {
    let result: any;
    service.getSellerStats().subscribe((res) => (result = res));

    httpMock.expectOne(`${API}/orders/seller/stats/`).flush({
      total_orders: 10,
      total_revenue: "45000.75",
      total_products: 5,
    });

    expect(result.total_revenue).toBe(45000.75);
    expect(typeof result.total_revenue).toBe("number");
  });
});

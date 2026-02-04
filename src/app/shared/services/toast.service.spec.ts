import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { ToastService } from "./toast.service";

describe("ToastService", () => {
  let service: ToastService;

  beforeEach(() => {
    service = TestBed.inject(ToastService);
  });

  it("should add a success toast", () => {
    service.success("Item added");
    const toasts = service.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe("Item added");
    expect(toasts[0].type).toBe("success");
  });

  it("should auto-dismiss after 4 seconds", fakeAsync(() => {
    service.success("Temporary");
    expect(service.toasts().length).toBe(1);
    tick(4000);
    expect(service.toasts().length).toBe(0);
  }));

  it("should dismiss a specific toast by id", () => {
    service.success("First");
    service.error("Second");
    const firstId = service.toasts()[0].id;
    service.dismiss(firstId);
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe("Second");
  });
});

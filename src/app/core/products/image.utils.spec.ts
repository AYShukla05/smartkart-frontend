import { isValidImageType, isValidFileSize, MAX_FILE_SIZE } from "./image.utils";

describe("Image Utils", () => {
  it("should accept jpeg and png, reject other types", () => {
    expect(
      isValidImageType(new File([""], "a.jpg", { type: "image/jpeg" }))
    ).toBeTrue();
    expect(
      isValidImageType(new File([""], "a.png", { type: "image/png" }))
    ).toBeTrue();
    expect(
      isValidImageType(new File([""], "a.gif", { type: "image/gif" }))
    ).toBeFalse();
    expect(
      isValidImageType(new File([""], "a.webp", { type: "image/webp" }))
    ).toBeFalse();
  });

  it("should accept files under 10MB and reject larger", () => {
    const small = new File(["x"], "s.jpg", { type: "image/jpeg" });
    Object.defineProperty(small, "size", { value: 5 * 1024 * 1024 });
    expect(isValidFileSize(small)).toBeTrue();

    const large = new File(["x"], "l.jpg", { type: "image/jpeg" });
    Object.defineProperty(large, "size", { value: 11 * 1024 * 1024 });
    expect(isValidFileSize(large)).toBeFalse();
  });

  it("should define MAX_FILE_SIZE as 10MB", () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });
});

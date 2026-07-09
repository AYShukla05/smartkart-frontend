import { isValidImageType, isValidFileSize, MAX_FILE_SIZE, convertToWebp } from "./image.utils";

// A minimal valid 1x1 pixel PNG, base64-encoded, used as a real decodable
// image fixture for exercising convertToWebp's Image/canvas pipeline.
const ONE_PX_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function base64ToFile(base64: string, filename: string, type: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type });
}

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

  describe("convertToWebp", () => {
    it("should convert a valid image into a webp blob", async () => {
      const file = base64ToFile(ONE_PX_PNG_BASE64, "pixel.png", "image/png");

      const blob = await convertToWebp(file);

      expect(blob.type).toBe("image/webp");
      expect(blob.size).toBeGreaterThan(0);
    });

    it("should reject when the source file fails to decode as an image", async () => {
      const badFile = new File(["not actually image bytes"], "bad.jpg", {
        type: "image/jpeg",
      });

      await expectAsync(convertToWebp(badFile)).toBeRejectedWithError(
        "Failed to load image"
      );
    });

    it("should reject when a 2d canvas context is unavailable", async () => {
      spyOn(HTMLCanvasElement.prototype, "getContext").and.returnValue(null);
      const file = base64ToFile(ONE_PX_PNG_BASE64, "pixel.png", "image/png");

      await expectAsync(convertToWebp(file)).toBeRejectedWithError(
        "Canvas context not available"
      );
    });

    it("should reject when canvas.toBlob yields no blob", async () => {
      spyOn(HTMLCanvasElement.prototype, "toBlob").and.callFake(function (
        this: HTMLCanvasElement,
        callback: BlobCallback
      ) {
        callback(null);
      });
      const file = base64ToFile(ONE_PX_PNG_BASE64, "pixel.png", "image/png");

      await expectAsync(convertToWebp(file)).toBeRejectedWithError(
        "WebP conversion failed"
      );
    });

    it("should reject when the browser silently falls back to a non-webp format", async () => {
      spyOn(HTMLCanvasElement.prototype, "toBlob").and.callFake(function (
        this: HTMLCanvasElement,
        callback: BlobCallback
      ) {
        callback(new Blob([], { type: "image/png" }));
      });
      const file = base64ToFile(ONE_PX_PNG_BASE64, "pixel.png", "image/png");

      await expectAsync(convertToWebp(file)).toBeRejectedWithError(
        "Your browser doesn't support WebP image export."
      );
    });
  });
});

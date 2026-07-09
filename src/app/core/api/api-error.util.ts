import { HttpErrorResponse } from "@angular/common/http";

/** Normalized shape every component can rely on instead of hand-parsing error bodies. */
export interface ApiError {
  message: string;
  fieldErrors?: Record<string, string[]>;
}

const GENERIC_MESSAGE = "Something went wrong. Please try again.";
const NETWORK_MESSAGE =
  "Couldn't reach the server. Please check your connection and try again.";

/**
 * Normalizes HTTP error responses - primarily Django REST Framework's error
 * shapes - into a consistent `{ message, fieldErrors? }` result.
 *
 * Handles:
 * - DRF's `{ detail: "..." }` shape
 * - DRF's field-validation-error shape: `{ field_name: ["msg1", "msg2"], ... }`
 * - A plain string error body
 * - Network failures / unparseable bodies (status 0, no body)
 * - Anything else, via a generic fallback message
 */
export function normalizeApiError(err: unknown): ApiError {
  if (!(err instanceof HttpErrorResponse)) {
    return { message: GENERIC_MESSAGE };
  }

  // Network failure, CORS error, timeout, offline, etc. - no usable body.
  if (err.status === 0 || err.error === null || err.error === undefined) {
    return { message: NETWORK_MESSAGE };
  }

  const body: unknown = err.error;

  if (typeof body === "string") {
    return { message: body || GENERIC_MESSAGE };
  }

  if (typeof body === "object") {
    const record = body as Record<string, unknown>;

    // DRF's {"detail": "..."} shape
    if (typeof record["detail"] === "string") {
      return { message: record["detail"] as string };
    }

    // DRF field-validation-error shape: { field: [msg1, msg2], ... }
    const fieldErrors: Record<string, string[]> = {};
    for (const key of Object.keys(record)) {
      const value = record[key];
      if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
        fieldErrors[key] = value as string[];
      }
    }

    const firstKey = Object.keys(fieldErrors)[0];
    if (firstKey) {
      return {
        message: fieldErrors[firstKey][0] ?? GENERIC_MESSAGE,
        fieldErrors,
      };
    }
  }

  return { message: GENERIC_MESSAGE };
}

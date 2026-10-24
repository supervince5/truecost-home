import "server-only";

export const errors = {
  INVALID_INPUT: [400, "Provide supported property evidence in the documented format."],
  INVALID_IMAGE: [400, "An image is invalid, unsupported, or exceeds the image limits."],
  TOO_LARGE: [413, "The request exceeds the upload limit."],
  UNSUPPORTED_MEDIA: [415, "Use application/json for this endpoint."],
  FORBIDDEN: [403, "This request origin is not allowed."],
  RATE_LIMITED: [429, "The demo is busy. Wait a minute and try again."],
  NOT_CONFIGURED: [503, "Gemma is not configured on this server."],
  DISABLED: [503, "Analysis is disabled for this deployment."],
  TIMEOUT: [504, "Analysis timed out. Try fewer or smaller inputs."],
  CANCELLED: [408, "Analysis was cancelled."],
  PROVIDER_ERROR: [502, "The model provider could not complete the request."],
  PROVIDER_UNAVAILABLE: [503, "The model provider is temporarily unavailable. Try again later."],
  INVALID_MODEL_OUTPUT: [502, "The model response could not be verified. No findings were accepted."],
  MODEL_MISMATCH: [502, "The provider returned an unexpected model."],
} as const;
export class AnalysisError extends Error {
  constructor(public readonly code: keyof typeof errors) { super(errors[code][1]); }
  get status() { return errors[this.code][0]; }
}

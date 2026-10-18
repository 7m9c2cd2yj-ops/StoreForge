export type AIErrorCode =
  | "not_configured"
  | "rate_limited"
  | "timeout"
  | "refused"
  | "truncated"
  | "invalid_output"
  | "provider_error";

/** Messages are safe to show to users: they never include provider details or secrets. */
const USER_MESSAGES: Record<AIErrorCode, string> = {
  not_configured: "AI generation is not configured on this server. Add ANTHROPIC_API_KEY to enable it.",
  rate_limited: "The AI provider is busy right now. Please try again in a minute.",
  timeout: "The AI took too long to respond. Please try again.",
  refused: "The AI declined this request. Try rephrasing your business description.",
  truncated: "The AI response was incomplete. Try requesting fewer products and generate again.",
  invalid_output: "The AI returned a response we couldn't validate. Please try again.",
  provider_error: "The AI provider returned an error. Please try again shortly.",
};

export class AIError extends Error {
  readonly code: AIErrorCode;
  /** Whether credits reserved for this request should be refunded. */
  readonly refundable: boolean;

  constructor(code: AIErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "AIError";
    this.code = code;
    this.refundable = true;
  }

  get userMessage(): string {
    return USER_MESSAGES[this.code];
  }
}

export function aiErrorStatus(code: AIErrorCode): number {
  switch (code) {
    case "not_configured":
      return 503;
    case "rate_limited":
      return 503;
    case "timeout":
      return 504;
    case "refused":
      return 422;
    default:
      return 502;
  }
}

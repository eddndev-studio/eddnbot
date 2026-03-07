export { createEmailClient } from "./client";
export { verifyEmailTemplate, resetPasswordTemplate } from "./templates";
export type { TemplateContext } from "./templates";
export type {
  EmailClientConfig,
  EmailAdapter,
  SendEmailParams,
} from "./types";

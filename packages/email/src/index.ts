export { createEmailClient } from "./client";
export { verifyEmailTemplate, resetPasswordTemplate } from "./templates";
export type {
  EmailClientConfig,
  EmailAdapter,
  SendEmailParams,
  TemplateContext,
} from "./types";

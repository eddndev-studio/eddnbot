import { Resend } from "resend";
import type { EmailClientConfig, EmailAdapter, SendEmailParams } from "./types";

export function createEmailClient(config: EmailClientConfig): EmailAdapter {
  const resend = new Resend(config.apiKey);

  return {
    async send(params: SendEmailParams) {
      const { data, error } = await resend.emails.send({
        from: config.fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }

      return { messageId: data?.id ?? "" };
    },
  };
}

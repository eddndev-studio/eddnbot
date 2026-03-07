import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { EmailClientConfig, EmailAdapter, SendEmailParams } from "./types";

export function createEmailClient(config: EmailClientConfig): EmailAdapter {
  const ses = new SESClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async send(params: SendEmailParams) {
      const command = new SendEmailCommand({
        Source: config.fromAddress,
        Destination: { ToAddresses: [params.to] },
        Message: {
          Subject: { Data: params.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: params.html, Charset: "UTF-8" },
            ...(params.text
              ? { Text: { Data: params.text, Charset: "UTF-8" } }
              : {}),
          },
        },
      });

      const result = await ses.send(command);
      return { messageId: result.MessageId ?? "" };
    },
  };
}

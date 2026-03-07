export interface EmailClientConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  fromAddress: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailAdapter {
  send(params: SendEmailParams): Promise<{ messageId: string }>;
}

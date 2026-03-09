export interface TemplateContext {
  appName?: string;
  baseUrl: string;
}

export function verifyEmailTemplate(
  token: string,
  ctx: TemplateContext,
): { subject: string; html: string; text: string } {
  const appName = ctx.appName ?? "eddnbot";
  const verifyUrl = `${ctx.baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  return {
    subject: `Verify your ${appName} account`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111; margin-bottom: 16px;">Verify your email</h2>
        <p style="color: #444; line-height: 1.6;">Click the button below to verify your email address and activate your ${appName} account.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0;">Verify Email</a>
        <p style="color: #888; font-size: 14px; line-height: 1.5;">If the button doesn't work, copy and paste this link:<br/><a href="${verifyUrl}" style="color: #666;">${verifyUrl}</a></p>
        <p style="color: #888; font-size: 13px;">This link expires in 24 hours.</p>
      </div>
    `.trim(),
    text: `Verify your ${appName} account\n\nVisit this link to verify your email:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  };
}

export function invitationTemplate(
  token: string,
  ctx: TemplateContext & { tenantName: string; inviterName: string; role: string },
): { subject: string; html: string; text: string } {
  const appName = ctx.appName ?? "eddnbot";
  const acceptUrl = `${ctx.baseUrl}/accept-invitation?token=${encodeURIComponent(token)}`;

  return {
    subject: `You've been invited to join ${ctx.tenantName} on ${appName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111; margin-bottom: 16px;">You're invited!</h2>
        <p style="color: #444; line-height: 1.6;"><strong>${ctx.inviterName}</strong> has invited you to join <strong>${ctx.tenantName}</strong> as a <strong>${ctx.role}</strong> on ${appName}.</p>
        <a href="${acceptUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0;">Accept Invitation</a>
        <p style="color: #888; font-size: 14px; line-height: 1.5;">If the button doesn't work, copy and paste this link:<br/><a href="${acceptUrl}" style="color: #666;">${acceptUrl}</a></p>
        <p style="color: #888; font-size: 13px;">This link expires in 7 days.</p>
      </div>
    `.trim(),
    text: `You're invited to join ${ctx.tenantName} on ${appName}\n\n${ctx.inviterName} has invited you as a ${ctx.role}.\n\nAccept here: ${acceptUrl}\n\nThis link expires in 7 days.`,
  };
}

export function resetPasswordTemplate(
  token: string,
  ctx: TemplateContext,
): { subject: string; html: string; text: string } {
  const appName = ctx.appName ?? "eddnbot";
  const resetUrl = `${ctx.baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  return {
    subject: `Reset your ${appName} password`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111; margin-bottom: 16px;">Reset your password</h2>
        <p style="color: #444; line-height: 1.6;">We received a request to reset your ${appName} password. Click the button below to choose a new one.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0;">Reset Password</a>
        <p style="color: #888; font-size: 14px; line-height: 1.5;">If the button doesn't work, copy and paste this link:<br/><a href="${resetUrl}" style="color: #666;">${resetUrl}</a></p>
        <p style="color: #888; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `.trim(),
    text: `Reset your ${appName} password\n\nVisit this link to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  };
}

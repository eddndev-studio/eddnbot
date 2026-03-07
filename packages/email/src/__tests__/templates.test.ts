import { describe, it, expect } from "vitest";
import { verifyEmailTemplate, resetPasswordTemplate } from "../templates";

const ctx = { baseUrl: "https://app.eddnbot.com" };

describe("verifyEmailTemplate", () => {
  it("generates verify email with correct URL", () => {
    const result = verifyEmailTemplate("abc123", ctx);

    expect(result.subject).toContain("Verify");
    expect(result.html).toContain("https://app.eddnbot.com/verify-email?token=abc123");
    expect(result.text).toContain("https://app.eddnbot.com/verify-email?token=abc123");
  });

  it("encodes token in URL", () => {
    const result = verifyEmailTemplate("a+b/c=d", ctx);
    expect(result.html).toContain(encodeURIComponent("a+b/c=d"));
  });

  it("uses custom app name", () => {
    const result = verifyEmailTemplate("tok", { ...ctx, appName: "MyApp" });
    expect(result.subject).toContain("MyApp");
    expect(result.html).toContain("MyApp");
  });

  it("defaults app name to eddnbot", () => {
    const result = verifyEmailTemplate("tok", ctx);
    expect(result.subject).toContain("eddnbot");
  });

  it("includes expiry notice", () => {
    const result = verifyEmailTemplate("tok", ctx);
    expect(result.text).toContain("24 hours");
  });
});

describe("resetPasswordTemplate", () => {
  it("generates reset email with correct URL", () => {
    const result = resetPasswordTemplate("xyz789", ctx);

    expect(result.subject).toContain("Reset");
    expect(result.html).toContain("https://app.eddnbot.com/reset-password?token=xyz789");
    expect(result.text).toContain("https://app.eddnbot.com/reset-password?token=xyz789");
  });

  it("includes expiry notice", () => {
    const result = resetPasswordTemplate("tok", ctx);
    expect(result.text).toContain("1 hour");
  });

  it("includes safety note", () => {
    const result = resetPasswordTemplate("tok", ctx);
    expect(result.text).toContain("ignore this email");
  });
});

import { describe, it, expect } from "vitest";
import { hasScopes } from "../../lib/scopes";

describe("hasScopes", () => {
  it("returns true when no scopes are required", () => {
    expect(hasScopes([], [])).toBe(true);
    expect(hasScopes([], ["read", "write"])).toBe(true);
  });

  it("returns true when all required scopes are present", () => {
    expect(hasScopes(["read"], ["read", "write"])).toBe(true);
    expect(hasScopes(["read", "write"], ["read", "write"])).toBe(true);
  });

  it("returns false when a required scope is missing", () => {
    expect(hasScopes(["admin"], ["read", "write"])).toBe(false);
    expect(hasScopes(["read", "admin"], ["read", "write"])).toBe(false);
  });
});

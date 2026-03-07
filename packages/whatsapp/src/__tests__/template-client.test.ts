import { describe, it, expect, vi } from "vitest";
import { createTemplateClient } from "../template-client";
import { WhatsAppApiError } from "../errors";
import type { TemplateClientConfig } from "../template-types";

const config: TemplateClientConfig = {
  wabaId: "999888777",
  accessToken: "test-access-token",
};

function mockFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe("createTemplateClient", () => {
  it("uses wabaId in the base URL", async () => {
    const fetchFn = mockFetch(200, { data: [], paging: {} });
    const client = createTemplateClient(config, fetchFn);

    await client.listTemplates();

    expect(fetchFn).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/999888777/message_templates",
      expect.any(Object),
    );
  });

  it("uses custom api version", async () => {
    const fetchFn = mockFetch(200, { data: [], paging: {} });
    const client = createTemplateClient({ ...config, apiVersion: "v22.0" }, fetchFn);

    await client.listTemplates();

    expect(fetchFn).toHaveBeenCalledWith(
      "https://graph.facebook.com/v22.0/999888777/message_templates",
      expect.any(Object),
    );
  });
});

describe("listTemplates", () => {
  it("returns templates from Meta API", async () => {
    const templates = [
      { id: "1", name: "hello", language: "en_US", category: "MARKETING", status: "APPROVED", components: [] },
      { id: "2", name: "order", language: "es", category: "UTILITY", status: "PENDING", components: [] },
    ];
    const fetchFn = mockFetch(200, { data: templates, paging: {} });
    const client = createTemplateClient(config, fetchFn);

    const result = await client.listTemplates();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("hello");
    expect(result[1].name).toBe("order");
  });

  it("passes filter params as query string", async () => {
    const fetchFn = mockFetch(200, { data: [], paging: {} });
    const client = createTemplateClient(config, fetchFn);

    await client.listTemplates({ status: "APPROVED", category: "MARKETING" });

    const calledUrl = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("status=APPROVED");
    expect(calledUrl).toContain("category=MARKETING");
  });

  it("passes name filter", async () => {
    const fetchFn = mockFetch(200, { data: [], paging: {} });
    const client = createTemplateClient(config, fetchFn);

    await client.listTemplates({ name: "hello" });

    const calledUrl = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("name=hello");
  });

  it("follows pagination", async () => {
    const page1 = { data: [{ id: "1", name: "t1", language: "en", category: "MARKETING", status: "APPROVED", components: [] }], paging: { next: "https://graph.facebook.com/page2" } };
    const page2 = { data: [{ id: "2", name: "t2", language: "en", category: "UTILITY", status: "PENDING", components: [] }], paging: {} };

    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page1 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page2 });

    const client = createTemplateClient(config, fetchFn);
    const result = await client.listTemplates();

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("t1");
    expect(result[1].name).toBe("t2");
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe("https://graph.facebook.com/page2");
  });

  it("throws WhatsAppApiError on error response", async () => {
    const fetchFn = mockFetch(400, {
      error: { message: "Invalid parameter", code: 100 },
    });
    const client = createTemplateClient(config, fetchFn);

    await expect(client.listTemplates()).rejects.toThrow(WhatsAppApiError);
    await expect(client.listTemplates()).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 100,
    });
  });
});

describe("createTemplate", () => {
  it("sends POST with template data", async () => {
    const fetchFn = mockFetch(200, { id: "tmpl-1", status: "PENDING", category: "MARKETING" });
    const client = createTemplateClient(config, fetchFn);

    const result = await client.createTemplate({
      name: "order_confirm",
      language: "en_US",
      category: "UTILITY",
      components: [{ type: "BODY", text: "Your order {{1}} is confirmed." }],
    });

    expect(result.id).toBe("tmpl-1");
    expect(result.status).toBe("PENDING");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/999888777/message_templates",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "order_confirm",
          language: "en_US",
          category: "UTILITY",
          components: [{ type: "BODY", text: "Your order {{1}} is confirmed." }],
        }),
      }),
    );
  });

  it("throws WhatsAppApiError on error", async () => {
    const fetchFn = mockFetch(400, {
      error: { message: "Template name invalid", code: 100 },
    });
    const client = createTemplateClient(config, fetchFn);

    await expect(
      client.createTemplate({
        name: "BAD NAME",
        language: "en",
        category: "MARKETING",
        components: [{ type: "BODY", text: "Hi" }],
      }),
    ).rejects.toThrow(WhatsAppApiError);
  });
});

describe("deleteTemplate", () => {
  it("sends DELETE with name as query param", async () => {
    const fetchFn = mockFetch(200, { success: true });
    const client = createTemplateClient(config, fetchFn);

    await client.deleteTemplate("old_template");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/999888777/message_templates?name=old_template",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws WhatsAppApiError on error", async () => {
    const fetchFn = mockFetch(404, {
      error: { message: "Template not found", code: 100 },
    });
    const client = createTemplateClient(config, fetchFn);

    await expect(client.deleteTemplate("nonexistent")).rejects.toThrow(WhatsAppApiError);
  });

  it("encodes special characters in template name", async () => {
    const fetchFn = mockFetch(200, { success: true });
    const client = createTemplateClient(config, fetchFn);

    await client.deleteTemplate("hello world");

    const calledUrl = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("name=hello%20world");
  });
});

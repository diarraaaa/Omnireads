// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "../proxy";

type CookieOptions = {
  cookies: {
    getAll: () => unknown[];
    setAll: (cookies: { name: string; value: string; options: unknown }[]) => void;
  };
};

const getUserMock = vi.fn().mockResolvedValue({ data: { user: null } });
const createServerClientMock = vi.fn(
  (_url: string, _key: string, _options: CookieOptions) => ({
    auth: { getUser: getUserMock },
  })
);

vi.mock("@supabase/ssr", () => ({
  createServerClient: (url: string, key: string, options: CookieOptions) =>
    createServerClientMock(url, key, options),
}));

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips Supabase entirely when env vars are missing (Zero-Config Dev Mode)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const request = new NextRequest("http://localhost/dashboard");
    const response = await proxy(request);

    expect(createServerClientMock).not.toHaveBeenCalled();
    expect(getUserMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("refreshes the session via getUser when Supabase is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const request = new NextRequest("http://localhost/dashboard");
    const response = await proxy(request);

    expect(createServerClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      expect.objectContaining({ cookies: expect.any(Object) })
    );
    expect(getUserMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });

  it("writes any refreshed cookies from Supabase onto the response", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    createServerClientMock.mockImplementationOnce(
      (_url: string, _key: string, options: CookieOptions) => {
        options.cookies.setAll([
          { name: "sb-access-token", value: "refreshed-token", options: {} },
        ]);
        return { auth: { getUser: getUserMock } };
      }
    );

    const request = new NextRequest("http://localhost/dashboard");
    const response = await proxy(request);

    expect(response.cookies.get("sb-access-token")?.value).toBe(
      "refreshed-token"
    );
  });
});

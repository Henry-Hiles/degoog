import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  resolveRepoAssetPath,
  resolveScreenshotPath,
} from "../../src/server/extensions/store";

type Router = { request: (req: Request | string) => Response | Promise<Response> };

// Code-executing / destructive store + indexer routes must not be reachable on
// an instance with no password and no settings gate when the request does not
// come from loopback. router.request() carries no socket peer, so isLoopback is
// false here — exactly the "exposed default install" case.
const PRIVILEGED: Array<{ method: "POST" | "DELETE"; path: string; routerKey: "store" }> = [
  { method: "POST", path: "/api/store/repos", routerKey: "store" },
  { method: "POST", path: "/api/store/install", routerKey: "store" },
  { method: "POST", path: "/api/store/uninstall", routerKey: "store" },
  { method: "POST", path: "/api/store/repos/refresh", routerKey: "store" },
  { method: "DELETE", path: "/api/store/repos", routerKey: "store" },
];

let routers: Record<string, Router>;
const saved: Record<string, string | undefined> = {};

beforeAll(async () => {
  for (const k of ["DEGOOG_PUBLIC_INSTANCE", "DEGOOG_SETTINGS_PASSWORDS"]) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  const [storeMod] = await Promise.all([
    import("../../src/server/routes/store"),
  ]);
  routers = { store: storeMod.default };
});

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("privileged actions are refused from non-loopback with no auth configured", () => {
  for (const { method, path, routerKey } of PRIVILEGED) {
    test(`${method} ${path} returns 401`, async () => {
      const req = new Request(`http://example.com${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const res = await routers[routerKey].request(req);
      expect(res.status).toBe(401);
    });
  }
});

describe("repo asset path resolution rejects repoSlug traversal", () => {
  test("traversing repoSlug yields null (asset route)", () => {
    expect(resolveRepoAssetPath("../../../../etc", "passwd.png")).toBeNull();
    expect(resolveRepoAssetPath("..", "logo.png")).toBeNull();
    expect(resolveRepoAssetPath("foo/bar", "logo.png")).toBeNull();
  });

  test("traversing repoSlug yields null (screenshot route)", () => {
    expect(resolveScreenshotPath("../../etc", "plugins/x", "a.png")).toBeNull();
  });
});

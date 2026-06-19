import type { Context } from "hono";
import { logger } from "./logger";

interface BunEnv {
  requestIP?: (req: Request) => { address: string } | null;
}

const _distrustProxy = (): boolean => {
  const v = process.env.DEGOOG_DISTRUST_PROXY;
  if (v === undefined) return true;
  return v !== "false" && v !== "0";
};

export function getClientIp(c: Context): string | undefined {
  if (!_distrustProxy()) {
    const forwarded = c.req.header("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    const realIp = c.req.header("x-real-ip");
    if (realIp) return realIp;
  }
  const env = c.env as BunEnv | undefined;
  return env?.requestIP?.(c.req.raw)?.address ?? undefined;
}

// Raw TCP peer address, never derived from client-supplied headers. Used for
// trust decisions (loopback gating) where a spoofable X-Forwarded-For must not
// be honoured even when DEGOOG_DISTRUST_PROXY is disabled.
export function getSocketIp(c: Context): string | undefined {
  const env = c.env as BunEnv | undefined;
  return env?.requestIP?.(c.req.raw)?.address ?? undefined;
}

// True only when the request arrives directly from the local machine. A
// reverse proxy on a separate host/container is not loopback, so remote
// deployments must configure a settings password or gate.
export function isLoopbackClient(c: Context): boolean {
  const ip = getSocketIp(c)?.replace(/^::ffff:/, "");
  return ip === "127.0.0.1" || ip === "::1";
}

export function isHttpsRequest(c: Context): boolean {
  if (!_distrustProxy()) {
    const proto = c.req.header("x-forwarded-proto");
    if (proto) return proto.split(",")[0].trim().toLowerCase() === "https";
  }
  try {
    return new URL(c.req.url).protocol === "https:";
  } catch (err) {
    logger.debug("request", "isHttpsRequest URL parse failed", err);
    return false;
  }
}

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const buckets = new Map<string, number[]>();

function pruneBucket(timestamps: number[], now: number, windowMs: number): number[] {
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

export function consumeRateLimit(
  namespace: string,
  identifier: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const key = `${namespace}:${identifier}`;
  const current = pruneBucket(buckets.get(key) ?? [], now, windowMs);

  if (current.length >= limit) {
    const oldestWithinWindow = current[0];
    const retryAfterMs = Math.max(0, windowMs - (now - oldestWithinWindow));
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  current.push(now);
  buckets.set(key, current);

  return { allowed: true, retryAfterSeconds: 0 };
}

export function getRequestIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    if (firstIp?.trim()) return firstIp.trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  const cloudflareIp = headers.get("cf-connecting-ip");
  if (cloudflareIp?.trim()) return cloudflareIp.trim();

  return "unknown";
}
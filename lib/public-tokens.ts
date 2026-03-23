import { createHmac, timingSafeEqual } from "crypto";

type PublicTokenPurpose = "status" | "unsubscribe";

type PublicTokenPayload = {
  candidateId: string;
  purpose: PublicTokenPurpose;
  issuedAt: number;
};

function getTokenSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required to generate public tokens");
  }
  return secret;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function createPublicToken(candidateId: string, purpose: PublicTokenPurpose): string {
  const payload: PublicTokenPayload = {
    candidateId,
    purpose,
    issuedAt: Date.now(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyPublicToken(token: string, purpose: PublicTokenPurpose): string | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<PublicTokenPayload>;

    if (
      typeof parsed.candidateId !== "string" ||
      typeof parsed.issuedAt !== "number" ||
      parsed.purpose !== purpose
    ) {
      return null;
    }

    return parsed.candidateId;
  } catch {
    return null;
  }
}

export function createStatusToken(candidateId: string): string {
  return createPublicToken(candidateId, "status");
}

export function createUnsubscribeToken(candidateId: string): string {
  return createPublicToken(candidateId, "unsubscribe");
}

export function verifyStatusToken(token: string): string | null {
  return verifyPublicToken(token, "status");
}

export function verifyUnsubscribeToken(token: string): string | null {
  return verifyPublicToken(token, "unsubscribe");
}
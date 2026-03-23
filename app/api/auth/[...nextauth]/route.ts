import { handlers } from "@/lib/auth";
import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_IP_LIMIT = 10;
const LOGIN_IDENTIFIER_LIMIT = 5;

export const GET = handlers.GET;

export async function POST(req: Request) {
	const url = new URL(req.url);
	if (!url.pathname.endsWith("/callback/credentials")) {
		return handlers.POST(req);
	}

	const ip = getRequestIp(req.headers);
	const ipLimit = consumeRateLimit("auth:ip", ip, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS);
	if (!ipLimit.allowed) {
		return Response.json(
			{ error: "Too many login attempts. Please try again later." },
			{ status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
		);
	}

	const contentType = req.headers.get("content-type") ?? "";
	let identifier = "unknown";

	if (
		contentType.includes("application/x-www-form-urlencoded") ||
		contentType.includes("multipart/form-data")
	) {
		const formData = await req.clone().formData();
		const email = formData.get("email");
		if (typeof email === "string" && email.trim()) {
			identifier = email.trim().toLowerCase();
		}
	}

	const identifierLimit = consumeRateLimit(
		"auth:identifier",
		identifier,
		LOGIN_IDENTIFIER_LIMIT,
		LOGIN_WINDOW_MS,
	);
	if (!identifierLimit.allowed) {
		return Response.json(
			{ error: "Too many login attempts for this account. Please try again later." },
			{ status: 429, headers: { "Retry-After": String(identifierLimit.retryAfterSeconds) } },
		);
	}

	return handlers.POST(req);
}

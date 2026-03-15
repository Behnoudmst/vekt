import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "vekt",
  // When INNGEST_BASE_URL is set (self-hosted Docker), point the SDK at it.
  // Falls back to Inngest Cloud if unset.
  baseUrl: process.env.INNGEST_BASE_URL,
});

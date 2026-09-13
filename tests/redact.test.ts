import assert from "node:assert/strict";
import test from "node:test";

import { redactIdentity } from "../lib/redact";

test("removes email, phone, URLs and the candidate's own name", () => {
  const cv = [
    "Jane Doe",
    "jane.doe@example.com | +47 912 34 567",
    "https://linkedin.com/in/janedoe",
    "Senior engineer. Jane led the payments team for four years.",
  ].join("\n");

  const { text, counts } = redactIdentity(cv, "Jane Doe");

  assert.ok(!text.includes("jane.doe@example.com"));
  assert.ok(!text.includes("linkedin.com/in/janedoe"));
  assert.ok(!/Jane/i.test(text), "given name should be redacted");
  assert.ok(!/Doe/i.test(text), "family name should be redacted");
  assert.equal(counts.email, 1);
  assert.ok((counts.name ?? 0) >= 2);
});

test("removes declared personal attributes", () => {
  const { text } = redactIdentity(
    "Nationality: Norwegian\nMarital status: married\nSkills: TypeScript",
  );

  assert.ok(!text.includes("Norwegian"));
  assert.ok(!text.includes("married"));
  assert.ok(text.includes("TypeScript"), "job-relevant content must survive");
});

test("leaves job-relevant content untouched", () => {
  const cv = "Built a Next.js platform handling 10k applications per month.";
  const { text, counts } = redactIdentity(cv, "Jane Doe");

  assert.equal(text, cv);
  assert.deepEqual(counts, {});
});

test("does not eat date ranges in work history", () => {
  const cv = "Senior Engineer, 2019 - 2023. Led a team of 8.";
  const { text } = redactIdentity(cv);

  assert.equal(text, cv, "employment dates must survive redaction");
});

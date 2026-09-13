import assert from "node:assert/strict";
import test from "node:test";

import { decideStatus, meetsThreshold } from "../lib/scoring";

test("at or above threshold is shortlisted", () => {
  assert.equal(meetsThreshold(75, 75), true);
  assert.equal(decideStatus(80, 75, false), "SHORTLISTED");
  assert.equal(decideStatus(80, 75, true), "SHORTLISTED");
});

test("below threshold needs human review by default", () => {
  assert.equal(decideStatus(40, 75, false), "NEEDS_REVIEW");
});

test("below threshold is only auto-rejected when the deployer opts in", () => {
  assert.equal(decideStatus(40, 75, true), "REJECTED");
});

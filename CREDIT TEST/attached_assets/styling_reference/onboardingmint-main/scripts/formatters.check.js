import assert from "node:assert/strict";
import { formatZar } from "../src/lib/formatCurrency.js";
import { formatRelativeTime } from "../src/lib/formatRelativeTime.js";

assert.equal(formatZar(24806.03), "R 24,806.03");
assert.equal(formatZar("nope"), "R 0.00");

const now = new Date();
assert.ok(formatRelativeTime(now).startsWith("Updated"));
assert.equal(formatRelativeTime(null), "");
assert.equal(formatRelativeTime(now, { isLoading: true }), "Updating...");

console.log("Formatter checks passed.");

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { recurringAppliesToMonth, remainingMonthsInYear } from "./recurring-period";

describe("fixed accounts apply only forward from the selected month", () => {
  const recurring = { active: true, start_year: 2026, start_month: 11 };
  test("never applies to earlier months or years", () => {
    assert.equal(recurringAppliesToMonth(recurring, 2026, 10), false);
    assert.equal(recurringAppliesToMonth(recurring, 2025, 12), false);
  });
  test("applies to the selected month and all later months, including later years", () => {
    assert.equal(recurringAppliesToMonth(recurring, 2026, 11), true);
    assert.equal(recurringAppliesToMonth(recurring, 2026, 12), true);
    assert.equal(recurringAppliesToMonth(recurring, 2027, 1), true);
  });
  test("eager creation only includes the selected month and the remainder of its year", () => {
    assert.deepEqual(remainingMonthsInYear(11), [11, 12]);
    assert.deepEqual(remainingMonthsInYear(12), [12]);
  });
});
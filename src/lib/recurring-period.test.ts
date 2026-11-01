import { describe, expect, test } from "bun:test";
import { recurringAppliesToMonth, remainingMonthsInYear } from "./recurring-period";

describe("fixed accounts apply only forward from the selected month", () => {
  const recurring = { active: true, start_year: 2026, start_month: 11 };
  test("never applies to earlier months or years", () => {
    expect(recurringAppliesToMonth(recurring, 2026, 10)).toBe(false);
    expect(recurringAppliesToMonth(recurring, 2025, 12)).toBe(false);
  });
  test("applies to the selected month and all later months, including later years", () => {
    expect(recurringAppliesToMonth(recurring, 2026, 11)).toBe(true);
    expect(recurringAppliesToMonth(recurring, 2026, 12)).toBe(true);
    expect(recurringAppliesToMonth(recurring, 2027, 1)).toBe(true);
  });
  test("eager creation only includes the selected month and the remainder of its year", () => {
    expect(remainingMonthsInYear(11)).toEqual([11, 12]);
    expect(remainingMonthsInYear(12)).toEqual([12]);
  });
});
import { test } from "node:test";
import assert from "node:assert/strict";
import { numericFormatter, removeNumericFormat } from "react-number-format";
import { moneyFormat } from "./money-input";

test("typing 100 retains the full reais amount, not one real", () => {
  assert.equal(numericFormatter("100", moneyFormat), "100");
});

test("one thousand uses a Brazilian thousands point", () => {
  assert.equal(numericFormatter("1000", moneyFormat), "1.000");
});

test("cents use a comma while the numeric value retains a decimal point", () => {
  assert.equal(numericFormatter("1000.50", moneyFormat), "1.000,50");
});

test("decimal keypad point preserves cents instead of concatenating digits", () => {
  const parsed = removeNumericFormat("1.151.", {
    from: { start: 5, end: 5 },
    to: { start: 5, end: 6 },
    lastValue: "1.151",
  }, moneyFormat);
  assert.equal(parsed, "1151.");
  assert.equal(numericFormatter(`${parsed}99`, moneyFormat), "1.151,99");
});

test("pasted Brazilian amount retains both the thousands point and decimal comma", () => {
  assert.equal(removeNumericFormat("1.151,99", undefined, moneyFormat), "1151.99");
});
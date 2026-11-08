import { test } from "node:test";
import assert from "node:assert/strict";
import { numericFormatter } from "react-number-format";
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
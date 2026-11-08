import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoneyValue, parseMoneyText, type MoneyState } from "../../lib/money-parse";

/** Simulates typing characters one by one at the end of the field. */
function type(seq: string): { display: string; value: string } {
  let state: MoneyState = { value: "", tentative: false };
  let display = "";
  for (const ch of seq) {
    state = parseMoneyText(display + ch, state.tentative);
    display = formatMoneyValue(state.value);
  }
  return { display, value: state.value };
}

test("typing 100 keeps one hundred reais", () => {
  assert.deepEqual(type("100"), { display: "100", value: "100" });
});

test("typing 1000 shows a thousands point", () => {
  assert.deepEqual(type("1000"), { display: "1.000", value: "1000" });
});

test("typing 1.152,99 with a thousands point keeps the cents", () => {
  assert.deepEqual(type("1.152,99"), { display: "1.152,99", value: "1152.99" });
});

test("typing 1152,99 with a comma keeps the cents", () => {
  assert.deepEqual(type("1152,99"), { display: "1.152,99", value: "1152.99" });
});

test("typing 1152.99 with the numpad point keeps the cents", () => {
  assert.deepEqual(type("1152.99"), { display: "1.152,99", value: "1152.99" });
});

test("typing 1.151,99 never becomes 115.199", () => {
  assert.equal(type("1.151,99").value, "1151.99");
});

test("pasted Brazilian amount keeps both separators", () => {
  assert.equal(parseMoneyText("1.151,99", false).value, "1151.99");
});

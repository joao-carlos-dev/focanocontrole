/**
 * Brazilian money typing parser.
 *
 * Display uses "." for thousands and "," for decimals. Users may type either
 * "." or "," (or the numpad decimal key) as the decimal mark, and may also type
 * "." as a thousands separator ("1.152,99"). A typed "." is first treated as a
 * tentative decimal mark; if a third decimal digit or a "," follows, it is
 * reinterpreted as a thousands separator.
 */
export type MoneyState = {
  /** Unformatted numeric string, e.g. "1152.99", "1152.", "" */
  value: string;
  /** True when the current decimal mark came from a typed "." */
  tentative: boolean;
};

const digits = (s: string) => s.replace(/\D/g, "");

const cleanInt = (s: string) => {
  const d = digits(s).replace(/^0+(?=\d)/, "");
  return d;
};

export function parseMoneyText(text: string, tentative: boolean): MoneyState {
  const t = text.replace(/[^\d.,]/g, "");
  if (!digits(t) && !/[.,]/.test(t)) return { value: "", tentative: false };

  const commaCount = (t.match(/,/g) || []).length;

  if (commaCount > 0) {
    const first = t.indexOf(",");
    let intPart = t.slice(0, first);
    let rest = t.slice(first + 1);
    let isTentative = tentative;

    if (commaCount > 1) {
      const second = rest.indexOf(",");
      if (isTentative) {
        // The earlier "." was a thousands separator; the new "," is the decimal.
        intPart = intPart + rest.slice(0, second);
        rest = rest.slice(second + 1);
        isTentative = false;
      } else {
        rest = rest.replace(/,/g, "");
      }
    }

    let dec = digits(rest);
    if (dec.length > 2) {
      if (isTentative) {
        // "1,152" came from typing "1.152": the dot was a thousands separator.
        return { value: cleanInt(intPart + dec), tentative: false };
      }
      dec = dec.slice(0, 2);
    }
    const int = cleanInt(intPart) || "0";
    return { value: `${int}.${dec}`, tentative: isTentative };
  }

  // No comma: decide whether the last "." is a decimal mark.
  if (t.endsWith(".")) {
    // Freshly typed "." at the end → tentative decimal.
    return { value: `${cleanInt(t) || "0"}.`, tentative: true };
  }
  const m = t.match(/^(.*)\.(\d{1,2})$/);
  if (m) {
    // Display never has a dot followed by 1-2 digits, so this is a decimal.
    return { value: `${cleanInt(m[1]) || "0"}.${m[2]}`, tentative: true };
  }
  return { value: cleanInt(t), tentative: false };
}

export function formatMoneyValue(value: string): string {
  if (!value) return "";
  const [int, dec] = value.split(".");
  const intFmt = (int || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec === undefined ? intFmt : `${intFmt},${dec}`;
}

/** Normalizes an external numeric value (e.g. "1152.5" or 1152.5) to a numeric string. */
export function normalizeExternal(value: string): string {
  if (!value) return "";
  const n = String(value).trim();
  if (!/^\d*(\.\d*)?$/.test(n)) return "";
  const [int, dec] = n.split(".");
  const i = (int || "0").replace(/^0+(?=\d)/, "");
  return dec === undefined ? i : `${i}.${dec.slice(0, 2)}`;
}

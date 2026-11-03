import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync("styles/tokens.css", "utf8");
function token(name: string) {
  const value = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i").exec(
    css,
  )?.[1];
  assert.ok(value, `token ${name}`);
  return value;
}
function luminance(hex: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function ratio(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
test("contraste estático: tokens de texto, marca, bordes de campos y foco cumplen sus umbrales", () => {
  for (const fg of ["text-main", "text-muted", "text-subtle"])
    for (const bg of ["bg-canvas", "bg-surface", "bg-subtle"])
      assert.ok(ratio(token(fg), token(bg)) >= 4.5, `${fg}/${bg}`);
  for (const bg of ["primary", "primary-hover", "secondary"])
    assert.ok(ratio("#ffffff", token(bg)) >= 4.5, `blanco/${bg}`);
  for (const bg of ["bg-canvas", "bg-surface"])
    assert.ok(ratio(token("border-strong"), token(bg)) >= 3, `borde/${bg}`);
  assert.ok(ratio("#0f766e", token("bg-canvas")) >= 3, "foco");
});

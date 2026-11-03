require("../tests/dom-setup.cjs");
// node:test registers and executes every test; tsx provides TS and path aliases.
const { readdirSync } = require("node:fs");
const { resolve } = require("node:path");
for (const directory of ["tests", "lib", "data/mock"]) {
  for (const file of readdirSync(resolve(directory)).sort()) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx"))
      require(resolve(directory, file));
  }
}

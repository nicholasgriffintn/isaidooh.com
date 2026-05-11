const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

const html = readFileSync("public/index.html", "utf8");
const css = readFileSync("public/styles.css", "utf8");
const js = readFileSync("public/app.js", "utf8");

test("public page loads external assets instead of inline styles and scripts", () => {
  assert.match(html, /<link rel="stylesheet" href="\/styles\.css" \/>/);
  assert.match(html, /<script src="\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /<style>/);
  assert.doesNotMatch(html, /<script>\s*const /);
});

test("rickroll payoff uses the intended prank video", () => {
  assert.match(js, /const RICKROLL_VIDEO_ID = "Eune-z_Zjww";/);
  assert.doesNotMatch(js, /dQw4w9WgXcQ/);
  assert.doesNotMatch(js, /embed\.music\.apple\.com/);
});

test("rickroll video keeps the vertical shorts frame", () => {
  assert.match(css, /aspect-ratio: 9\/16;/);
  assert.match(css, /max-height: 80vh;/);
});

test("puzzle starts from the solved board before shuffling", () => {
  assert.match(
    js,
    /state\.tiles = \[\.\.\.Array\.from\(\{ length: state\.gridSize \* state\.gridSize - 1 \}, \(_, i\) => i \+ 1\), 0\];/
  );
  assert.match(js, /state\.emptyIndex = state\.tiles\.length - 1;/);
  assert.match(js, /if \(isSolved\(\)\) shuffleTiles\(\);/);
});

test("visible counters reset when a new puzzle starts", () => {
  assert.match(js, /elements\.moveCount\.textContent = '0';/);
  assert.match(js, /elements\.timer\.textContent = '0s';/);
});

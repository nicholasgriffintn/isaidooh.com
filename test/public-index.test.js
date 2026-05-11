const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

const html = readFileSync("public/index.html", "utf8");

test("rickroll payoff uses the intended prank video", () => {
  assert.match(html, /const RICKROLL_VIDEO_ID = "Eune-z_Zjww";/);
  assert.doesNotMatch(html, /dQw4w9WgXcQ/);
  assert.doesNotMatch(html, /embed\.music\.apple\.com/);
});

test("rickroll video keeps the vertical shorts frame", () => {
  assert.match(html, /aspect-ratio: 9\/16;/);
  assert.match(html, /max-height: 80vh;/);
});

test("puzzle starts from the solved board before shuffling", () => {
  assert.match(
    html,
    /tiles = \[\.\.\.Array\.from\(\{ length: gridSize \* gridSize - 1 \}, \(_, i\) => i \+ 1\), 0\];/
  );
  assert.match(html, /emptyIndex = tiles\.length - 1;/);
  assert.match(html, /if \(isSolved\(\)\) shuffleTiles\(\);/);
});

test("visible counters reset when a new puzzle starts", () => {
  assert.match(html, /moveCountEl\.textContent = '0';/);
  assert.match(html, /timerEl\.textContent = '0s';/);
});

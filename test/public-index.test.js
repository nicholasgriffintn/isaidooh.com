const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

const html = readFileSync("public/index.html", "utf8");
const css = readFileSync("public/styles.css", "utf8");
const js = readFileSync("public/app.js", "utf8");
const worker = readFileSync("src/worker.js", "utf8");
const leaderboard = readFileSync("src/leaderboard.js", "utf8");
const migration = readFileSync("migrations/0001_create_leaderboard.sql", "utf8");

test("public page loads external assets instead of inline styles and scripts", () => {
  assert.match(html, /<link rel="stylesheet" href="\/styles\.css" \/>/);
  assert.match(html, /<script src="\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /<style>/);
  assert.doesNotMatch(html, /<script>\s*const /);
});

test("rickroll payoff uses the intended prank video", () => {
  assert.match(js, /const RICKROLL_VIDEO_ID = "Eune-z_Zjww";/);
  assert.match(js, /autoplay=1/);
  assert.match(js, /playsinline=1/);
  assert.doesNotMatch(js, /dQw4w9WgXcQ/);
  assert.doesNotMatch(js, /embed\.music\.apple\.com/);
});

test("rickroll video starts inside the user activation event", () => {
  assert.match(js, /triggerRickroll\(\);/);
  assert.doesNotMatch(js, /setTimeout\(triggerRickroll/);
});

test("page warms the YouTube player before the prank is triggered", () => {
  assert.match(html, /<link rel="preconnect" href="https:\/\/www\.youtube\.com" \/>/);
  assert.match(html, /<link rel="preconnect" href="https:\/\/i\.ytimg\.com" \/>/);
  assert.match(html, /<link rel="preconnect" href="https:\/\/s\.ytimg\.com" \/>/);
  assert.match(html, /<link rel="preload" as="image" href="https:\/\/i\.ytimg\.com\/vi\/Eune-z_Zjww\/hqdefault\.jpg" \/>/);
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

test("page renders a leaderboard backed by the API", () => {
  assert.match(html, /id="leaderboard-list"/);
  assert.match(html, /id="score-result"/);
  assert.match(js, /fetch\('\/api\/leaderboard'\)/);
  assert.match(js, /method: 'POST'/);
  assert.match(js, /replaceChildren/);
});

test("worker routes leaderboard requests before static assets", () => {
  assert.match(worker, /url\.pathname === "\/api\/leaderboard"/);
  assert.match(worker, /handleLeaderboardRequest\(request, env\)/);
  assert.match(worker, /env\.ASSETS\.fetch\(request\)/);
  assert.doesNotMatch(worker, /filePath/);
});

test("leaderboard validation and storage use bounded server-owned values", () => {
  assert.match(leaderboard, /VALID_GRID_SIZES = new Set\(\[3, 4\]\)/);
  assert.match(leaderboard, /Moves must be an integer from 1 to 1000/);
  assert.match(leaderboard, /Seconds must be an integer from 0 to 3600/);
  assert.match(leaderboard, /displayName: generateDisplayName\(\)/);
  assert.match(leaderboard, /score: calculateScore\(result\.value\)/);
});

test("leaderboard migration creates ranking constraints and index", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS leaderboard_entries/);
  assert.match(migration, /CHECK \(grid_size IN \(3, 4\)\)/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank/);
});

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

const html = readFileSync("public/index.html", "utf8");
const css = readFileSync("public/styles.css", "utf8");
const js = readFileSync("public/app.js", "utf8");
const karaoke = readFileSync("public/karaoke.js", "utf8");
const playerIdentity = readFileSync("public/player-identity.js", "utf8");
const worker = readFileSync("src/worker.js", "utf8");
const leaderboard = readFileSync("src/leaderboard.js", "utf8");
const migration = readFileSync("migrations/0001_create_leaderboard.sql", "utf8");
const playerMigration = readFileSync("migrations/0002_remember_leaderboard_players.sql", "utf8");

test("public page loads external assets instead of inline styles and scripts", () => {
  assert.match(html, /<link rel="stylesheet" href="\/styles\.css" \/>/);
  assert.match(html, /<script src="\/player-identity\.js" defer><\/script>/);
  assert.match(html, /<script src="\/karaoke\.js" defer><\/script>/);
  assert.match(html, /<script src="\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /<style>/);
  assert.doesNotMatch(html, /<script>\s*const /);
});

test("rickroll payoff uses the intended prank video", () => {
  assert.match(js, /const RICKROLL_VIDEO_ID = "Eune-z_Zjww";/);
  assert.match(js, /autoplay=1/);
  assert.match(js, /enablejsapi=1/);
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
  assert.match(css, /width: min\(100vw, 56\.25dvh\);/);
  assert.match(css, /height: 100dvh;/);
  assert.doesNotMatch(css, /max-height: 80vh;/);
});

test("rickroll payoff uses the app theme instead of a black surround", () => {
  assert.match(css, /#rickroll::before/);
  assert.match(css, /radial-gradient\(ellipse 58% 46% at 22% 18%, rgba\(229, 49, 112, 0\.22\)/);
  assert.doesNotMatch(css, /background: #000;/);
});

test("rickroll payoff renders synced karaoke lyrics", () => {
  assert.match(html, /id="karaoke-stage"/);
  assert.match(html, /id="karaoke-fill"/);
  assert.match(css, /\.karaoke-stage/);
  assert.match(css, /animation: lyricRise/);
  assert.match(css, /animation: lyricSwap/);
  assert.match(css, /animation: lyricPulse/);
  assert.doesNotMatch(html, /class="rickroll-text"/);
  assert.match(js, /window\.KaraokeLyrics\.start\(elements\.ytFrame\)/);
  assert.match(js, /window\.KaraokeLyrics\.stop\(\)/);
});

test("karaoke lyrics use YouTube time with a loop fallback", () => {
  assert.match(karaoke, /https:\/\/www\.youtube\.com\/iframe_api/);
  assert.match(karaoke, /getCurrentTime/);
  assert.match(karaoke, /FALLBACK_LOOP_SECONDS = 56\.18/);
  assert.match(karaoke, /findDisplayCue/);
  assert.match(karaoke, /--word-progress/);
  assert.match(karaoke, /text: 'I', start: 0\.259, end: 0\.359/);
  assert.match(karaoke, /text: 'start\?', start: 55\.219, end: 56\.18/);
  assert.match(karaoke, /I said ooh-ooh/);
  assert.match(karaoke, /Should we let this start\?/);
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
  assert.match(html, /id="player-name"/);
  assert.match(html, />Submit score<\/button>/);
  assert.doesNotMatch(html, /Scores save to this browser/);
  assert.match(js, /fetch\('\/api\/leaderboard'\)/);
  assert.match(js, /method: 'POST'/);
  assert.match(js, /playerId: player\.playerId/);
  assert.match(js, /displayName: player\.displayName/);
  assert.match(js, /replaceChildren/);
});

test("browser stores a stable player identity with an editable display name", () => {
  assert.match(playerIdentity, /STORAGE_KEY = 'isaidooh:player-identity'/);
  assert.match(playerIdentity, /NAME_PREFIXES = \[/);
  assert.match(playerIdentity, /NAME_NOUNS = \[/);
  assert.match(playerIdentity, /generateDisplayName/);
  assert.match(playerIdentity, /window\.crypto\.randomUUID/);
  assert.match(playerIdentity, /updateDisplayName/);
  assert.match(playerIdentity, /window\.PlayerIdentity/);
});

test("score submission is owned by the end-game name form", () => {
  const triggerRickrollBody = js.match(/function triggerRickroll\(\) \{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(triggerRickrollBody, /Enter your leaderboard name to submit your score/);
  assert.doesNotMatch(triggerRickrollBody, /submitScore/);
  assert.match(js, /elements\.playerForm\.addEventListener\('submit'/);
});

test("worker routes leaderboard requests before static assets", () => {
  assert.match(worker, /url\.pathname === "\/api\/leaderboard"/);
  assert.match(worker, /handleLeaderboardRequest\(request, env\)/);
  assert.match(worker, /env\.ASSETS\.fetch\(request\)/);
  assert.doesNotMatch(worker, /filePath/);
});

test("leaderboard validation and storage use bounded server-owned values", () => {
  assert.match(leaderboard, /VALID_GRID_SIZES = new Set\(\[3, 4\]\)/);
  assert.match(leaderboard, /PLAYER_ID_PATTERN/);
  assert.match(leaderboard, /Display name must be 2 to 32 characters/);
  assert.match(leaderboard, /Moves must be an integer from 1 to 1000/);
  assert.match(leaderboard, /Seconds must be an integer from 0 to 3600/);
  assert.match(leaderboard, /displayName: result\.value\.displayName/);
  assert.match(leaderboard, /score: calculateScore\(result\.value\)/);
});

test("leaderboard updates the same player only when the submitted score improves", () => {
  assert.match(leaderboard, /getPlayerEntry\(db, submittedEntry\.playerId\)/);
  assert.match(leaderboard, /isImprovedScore\(submittedEntry, existingEntry\)/);
  assert.match(leaderboard, /updatePlayerEntry\(db, entry\)/);
  assert.match(
    leaderboard,
    /updatePlayerDisplayName\(db, submittedEntry\.playerId, submittedEntry\.displayName\)/
  );
});

test("leaderboard migration creates ranking constraints and index", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS leaderboard_entries/);
  assert.match(migration, /CHECK \(grid_size IN \(3, 4\)\)/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank/);
  assert.match(playerMigration, /player_id TEXT NOT NULL UNIQUE/);
  assert.match(playerMigration, /'legacy-' \|\| id/);
  assert.match(playerMigration, /ALTER TABLE leaderboard_entries_next RENAME TO leaderboard_entries/);
});

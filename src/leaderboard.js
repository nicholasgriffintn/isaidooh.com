import { jsonResponse, readJsonRequest } from "./lib/http.js";

const LEADERBOARD_LIMIT = 10;
const VALID_GRID_SIZES = new Set([3, 4]);
const NAME_PREFIXES = [
  "Late-Lights",
  "Hang-Tough",
  "Wounded-Heart",
  "Crowded-Room",
  "Love-Burner",
  "No-Hesitation",
  "Ooh-Ooh",
  "Bright-Off",
];
const NAME_NOUNS = [
  "Slider",
  "Romantic",
  "Hesitator",
  "Tile Turner",
  "Puzzle Fool",
  "Heartbreaker",
  "Light Switcher",
  "Room Starer",
];

export async function handleLeaderboardRequest(request, env) {
  if (!env.DB) {
    return jsonResponse({ error: "Leaderboard database is not configured." }, { status: 503 });
  }

  if (request.method === "GET") {
    return jsonResponse({ entries: await getLeaderboard(env.DB) });
  }

  if (request.method === "POST") {
    return createLeaderboardEntry(request, env.DB);
  }

  return jsonResponse(
    { error: "Method not allowed." },
    {
      status: 405,
      headers: { allow: "GET, POST" },
    }
  );
}

async function createLeaderboardEntry(request, db) {
  const payload = await readJsonRequest(request);
  const result = parseLeaderboardPayload(payload);

  if (!result.ok) {
    return jsonResponse({ error: result.error }, { status: 400 });
  }

  const entry = {
    id: crypto.randomUUID(),
    displayName: generateDisplayName(),
    score: calculateScore(result.value),
    moves: result.value.moves,
    seconds: result.value.seconds,
    gridSize: result.value.gridSize,
    createdAt: new Date().toISOString(),
  };

  await db
    .prepare(
      `INSERT INTO leaderboard_entries
        (id, display_name, score, moves, seconds, grid_size, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      entry.id,
      entry.displayName,
      entry.score,
      entry.moves,
      entry.seconds,
      entry.gridSize,
      entry.createdAt
    )
    .run();

  return jsonResponse(
    {
      entry,
      entries: await getLeaderboard(db),
    },
    { status: 201 }
  );
}

async function getLeaderboard(db) {
  const { results } = await db
    .prepare(
      `SELECT
        id,
        display_name AS displayName,
        score,
        moves,
        seconds,
        grid_size AS gridSize,
        created_at AS createdAt
      FROM leaderboard_entries
      ORDER BY score DESC, moves ASC, seconds ASC, created_at ASC
      LIMIT ?`
    )
    .bind(LEADERBOARD_LIMIT)
    .all();

  return results ?? [];
}

function parseLeaderboardPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Expected a JSON object." };
  }

  const moves = parseInteger(payload.moves);
  const seconds = parseInteger(payload.seconds);
  const gridSize = parseInteger(payload.gridSize);

  if (!Number.isInteger(moves) || moves < 1 || moves > 1000) {
    return { ok: false, error: "Moves must be an integer from 1 to 1000." };
  }

  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 3600) {
    return { ok: false, error: "Seconds must be an integer from 0 to 3600." };
  }

  if (!VALID_GRID_SIZES.has(gridSize)) {
    return { ok: false, error: "Grid size must be 3 or 4." };
  }

  return {
    ok: true,
    value: {
      moves,
      seconds,
      gridSize,
    },
  };
}

function parseInteger(value) {
  if (!Number.isInteger(value)) return Number.NaN;
  return value;
}

function calculateScore({ moves, seconds, gridSize }) {
  const difficultyBonus = gridSize === 4 ? 9000 : 5000;
  const movePenalty = moves * 120;
  const timePenalty = seconds * 20;
  const quickHandsBonus = Math.max(0, 600 - seconds * 5);

  return Math.max(1, difficultyBonus + quickHandsBonus - movePenalty - timePenalty);
}

function generateDisplayName() {
  return `${randomItem(NAME_PREFIXES)} ${randomItem(NAME_NOUNS)}`;
}

function randomItem(items) {
  return items[randomIndex(items.length)];
}

function randomIndex(length) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
}

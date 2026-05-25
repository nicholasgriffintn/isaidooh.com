import { jsonResponse, readJsonRequest } from "./lib/http.js";
import { normalizeWhitespace } from "./lib/strings.js";

const LEADERBOARD_LIMIT = 10;
const VALID_GRID_SIZES = new Set([3, 4]);
const PLAYER_ID_PATTERN =
  /^player-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_DISPLAY_NAME_LENGTH = 2;
const MAX_DISPLAY_NAME_LENGTH = 32;

export async function handleLeaderboardRequest(request, env) {
  if (!env.DB) {
    return jsonResponse({ error: "Leaderboard database is not configured." }, { status: 503 });
  }

  if (request.method === "GET") {
    const playerId = parsePlayerId(new URL(request.url).searchParams.get("playerId"));

    return jsonResponse({
      entries: await getLeaderboard(env.DB),
      playerEntry: playerId ? await getPlayerEntry(env.DB, playerId) : null,
    });
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

  const submittedEntry = {
    id: crypto.randomUUID(),
    playerId: result.value.playerId,
    displayName: result.value.displayName,
    score: calculateScore(result.value),
    moves: result.value.moves,
    seconds: result.value.seconds,
    gridSize: result.value.gridSize,
    createdAt: new Date().toISOString(),
  };
  const existingEntry = await getPlayerEntry(db, submittedEntry.playerId);
  const improved = !existingEntry || isImprovedScore(submittedEntry, existingEntry);
  const entry = improved
    ? { ...submittedEntry, id: existingEntry?.id ?? submittedEntry.id }
    : { ...existingEntry, displayName: submittedEntry.displayName };

  if (!existingEntry) {
    await insertPlayerEntry(db, entry);
  } else if (improved) {
    await updatePlayerEntry(db, entry);
  } else if (existingEntry.displayName !== submittedEntry.displayName) {
    await updatePlayerDisplayName(db, submittedEntry.playerId, submittedEntry.displayName);
  }

  return jsonResponse(
    {
      entry,
      improved,
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

async function getPlayerEntry(db, playerId) {
  const result = await db
    .prepare(
      `SELECT
        id,
        player_id AS playerId,
        display_name AS displayName,
        score,
        moves,
        seconds,
        grid_size AS gridSize,
        created_at AS createdAt
      FROM leaderboard_entries
      WHERE player_id = ?`
    )
    .bind(playerId)
    .first();

  return result ?? null;
}

async function insertPlayerEntry(db, entry) {
  await db
    .prepare(
      `INSERT INTO leaderboard_entries
        (id, player_id, display_name, score, moves, seconds, grid_size, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      entry.id,
      entry.playerId,
      entry.displayName,
      entry.score,
      entry.moves,
      entry.seconds,
      entry.gridSize,
      entry.createdAt
    )
    .run();
}

async function updatePlayerEntry(db, entry) {
  await db
    .prepare(
      `UPDATE leaderboard_entries
      SET display_name = ?,
        score = ?,
        moves = ?,
        seconds = ?,
        grid_size = ?,
        created_at = ?
      WHERE player_id = ?`
    )
    .bind(
      entry.displayName,
      entry.score,
      entry.moves,
      entry.seconds,
      entry.gridSize,
      entry.createdAt,
      entry.playerId
    )
    .run();
}

async function updatePlayerDisplayName(db, playerId, displayName) {
  await db
    .prepare("UPDATE leaderboard_entries SET display_name = ? WHERE player_id = ?")
    .bind(displayName, playerId)
    .run();
}

function parseLeaderboardPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Expected a JSON object." };
  }

  const playerId = parsePlayerId(payload.playerId);
  const displayName = parseDisplayName(payload.displayName);
  const moves = parseInteger(payload.moves);
  const seconds = parseInteger(payload.seconds);
  const gridSize = parseInteger(payload.gridSize);

  if (!playerId) {
    return { ok: false, error: "Player ID is invalid." };
  }

  if (!displayName) {
    return { ok: false, error: "Display name must be 2 to 32 characters." };
  }

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
      playerId,
      displayName,
      moves,
      seconds,
      gridSize,
    },
  };
}

function parsePlayerId(value) {
  if (typeof value !== "string") return null;
  return PLAYER_ID_PATTERN.test(value) ? value.toLowerCase() : null;
}

function parseDisplayName(value) {
  if (typeof value !== "string") return null;

  const displayName = normalizeWhitespace(value);

  if (
    displayName.length < MIN_DISPLAY_NAME_LENGTH ||
    displayName.length > MAX_DISPLAY_NAME_LENGTH ||
    /[<>]/.test(displayName)
  ) {
    return null;
  }

  return displayName;
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

function isImprovedScore(nextEntry, currentEntry) {
  if (nextEntry.score !== currentEntry.score) return nextEntry.score > currentEntry.score;
  if (nextEntry.moves !== currentEntry.moves) return nextEntry.moves < currentEntry.moves;
  return nextEntry.seconds < currentEntry.seconds;
}

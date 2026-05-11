DROP INDEX IF EXISTS idx_leaderboard_entries_rank;

CREATE TABLE IF NOT EXISTS leaderboard_entries_next (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL UNIQUE CHECK (length(player_id) BETWEEN 7 AND 80),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 2 AND 32),
  score INTEGER NOT NULL CHECK (score >= 1),
  moves INTEGER NOT NULL CHECK (moves BETWEEN 1 AND 1000),
  seconds INTEGER NOT NULL CHECK (seconds BETWEEN 0 AND 3600),
  grid_size INTEGER NOT NULL CHECK (grid_size IN (3, 4)),
  created_at TEXT NOT NULL
);

INSERT INTO leaderboard_entries_next (
  id,
  player_id,
  display_name,
  score,
  moves,
  seconds,
  grid_size,
  created_at
)
SELECT
  id,
  'legacy-' || id,
  substr(display_name, 1, 32),
  score,
  moves,
  seconds,
  grid_size,
  created_at
FROM leaderboard_entries;

DROP TABLE leaderboard_entries;

ALTER TABLE leaderboard_entries_next RENAME TO leaderboard_entries;

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank
  ON leaderboard_entries (score DESC, moves ASC, seconds ASC, created_at ASC);

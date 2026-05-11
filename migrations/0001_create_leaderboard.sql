CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 3 AND 80),
  score INTEGER NOT NULL CHECK (score >= 1),
  moves INTEGER NOT NULL CHECK (moves BETWEEN 1 AND 1000),
  seconds INTEGER NOT NULL CHECK (seconds BETWEEN 0 AND 3600),
  grid_size INTEGER NOT NULL CHECK (grid_size IN (3, 4)),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank
  ON leaderboard_entries (score DESC, moves ASC, seconds ASC, created_at ASC);

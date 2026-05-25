'use strict';

const RICK_TRIGGER_MOVES = {
  3: () => Math.floor(Math.random() * 6) + 4,
  4: () => Math.floor(Math.random() * 8) + 5,
};

const DEFAULT_SHUFFLE_MOVES = 200;
const ASSISTED_SHUFFLE_SPARE_MOVES = 1;
const MAXIMUM_SCORE_MOVES = 1;
const MAXIMUM_SCORE_SECONDS = 0;
const RICKROLL_VIDEO_ID = "Eune-z_Zjww";
const YT_EMBED = `https://www.youtube.com/embed/${RICKROLL_VIDEO_ID}?autoplay=1&mute=0&playsinline=1&controls=0&loop=1&playlist=${RICKROLL_VIDEO_ID}&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

const state = {
  gridSize: 3,
  tiles: [],
  emptyIndex: 0,
  moveCount: 0,
  triggerMove: 5,
  timerInterval: null,
  secondsElapsed: 0,
  rickrolled: false,
  rickrollClicks: 0,
  scoreSubmitted: false,
  scoreSubmitting: false,
  scoreOverride: null,
  playerEntry: null,
  assistedShuffle: false,
  player: window.PlayerIdentity.getPlayerIdentity(),
};

const elements = {
  introCard: document.getElementById('intro-card'),
  gameArea: document.getElementById('game-area'),
  puzzleGrid: document.getElementById('puzzle-grid'),
  moveCount: document.getElementById('move-count'),
  timer: document.getElementById('timer'),
  progressBar: document.getElementById('progress-bar'),
  rickroll: document.getElementById('rickroll'),
  ytFrame: document.getElementById('yt-frame'),
  scoreResult: document.getElementById('score-result'),
  leaderboardList: document.getElementById('leaderboard-list'),
  leaderboardRefresh: document.getElementById('leaderboard-refresh'),
  playerForm: document.getElementById('player-form'),
  playerName: document.getElementById('player-name'),
  playerSubmit: document.getElementById('player-submit'),
  assistButton: document.getElementById('assist-btn'),
  startButton: document.getElementById('start-btn'),
  backButton: document.getElementById('back-btn'),
  shuffleButton: document.getElementById('shuffle-btn'),
  difficultyButtons: document.querySelectorAll('.diff-btn'),
};

function hydratePlayerForm() {
  elements.playerName.value = state.player.displayName;
}

function hasLeaderboardUnlock() {
  return Boolean(state.playerEntry || state.scoreSubmitted);
}

function updateAssistControls() {
  const unlocked = hasLeaderboardUnlock();

  elements.assistButton.hidden = !unlocked;
}

function getLeaderboardUrl() {
  const leaderboardParams = new URLSearchParams({ playerId: state.player.playerId });

  return `/api/leaderboard?${leaderboardParams}`;
}

function savePlayerName() {
  state.player = window.PlayerIdentity.updateDisplayName(elements.playerName.value);
  elements.playerName.value = state.player.displayName;

  return state.player;
}

function resetCounters() {
  state.moveCount = 0;
  state.secondsElapsed = 0;
  state.scoreOverride = null;
  elements.moveCount.textContent = '0';
  elements.timer.textContent = '0s';
}

function setPuzzleVisible(isVisible) {
  elements.introCard.style.display = isVisible ? 'none' : 'block';
  elements.gameArea.style.display = isVisible ? 'block' : 'none';
}

function setDifficulty(button) {
  elements.difficultyButtons.forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  state.gridSize = Number.parseInt(button.dataset.size, 10);
}

function startPuzzle() {
  state.assistedShuffle = false;
  setPuzzleVisible(true);
  initPuzzle();
}

function startAssistedPuzzle() {
  if (!hasLeaderboardUnlock()) return;

  state.assistedShuffle = true;
  setPuzzleVisible(true);
  initPuzzle();
}

function returnToIntro() {
  clearInterval(state.timerInterval);
  setPuzzleVisible(false);
  loadLeaderboard();
}

function reshufflePuzzle() {
  resetCounters();
  clearInterval(state.timerInterval);
  startTimer();
  state.triggerMove = RICK_TRIGGER_MOVES[state.gridSize]();
  shuffleTiles();
  renderGrid();
}

function initPuzzle() {
  resetCounters();
  state.rickrolled = false;
  state.scoreSubmitted = false;
  state.scoreSubmitting = false;
  state.triggerMove = RICK_TRIGGER_MOVES[state.gridSize]();
  elements.progressBar.style.width = '0%';

  elements.puzzleGrid.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
  const gridPx = Math.min(window.innerWidth - 60, 460);
  elements.puzzleGrid.style.width = `${gridPx}px`;

  state.tiles = [...Array.from({ length: state.gridSize * state.gridSize - 1 }, (_, i) => i + 1), 0];
  state.emptyIndex = state.tiles.length - 1;
  shuffleTiles();
  renderGrid();

  clearInterval(state.timerInterval);
  startTimer();
}

function getShuffleMoves() {
  if (!state.assistedShuffle) return DEFAULT_SHUFFLE_MOVES;

  return Math.max(1, state.triggerMove - ASSISTED_SHUFFLE_SPARE_MOVES);
}

function shuffleTiles() {
  let previousEmptyIndex = -1;

  for (let i = 0; i < getShuffleMoves(); i++) {
    let neighbours = getNeighbours(state.emptyIndex);

    if (neighbours.length > 1) {
      neighbours = neighbours.filter((idx) => idx !== previousEmptyIndex);
    }

    const swap = neighbours[Math.floor(Math.random() * neighbours.length)];
    [state.tiles[state.emptyIndex], state.tiles[swap]] = [state.tiles[swap], state.tiles[state.emptyIndex]];
    previousEmptyIndex = state.emptyIndex;
    state.emptyIndex = swap;
  }

  if (isSolved()) shuffleTiles();
}

function getNeighbours(idx) {
  const n = state.gridSize;
  const row = Math.floor(idx / n);
  const col = idx % n;
  const neighbours = [];

  if (row > 0) neighbours.push(idx - n);
  if (row < n - 1) neighbours.push(idx + n);
  if (col > 0) neighbours.push(idx - 1);
  if (col < n - 1) neighbours.push(idx + 1);

  return neighbours;
}

function renderGrid() {
  elements.puzzleGrid.innerHTML = '';

  state.tiles.forEach((value, idx) => {
    const tile = document.createElement('div');
    tile.className = `tile${value === 0 ? ' empty' : ''}`;

    if (value !== 0) {
      tile.textContent = value;
      if (value === idx + 1) tile.classList.add('correct');
      tile.addEventListener('click', () => handleTileClick(idx));
    }

    elements.puzzleGrid.appendChild(tile);
  });

  updateProgress();
}

function handleTileClick(idx) {
  if (state.rickrolled) return;
  if (!getNeighbours(state.emptyIndex).includes(idx)) return;

  [state.tiles[state.emptyIndex], state.tiles[idx]] = [state.tiles[idx], state.tiles[state.emptyIndex]];
  state.emptyIndex = idx;
  state.moveCount++;
  elements.moveCount.textContent = state.moveCount;
  renderGrid();

  if (isSolved()) {
    state.rickrolled = true;
    state.scoreOverride = { moves: MAXIMUM_SCORE_MOVES, seconds: MAXIMUM_SCORE_SECONDS };
    triggerRickroll();
    return;
  }

  if (state.moveCount >= state.triggerMove && !state.rickrolled) {
    state.rickrolled = true;
    triggerRickroll();
  }
}

function updateProgress() {
  const total = state.gridSize * state.gridSize - 1;
  const correct = state.tiles.filter((value, idx) => value !== 0 && value === idx + 1).length;
  elements.progressBar.style.width = `${Math.round((correct / total) * 100)}%`;
}

function isSolved() {
  return state.tiles.every((value, idx) => (idx === state.tiles.length - 1 ? value === 0 : value === idx + 1));
}

function startTimer() {
  state.timerInterval = setInterval(() => {
    state.secondsElapsed++;
    elements.timer.textContent = `${state.secondsElapsed}s`;
  }, 1000);
}

function triggerRickroll() {
  clearInterval(state.timerInterval);
  elements.ytFrame.src = YT_EMBED;
  window.KaraokeLyrics.start(elements.ytFrame);
  hydratePlayerForm();
  elements.playerSubmit.disabled = false;
  elements.playerSubmit.textContent = 'Submit oohs';
  elements.scoreResult.textContent = 'Enter a stage name so the crowd can judge the fall.';
  updateAssistControls();
  elements.rickroll.classList.add('active');
  state.rickrollClicks = 0;
}

function handleRickrollClick(event) {
  if (event.target.closest('#player-form')) return;

  state.rickrollClicks++;

  if (state.rickrollClicks < 5) return;

  elements.rickroll.classList.remove('active');
  window.KaraokeLyrics.stop();
  elements.ytFrame.src = '';
  setPuzzleVisible(false);
  state.moveCount = 0;
  state.rickrolled = false;
  state.rickrollClicks = 0;
  state.scoreSubmitting = false;
  loadLeaderboard();
}

async function loadLeaderboard() {
  elements.leaderboardList.innerHTML = '<li class="leaderboard-empty">Calling the crowded room...</li>';

  try {
    const response = await fetch(getLeaderboardUrl());
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Unable to load leaderboard');

    state.playerEntry = data.playerEntry;
    updateAssistControls();
    renderLeaderboard(data.entries);
  } catch {
    elements.leaderboardList.innerHTML =
      '<li class="leaderboard-empty">The ooh board is trying to hang tough.</li>';
  }
}

async function submitScore() {
  if (state.scoreSubmitting || state.scoreSubmitted) return;

  const player = savePlayerName();
  const score = state.scoreOverride ?? {
    moves: state.moveCount,
    seconds: state.secondsElapsed,
  };

  state.scoreSubmitting = true;
  elements.playerSubmit.disabled = true;
  elements.playerSubmit.textContent = 'Sending oohs...';
  elements.scoreResult.textContent = 'Submitting your late-night puzzle confession...';

  try {
    const response = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        playerId: player.playerId,
        displayName: player.displayName,
        moves: score.moves,
        seconds: score.seconds,
        gridSize: state.gridSize,
      }),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Unable to submit score');

    state.scoreSubmitted = true;
    state.playerEntry = data.entry;
    elements.scoreResult.textContent = data.improved
      ? `${data.entry.displayName} now has ${data.entry.score} oohs and a lightly wounded ego`
      : `${data.entry.displayName}'s best is still ${data.entry.score} oohs; the heart remains dramatic`;
    elements.playerSubmit.textContent = 'Oohs submitted';
    updateAssistControls();
    renderLeaderboard(data.entries);
  } catch {
    elements.playerSubmit.disabled = false;
    elements.playerSubmit.textContent = 'Submit oohs';
    elements.scoreResult.textContent = 'Your score hesitated before the board noticed.';
  } finally {
    state.scoreSubmitting = false;
  }
}

function renderLeaderboard(entries) {
  if (!entries || entries.length === 0) {
    elements.leaderboardList.innerHTML =
      '<li class="leaderboard-empty">No oohs yet. Stare across the board and start something.</li>';
    return;
  }

  elements.leaderboardList.replaceChildren(
    ...entries.map((entry) => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      const score = document.createElement('span');
      const detail = document.createElement('span');

      item.className = 'leaderboard-entry';
      name.className = 'leaderboard-name';
      score.className = 'leaderboard-score';
      detail.className = 'leaderboard-detail';

      name.textContent = entry.displayName;
      score.textContent = `${entry.score} oohs`;
      detail.textContent = `${entry.gridSize}x${entry.gridSize} - ${entry.moves} moves - ${entry.seconds}s`;

      item.append(name, score, detail);
      return item;
    })
  );
}

elements.difficultyButtons.forEach((button) => {
  button.addEventListener('click', () => setDifficulty(button));
});

elements.startButton.addEventListener('click', startPuzzle);
elements.assistButton.addEventListener('click', startAssistedPuzzle);
elements.backButton.addEventListener('click', returnToIntro);
elements.shuffleButton.addEventListener('click', reshufflePuzzle);
elements.rickroll.addEventListener('click', handleRickrollClick);
elements.leaderboardRefresh.addEventListener('click', loadLeaderboard);
elements.playerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitScore();
});

hydratePlayerForm();
updateAssistControls();
loadLeaderboard();

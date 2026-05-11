'use strict';

const RICK_TRIGGER_MOVES = {
  3: () => Math.floor(Math.random() * 6) + 4,
  4: () => Math.floor(Math.random() * 8) + 5,
};

const RICKROLL_VIDEO_ID = "Eune-z_Zjww";
const YT_EMBED = `https://www.youtube.com/embed/${RICKROLL_VIDEO_ID}?autoplay=1&mute=1&playsinline=1&controls=0&loop=1&playlist=${RICKROLL_VIDEO_ID}&rel=0`;

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
  startButton: document.getElementById('start-btn'),
  backButton: document.getElementById('back-btn'),
  shuffleButton: document.getElementById('shuffle-btn'),
  difficultyButtons: document.querySelectorAll('.diff-btn'),
};

function resetCounters() {
  state.moveCount = 0;
  state.secondsElapsed = 0;
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

function shuffleTiles() {
  let previousEmptyIndex = -1;

  for (let i = 0; i < 200; i++) {
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
  elements.scoreResult.textContent = 'Submitting your legendary failure...';
  elements.rickroll.classList.add('active');
  state.rickrollClicks = 0;
  submitScore();
}

function handleRickrollClick() {
  state.rickrollClicks++;

  if (state.rickrollClicks < 5) return;

  elements.rickroll.classList.remove('active');
  elements.ytFrame.src = '';
  setPuzzleVisible(false);
  state.moveCount = 0;
  state.rickrolled = false;
  state.rickrollClicks = 0;
  loadLeaderboard();
}

async function loadLeaderboard() {
  elements.leaderboardList.innerHTML = '<li class="leaderboard-empty">Loading scores...</li>';

  try {
    const response = await fetch('/api/leaderboard');
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Unable to load leaderboard');

    renderLeaderboard(data.entries);
  } catch {
    elements.leaderboardList.innerHTML =
      '<li class="leaderboard-empty">The leaderboard is having a moment.</li>';
  }
}

async function submitScore() {
  try {
    const response = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        moves: state.moveCount,
        seconds: state.secondsElapsed,
        gridSize: state.gridSize,
      }),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Unable to submit score');

    elements.scoreResult.textContent = `${data.entry.displayName} scored ${data.entry.score} ooh points`;
    renderLeaderboard(data.entries);
  } catch {
    elements.scoreResult.textContent = 'Your score escaped before the board noticed.';
  }
}

function renderLeaderboard(entries) {
  if (!entries || entries.length === 0) {
    elements.leaderboardList.innerHTML =
      '<li class="leaderboard-empty">No scores yet. Be the first on the board.</li>';
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
      score.textContent = `${entry.score} pts`;
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
elements.backButton.addEventListener('click', returnToIntro);
elements.shuffleButton.addEventListener('click', reshufflePuzzle);
elements.rickroll.addEventListener('click', handleRickrollClick);
elements.leaderboardRefresh.addEventListener('click', loadLeaderboard);

loadLeaderboard();

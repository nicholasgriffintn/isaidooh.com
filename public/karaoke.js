'use strict';

(function () {
  const YOUTUBE_API_SRC = 'https://www.youtube.com/iframe_api';
  const FALLBACK_LOOP_SECONDS = 56.18;
  const PLAYER_STATE = {
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
  };
  const LYRIC_CUES = [
    {
      start: 0.259,
      end: 2.0,
      text: 'I said ooh-ooh',
      words: [
        { text: 'I', start: 0.259, end: 0.359 },
        { text: 'said', start: 0.459, end: 0.68 },
        { text: 'ooh-ooh', start: 0.959, end: 2.0 },
      ],
    },
    {
      start: 3.22,
      end: 5.839,
      text: 'Come on, baby, turn the lights off',
      words: [
        { text: 'Come', start: 3.22, end: 3.46 },
        { text: 'on,', start: 3.5, end: 3.619 },
        { text: 'baby,', start: 3.679, end: 3.959 },
        { text: 'turn', start: 4.099, end: 4.319 },
        { text: 'the', start: 4.36, end: 4.46 },
        { text: 'lights', start: 4.539, end: 5.019 },
        { text: 'off', start: 5.119, end: 5.839 },
      ],
    },
    {
      start: 8.0,
      end: 9.179,
      text: 'Ooh-ooh',
      words: [{ text: 'Ooh-ooh', start: 8.0, end: 9.179 }],
    },
    {
      start: 10.459,
      end: 12.479,
      text: "'Cause it's getting late",
      words: [
        { text: "'Cause", start: 10.459, end: 10.719 },
        { text: "it's", start: 10.76, end: 10.9 },
        { text: 'getting', start: 10.939, end: 11.519 },
        { text: 'late', start: 11.579, end: 12.479 },
      ],
    },
    {
      start: 14.839,
      end: 16.359,
      text: 'I said ooh-ooh',
      words: [
        { text: 'I', start: 14.839, end: 14.899 },
        { text: 'said', start: 15.039, end: 15.239 },
        { text: 'ooh-ooh', start: 15.619, end: 16.359 },
      ],
    },
    {
      start: 17.6,
      end: 20.519,
      text: "I know you're gonna try to hang tough",
      words: [
        { text: 'I', start: 17.6, end: 17.639 },
        { text: 'know', start: 17.76, end: 17.94 },
        { text: "you're", start: 18.02, end: 18.18 },
        { text: 'gonna', start: 18.239, end: 18.539 },
        { text: 'try', start: 18.639, end: 18.859 },
        { text: 'to', start: 18.92, end: 19.02 },
        { text: 'hang', start: 19.139, end: 19.439 },
        { text: 'tough', start: 19.559, end: 20.519 },
      ],
    },
    {
      start: 22.559,
      end: 23.619,
      text: 'Ooh-ooh',
      words: [{ text: 'Ooh-ooh', start: 22.559, end: 23.619 }],
    },
    {
      start: 24.819,
      end: 26.979,
      text: "You shouldn't hesitate",
      words: [
        { text: 'You', start: 24.819, end: 24.899 },
        { text: "shouldn't", start: 25.0, end: 25.439 },
        { text: 'hesitate', start: 25.5, end: 26.979 },
      ],
    },
    {
      start: 30.219,
      end: 35.819,
      text: 'I had love to burn',
      words: [
        { text: 'I', start: 30.219, end: 32.2 },
        { text: 'had', start: 33.239, end: 33.459 },
        { text: 'love', start: 33.659, end: 33.84 },
        { text: 'to', start: 33.979, end: 34.18 },
        { text: 'burn', start: 34.38, end: 35.819 },
      ],
    },
    {
      start: 37.38,
      end: 42.039,
      text: 'You had a wounded heart',
      words: [
        { text: 'You', start: 37.38, end: 38.619 },
        { text: 'had', start: 39.639, end: 39.819 },
        { text: 'a', start: 39.879, end: 39.939 },
        { text: 'wounded', start: 40.04, end: 40.639 },
        { text: 'heart', start: 40.739, end: 42.039 },
      ],
    },
    {
      start: 44.36,
      end: 49.84,
      text: 'Eyes across a crowded room',
      words: [
        { text: 'Eyes', start: 44.36, end: 47.219 },
        { text: 'across', start: 47.599, end: 47.979 },
        { text: 'a', start: 48.039, end: 48.079 },
        { text: 'crowded', start: 48.18, end: 48.779 },
        { text: 'room', start: 48.939, end: 49.84 },
      ],
    },
    {
      start: 51.799,
      end: 56.18,
      text: 'Should we let this start?',
      words: [
        { text: 'Should', start: 51.799, end: 54.039 },
        { text: 'we', start: 54.36, end: 54.5 },
        { text: 'let', start: 54.539, end: 54.779 },
        { text: 'this', start: 54.84, end: 55.099 },
        { text: 'start?', start: 55.219, end: 56.18 },
      ],
    },
  ];

  let apiPromise;
  let frame;
  let player;
  let rafId;
  let fallbackStartedAt = 0;
  let lastCueIndex = -1;

  const elements = {
    stage: null,
    now: null,
    base: null,
    fill: null,
    next: null,
    wordSpans: [],
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function initElements() {
    elements.stage = document.getElementById('karaoke-stage');
    elements.now = document.getElementById('karaoke-now');
    elements.base = document.getElementById('karaoke-base');
    elements.fill = document.getElementById('karaoke-fill');
    elements.next = document.getElementById('karaoke-next');
  }

  function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;

    apiPromise = new Promise((resolve) => {
      const previousReady = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === 'function') previousReady();
        resolve();
      };

      const script = document.createElement('script');
      script.src = YOUTUBE_API_SRC;
      document.head.appendChild(script);
    });

    return apiPromise;
  }

  function attachPlayer() {
    if (!frame?.id || player) return;

    loadYouTubeApi().then(() => {
      player = new window.YT.Player(frame.id, {
        events: {
          onStateChange: handlePlayerStateChange,
        },
      });
    });
  }

  function handlePlayerStateChange(event) {
    if (event.data === PLAYER_STATE.PLAYING) {
      fallbackStartedAt = performance.now() - getPlayerSeconds() * 1000;
      tick();
    }

    if (event.data === PLAYER_STATE.ENDED) {
      resetLyrics();
    }

    if (event.data === PLAYER_STATE.PAUSED) {
      cancelAnimationFrame(rafId);
    }
  }

  function getPlayerSeconds() {
    if (player && typeof player.getCurrentTime === 'function') {
      const currentTime = player.getCurrentTime();

      if (Number.isFinite(currentTime)) return currentTime;
    }

    return ((performance.now() - fallbackStartedAt) / 1000) % FALLBACK_LOOP_SECONDS;
  }

  function findDisplayCue(seconds) {
    let cueIndex = -1;

    for (const [index, cue] of LYRIC_CUES.entries()) {
      if (seconds < cue.start) break;
      cueIndex = index;
    }

    return cueIndex;
  }

  function buildWordSpans(cue) {
    elements.wordSpans = cue.words.map((word) => {
      const span = document.createElement('span');
      span.className = 'karaoke-word';
      span.textContent = word.text;
      span.style.setProperty('--word-progress', '0%');
      return { span, word };
    });

    elements.base.replaceChildren(...elements.wordSpans.map(({ span }) => span));
    elements.fill.textContent = '';
  }

  function renderWordProgress(seconds) {
    for (const { span, word } of elements.wordSpans) {
      const progress = clamp((seconds - word.start) / (word.end - word.start), 0, 1);
      span.style.setProperty('--word-progress', `${progress * 100}%`);
      span.classList.toggle('is-active', progress > 0 && progress < 1);
      span.classList.toggle('is-sung', progress >= 1);
    }
  }

  function renderCue(cueIndex, seconds) {
    if (!elements.stage) return;

    const cue = LYRIC_CUES[cueIndex];
    const nextCue = LYRIC_CUES[cueIndex + 1] ?? LYRIC_CUES[0];

    elements.stage.classList.toggle('is-active', cueIndex >= 0);

    if (cueIndex !== lastCueIndex) {
      elements.now.classList.remove('is-entering', 'is-swapping');
      void elements.now.offsetWidth;
      elements.now.classList.add(lastCueIndex >= 0 ? 'is-swapping' : 'is-entering');
      if (cue) {
        buildWordSpans(cue);
      } else {
        elements.wordSpans = [];
        elements.base.replaceChildren();
        elements.fill.textContent = '';
      }
      lastCueIndex = cueIndex;
    }

    elements.next.textContent = cue ? nextCue.text : '';
    if (cue) renderWordProgress(seconds);
  }

  function resetLyrics() {
    lastCueIndex = -1;
    elements.wordSpans = [];
    elements.stage?.classList.remove('is-active');
    elements.now?.classList.remove('is-entering', 'is-swapping');
    elements.base?.replaceChildren();

    if (elements.fill) elements.fill.textContent = '';
    if (elements.next) elements.next.textContent = '';
  }

  function tick() {
    cancelAnimationFrame(rafId);

    const seconds = getPlayerSeconds();
    const cueIndex = findDisplayCue(seconds);
    renderCue(cueIndex, seconds);

    rafId = requestAnimationFrame(tick);
  }

  function start(iframe) {
    frame = iframe;
    fallbackStartedAt = performance.now();
    initElements();
    attachPlayer();
    resetLyrics();
    tick();
  }

  function stop() {
    cancelAnimationFrame(rafId);
    resetLyrics();
  }

  window.KaraokeLyrics = {
    cues: LYRIC_CUES,
    start,
    stop,
  };
})();

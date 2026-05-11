'use strict';

(function () {
  const STORAGE_KEY = 'isaidooh:player-identity';
  const MAX_DISPLAY_NAME_LENGTH = 32;
  const PLAYER_ID_PREFIX = 'player-';
  const NAME_PREFIXES = [
    'Late-Lights',
    'Hang-Tough',
    'Wounded-Heart',
    'Crowded-Room',
    'Love-Burner',
    'No-Hesitation',
    'Ooh-Ooh',
    'Bright-Off',
  ];
  const NAME_NOUNS = [
    'Slider',
    'Romantic',
    'Hesitator',
    'Tile Turner',
    'Puzzle Fool',
    'Heartbreaker',
    'Light Switcher',
    'Room Starer',
  ];

  function normalizeDisplayName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
  }

  function createPlayerId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return `${PLAYER_ID_PREFIX}${window.crypto.randomUUID()}`;
    }

    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
    const uuid = `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
      .slice(6, 8)
      .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;

    return `${PLAYER_ID_PREFIX}${uuid}`;
  }

  function readStoredIdentity() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const identity = JSON.parse(raw);
      if (!isValidIdentity(identity)) return null;

      return {
        playerId: identity.playerId,
        displayName: normalizeDisplayName(identity.displayName) || generateDisplayName(),
      };
    } catch {
      return null;
    }
  }

  function writeStoredIdentity(identity) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    } catch {
      // Private browsing or storage restrictions should not block playing.
    }
  }

  function isValidIdentity(identity) {
    return (
      identity &&
      typeof identity === 'object' &&
      typeof identity.playerId === 'string' &&
      identity.playerId.startsWith(PLAYER_ID_PREFIX) &&
      typeof identity.displayName === 'string'
    );
  }

  function getPlayerIdentity() {
    const stored = readStoredIdentity();

    if (stored) {
      writeStoredIdentity(stored);
      return stored;
    }

    const identity = {
      playerId: createPlayerId(),
      displayName: generateDisplayName(),
    };

    writeStoredIdentity(identity);
    return identity;
  }

  function updateDisplayName(value) {
    const current = getPlayerIdentity();
    const displayName = normalizeDisplayName(value) || current.displayName;
    const identity = { ...current, displayName };

    writeStoredIdentity(identity);
    return identity;
  }

  window.PlayerIdentity = {
    getPlayerIdentity,
    normalizeDisplayName,
    updateDisplayName,
  };

  function generateDisplayName() {
    return `${randomItem(NAME_PREFIXES)} ${randomItem(NAME_NOUNS)}`;
  }

  function randomItem(items) {
    return items[randomIndex(items.length)];
  }

  function randomIndex(length) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % length;
  }
})();

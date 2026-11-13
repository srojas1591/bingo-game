// ===== Shared Utilities for Bingo Multiplayer =====
// Sound effects and helper functions used by both host and player views

(function () {
  'use strict';

  // --- Sound effects using Web Audio API ---
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playCallSound() {
    // Sound for calling a number: pleasant ascending tone
    try {
      ensureAudio();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.15); // G5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) { /* ignore audio errors */ }
  }

  function playMarkSound() {
    // Sound for marking a number: short "pop" sound
    try {
      ensureAudio();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) { /* ignore audio errors */ }
  }

  function playWinSound() {
    // Win sound: celebratory ascending sequence
    try {
      ensureAudio();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        const startTime = audioCtx.currentTime + i * 0.15;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch (e) { /* ignore audio errors */ }
  }

  // --- Bingo letter/number helpers ---
  function letterForNumber(n) {
    if (n <= 15) return 'B';
    if (n <= 30) return 'I';
    if (n <= 45) return 'N';
    if (n <= 60) return 'G';
    return 'O';
  }

  function labelForNumber(n) {
    return `${letterForNumber(n)}-${n}`;
  }

  // --- Shuffle utility ---
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --- Bingo card generation ---
  function generateCard() {
    // Generate a valid 5x5 bingo card as a flat array of 25 elements
    // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
    // Center (index 12) is FREE (null)
    const card = new Array(25);
    card[12] = null; // FREE space

    const columns = [
      { min: 1, max: 15, indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      { min: 16, max: 30, indices: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
      { min: 31, max: 45, indices: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] },
      { min: 46, max: 60, indices: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26] },
      { min: 61, max: 75, indices: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31] }
    ];

    // Generate numbers for each column
    const colNumbers = [];
    for (let c = 0; c < 5; c++) {
      const nums = [];
      const pool = [];
      for (let n = columns[c].min; n <= columns[c].max; n++) pool.push(n);
      const shuffled = shuffleArray(pool);
      // Pick 5 numbers (or 4 for N column which has FREE space)
      const count = c === 2 ? 4 : 5;
      for (let i = 0; i < count; i++) nums.push(shuffled[i]);
      nums.sort((a, b) => a - b);
      colNumbers.push(nums);
    }

    // Place numbers in the card (column by column)
    let colIdx = [0, 0, 0, 0, 0];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const idx = row * 5 + col;
        if (idx === 12) continue; // FREE space
        card[idx] = colNumbers[col][colIdx[col]];
        colIdx[col]++;
      }
    }

    return card;
  }

  // --- Pattern detection ---
  function calculatePatterns(marked) {
    // marked is a flat array of 25 booleans
    // Returns { rows: [], columns: [], diagonals: [] } with indices of completed lines
    const rows = [];
    const columns = [];
    const diagonals = [];

    // Check rows
    for (let r = 0; r < 5; r++) {
      let complete = true;
      for (let c = 0; c < 5; c++) {
        if (!marked[r * 5 + c]) { complete = false; break; }
      }
      if (complete) rows.push(r);
    }

    // Check columns
    for (let c = 0; c < 5; c++) {
      let complete = true;
      for (let r = 0; r < 5; r++) {
        if (!marked[r * 5 + c]) { complete = false; break; }
      }
      if (complete) columns.push(c);
    }

    // Check diagonals
    let diag1 = true, diag2 = true;
    for (let i = 0; i < 5; i++) {
      if (!marked[i * 5 + i]) diag1 = false;
      if (!marked[i * 5 + (4 - i)]) diag2 = false;
    }
    if (diag1) diagonals.push(0);
    if (diag2) diagonals.push(1);

    return { rows, columns, diagonals };
  }

  // --- Win detection ---
  function checkWin(marked) {
    // Returns true if any row, column, or diagonal is complete
    const patterns = calculatePatterns(marked);
    return patterns.rows.length > 0 || patterns.columns.length > 0 || patterns.diagonals.length > 0;
  }

  // --- Export to global scope ---
  window.ensureAudio = ensureAudio;
  window.playCallSound = playCallSound;
  window.playMarkSound = playMarkSound;
  window.playWinSound = playWinSound;
  window.letterForNumber = letterForNumber;
  window.labelForNumber = labelForNumber;
  window.shuffleArray = shuffleArray;
  window.generateCard = generateCard;
  window.calculatePatterns = calculatePatterns;
  window.checkWin = checkWin;
})();

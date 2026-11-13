// ===== Bingo en Español — Game Logic =====

(function () {
  'use strict';

  // --- Spanish Bingo letter labels ---
  const LETTERS = ['B', 'I', 'N', 'G', 'O'];
  const RANGES = {
    B: [1, 15],
    I: [16, 30],
    N: [31, 45],
    G: [46, 60],
    O: [61, 75],
  };

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

  // --- DOM references ---
  const playersContainer = document.getElementById('players-container');
  const addPlayerBtn = document.getElementById('add-player-btn');
  const calledGrid = document.getElementById('called-grid');
  const currentBall = document.getElementById('current-ball');
  const callBtn = document.getElementById('call-btn');
  const newGameBtn = document.getElementById('new-game-btn');
  const playAgainBtn = document.getElementById('play-again-btn');
  const statusEl = document.getElementById('status');
  const calledCountEl = document.getElementById('called-count');
  const winOverlay = document.getElementById('win-overlay');
  const winMessage = document.getElementById('win-message');

  // --- Game state ---
  let players = [];       // Array of {name, card, marked}
  let calledNumbers = []; // shuffled 1..75
  let callIndex = 0;
  let gameOver = false;

  // ===== Utility =====

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

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

  // ===== Card Generation =====

  function generateColumn(col) {
    const [min, max] = RANGES[LETTERS[col]];
    const nums = [];
    while (nums.length < 5) {
      const n = randomInRange(min, max);
      if (!nums.includes(n)) nums.push(n);
    }
    return nums;
  }

  function generateCard() {
    const newCard = [];
    for (let col = 0; col < 5; col++) {
      newCard[col] = generateColumn(col);
    }
    // Transpose to row-major for rendering
    const rowMajor = [];
    for (let row = 0; row < 5; row++) {
      rowMajor[row] = [];
      for (let col = 0; col < 5; col++) {
        rowMajor[row][col] = newCard[col][row];
      }
    }
    rowMajor[2][2] = null; // FREE space
    return rowMajor;
  }

  // ===== Player Management =====

  function addPlayer(name) {
    const card = generateCard();
    const marked = Array.from({ length: 5 }, () => Array(5).fill(false));
    marked[2][2] = true; // FREE space
    players.push({ name: name.trim(), card, marked });
    renderAllCards();
  }

  function removePlayer(index) {
    players.splice(index, 1);
    renderAllCards();
  }

  function renderAllCards() {
    playersContainer.innerHTML = '';
    players.forEach((player, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'player-card-wrapper';

      const header = document.createElement('div');
      header.className = 'player-header';
      header.innerHTML = `<span class="player-name">${player.name}</span>`;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove-player';
      removeBtn.textContent = '✕';
      removeBtn.title = 'Quitar jugador';
      removeBtn.addEventListener('click', () => removePlayer(idx));
      header.appendChild(removeBtn);
      wrapper.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'card-grid';
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const cell = document.createElement('div');
          cell.className = 'card-cell';
          cell.dataset.row = row;
          cell.dataset.col = col;

          if (player.card[row][col] === null) {
            cell.classList.add('free', 'marked');
            cell.textContent = 'LIBRE';
          } else {
            cell.textContent = player.card[row][col];
            if (player.marked[row][col]) {
              cell.classList.add('marked');
            }
            cell.addEventListener('click', () => toggleMark(idx, row, col));
          }
          grid.appendChild(cell);
        }
      }
      wrapper.appendChild(grid);
      playersContainer.appendChild(wrapper);
    });
  }

  // ===== Rendering =====

  function renderCalledGrid() {
    calledGrid.innerHTML = '';
    for (let n = 1; n <= 75; n++) {
      const cell = document.createElement('div');
      cell.className = 'called-cell';
      cell.textContent = n;
      cell.dataset.num = n;
      if (calledNumbers.includes(n)) {
        cell.classList.add('active');
      }
      calledGrid.appendChild(cell);
    }
  }

  // ===== Game Actions =====

  function toggleMark(playerIdx, row, col) {
    if (gameOver) return;
    const player = players[playerIdx];
    if (player.card[row][col] === null) return;

    const num = player.card[row][col];
    if (!player.marked[row][col] && !calledNumbers.includes(num)) {
      statusEl.innerHTML = `<strong>${num}</strong> (${labelForNumber(num)}) aún no ha sido sacado`;
      return;
    }

    player.marked[row][col] = !player.marked[row][col];
    if (player.marked[row][col]) {
      playMarkSound();
    }
    renderAllCards();

    if (player.marked[row][col] && checkWinForPlayer(player)) {
      triggerWin(player);
    }
  }

  function callNumber() {
    if (gameOver) return;
    if (callIndex >= 75) {
      statusEl.textContent = '¡Se han sacado todos los números!';
      return;
    }

    const num = calledNumbers[callIndex];
    callIndex++;

    playCallSound();

    currentBall.classList.remove('pop');
    void currentBall.offsetWidth;
    currentBall.textContent = labelForNumber(num);
    currentBall.classList.add('pop');

    statusEl.innerHTML = `Sacado: <strong>${num}</strong> — ${labelForNumber(num)}`;
    calledCountEl.textContent = callIndex;

    // Auto-mark on all player cards
    let winner = null;
    players.forEach((player) => {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (player.card[r][c] === num && !player.marked[r][c]) {
            player.marked[r][c] = true;
          }
        }
      }
      if (!winner && checkWinForPlayer(player)) {
        winner = player;
      }
    });

    renderAllCards();
    renderCalledGrid();

    if (winner) {
      triggerWin(winner);
    }
  }

  // ===== Win Detection =====

  function checkWinForPlayer(player) {
    const m = player.marked;
    // Rows
    for (let r = 0; r < 5; r++) {
      let win = true;
      for (let c = 0; c < 5; c++) {
        if (!m[r][c]) { win = false; break; }
      }
      if (win) return true;
    }
    // Columns
    for (let c = 0; c < 5; c++) {
      let win = true;
      for (let r = 0; r < 5; r++) {
        if (!m[r][c]) { win = false; break; }
      }
      if (win) return true;
    }
    // Diagonal top-left → bottom-right
    let d1 = true;
    for (let i = 0; i < 5; i++) {
      if (!m[i][i]) { d1 = false; break; }
    }
    if (d1) return true;
    // Diagonal top-right → bottom-left
    let d2 = true;
    for (let i = 0; i < 5; i++) {
      if (!m[i][4 - i]) { d2 = false; break; }
    }
    if (d2) return true;
    return false;
  }

  function triggerWin(player) {
    gameOver = true;
    callBtn.disabled = true;
    statusEl.innerHTML = `🎉 <strong>¡BINGO!</strong> ¡${player.name} ha ganado!`;

    // Highlight winning cells for the winner
    const wrappers = playersContainer.querySelectorAll('.player-card-wrapper');
    const playerIdx = players.indexOf(player);
    if (wrappers[playerIdx]) {
      wrappers[playerIdx].querySelectorAll('.card-cell.marked').forEach((cell) => {
        cell.classList.add('winning');
      });
    }

    winMessage.textContent = `¡Felicidades ${player.name}! ¡Has ganado!`;
    setTimeout(() => {
      winOverlay.classList.remove('hidden');
    }, 600);
  }

  // ===== New Game =====

  function newGame() {
    gameOver = false;
    callIndex = 0;
    calledNumbers = shuffle(Array.from({ length: 75 }, (_, i) => i + 1));

    // Regenerate cards for all players
    players.forEach((player) => {
      player.card = generateCard();
      player.marked = Array.from({ length: 5 }, () => Array(5).fill(false));
      player.marked[2][2] = true;
    });

    currentBall.textContent = '--';
    currentBall.classList.remove('pop');
    statusEl.innerHTML = 'Presiona <strong>"Sacar número"</strong> para comenzar';
    calledCountEl.textContent = '0';
    callBtn.disabled = false;
    winOverlay.classList.add('hidden');

    renderAllCards();
    renderCalledGrid();
  }

  // ===== Event Listeners =====

  addPlayerBtn.addEventListener('click', () => {
    const name = prompt('Nombre del jugador:');
    if (name && name.trim()) {
      addPlayer(name);
    }
  });

  callBtn.addEventListener('click', callNumber);
  newGameBtn.addEventListener('click', newGame);
  playAgainBtn.addEventListener('click', newGame);

  // ===== Service Worker Registration =====
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // ===== Start =====
  newGame();
})();

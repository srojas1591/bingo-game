(function () {
  'use strict';

  // ===== Firebase Connection =====
  let db = null;
  let players = [];
  let calledNumbers = [];
  let callOrder = [];
  let callIndex = 0;
  let gameOver = false;
  let authenticated = false;

  // ===== Initialize when DOM is ready =====
  function init() {
    console.log('[Host] Initializing host view');

    // Check Firebase configuration
    if (!window.FirebaseInit || !window.FirebaseInit.isConfigured()) {
      showFirebaseError();
      return;
    }

    // Initialize Firebase
    const result = window.FirebaseInit.init();
    if (!result.configured) {
      showFirebaseError();
      return;
    }
    db = window.FirebaseInit.getDatabase();

    // ===== DOM References =====
    const authScreen = document.getElementById('auth-screen');
    const authForm = document.getElementById('auth-form');
    const accessCodeInput = document.getElementById('access-code');
    const authError = document.getElementById('auth-error');
    const dashboard = document.getElementById('dashboard');
    const statusEl = document.getElementById('status');
    const currentBall = document.getElementById('current-ball');
    const callBtn = document.getElementById('call-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const calledCountEl = document.getElementById('called-count');
    const calledGrid = document.getElementById('called-grid');
    const classificationBoard = document.getElementById('classification-board');
    const winOverlay = document.getElementById('win-overlay');
    const winMessage = document.getElementById('win-message');
    const playAgainBtn = document.getElementById('play-again-btn');
    const backBtn = document.getElementById('back-btn');

    if (!authScreen || !authForm || !dashboard) {
      console.error('[Host] Missing required DOM elements. Is this the host page?');
      return;
    }

    // Back button — return to index.html
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = '/';
      });
    }

    // Firebase connection state listener
    const connRef = db.ref('.info/connected');
    connRef.on('value', (snap) => {
      if (snap.val() === true) {
        console.log('[Host] Connected to Firebase');
      } else {
        console.log('[Host] Disconnected from Firebase');
        if (authenticated) {
          statusEl.textContent = 'Conexión perdida. Reconectando...';
        }
      }
    });

    // ===== Auth Form =====
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = accessCodeInput.value.trim();

      if (!code) return;

      if (code === '1591') {
        authError.classList.add('hidden');
        authenticateHost();
      } else {
        authError.textContent = 'Código incorrecto. Intenta de nuevo.';
        authError.classList.remove('hidden');
        accessCodeInput.value = '';
        accessCodeInput.focus();
      }
    });

    // ===== Authenticate Host =====
    function authenticateHost() {
      console.log('[Host] Authenticating as host');
      const gameRef = db.ref('bingo-game');

      // First, clear any stale game state from previous sessions
      gameRef.remove().then(() => {
        // Then initialize fresh game state
        return gameRef.child('host').set({
          authenticated: true,
          calledNumbers: [],
          callIndex: 0,
          gameOver: false,
          winners: []
        });
      }).then(() => {
        console.log('[Host] Game state initialized in Firebase');
        authenticated = true;
        authScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        ensureAudio();

        // Render the called numbers grid immediately (empty at start)
        renderCalledGrid();

        // Listen to host state for called numbers and game over
        gameRef.child('host').on('value', (snap) => {
          const data = snap.val();
          if (!data) return;

          // Skip our own writes — only react to changes from other clients (players triggering wins)
          // The host manages its own calledNumbers locally via the call button

          // Check if game was reset (new game)
          if (data.calledNumbers && data.calledNumbers.length === 0 && calledNumbers.length > 0) {
            // Game was reset by another host or cleanup
            calledNumbers = [];
            callIndex = 0;
            callOrder = [];
            gameOver = false;
            currentBall.textContent = '--';
            currentBall.classList.remove('pop');
            calledCountEl.textContent = '0';
            winOverlay.classList.add('hidden');
            callBtn.disabled = false;
            renderCalledGrid();
            statusEl.textContent = 'Nuevo juego iniciado. Presiona "Sacar número"';
          }

          // Update called numbers only when they change from Firebase
          // (This handles the case where another host instance writes)
          if (data.calledNumbers && data.calledNumbers.length !== calledNumbers.length) {
            calledNumbers = data.calledNumbers;
            callIndex = data.callIndex || 0;
            const lastNumber = calledNumbers[calledNumbers.length - 1];
            if (lastNumber) {
              const label = labelForNumber(lastNumber);
              playCallSound();
              currentBall.classList.remove('pop');
              void currentBall.offsetWidth;
              currentBall.textContent = label;
              currentBall.classList.add('pop');
              statusEl.innerHTML = `Sacado: <strong>${lastNumber}</strong> — ${label}`;
              calledCountEl.textContent = calledNumbers.length;
              renderCalledGrid();
            }
          }

          // Check game over
          if (data.gameOver && !gameOver) {
            gameOver = true;
            callBtn.disabled = true;
            const winners = data.winners || [];
            const winnerNames = winners.map(w => w.name).join(', ');
            statusEl.innerHTML = `🎉 <strong>¡BINGO!</strong> ¡${winnerNames} ha ganado!`;
            winMessage.textContent = `¡Felicidades ${winnerNames}! ¡Han ganado!`;
            playWinSound();
            setTimeout(() => {
              winOverlay.classList.remove('hidden');
            }, 600);
          }
        });

        // Listen to players for classification board
        gameRef.child('players').on('value', (snap) => {
          const data = snap.val();
          players = [];
          if (data) {
            const playerEntries = Object.entries(data);
            for (const [id, p] of playerEntries) {
              const marked = p.marked || [];
              const markedCount = marked.filter(Boolean).length;
              const patterns = p.patterns || { rows: [], columns: [], diagonals: [] };
              players.push({
                playerId: id,
                playerName: p.name || 'Anónimo',
                markedCount: markedCount,
                patterns: patterns
              });
            }
          }
          renderClassificationBoard();
          updateCallButton();
        });

        statusEl.textContent = 'Presiona "Sacar número" para comenzar';
      }).catch((err) => {
        console.error('[Host] Firebase auth error:', err);
        authError.textContent = 'Error al iniciar el juego. Recarga la página.';
        authError.classList.remove('hidden');
      });
    }

    function showFirebaseError() {
      const authScreen = document.getElementById('auth-screen');
      const authError = document.getElementById('auth-error');
      if (authScreen) authScreen.classList.remove('hidden');
      if (authError) {
        authError.textContent = 'Firebase no está configurado. Edita js/firebase.config.js con tus credenciales.';
        authError.classList.remove('hidden');
      }
    }

    // ===== Called Grid =====
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

    // ===== Classification Board =====
    function renderClassificationBoard() {
      if (players.length === 0) {
        classificationBoard.innerHTML = '<p class="empty-msg">Aún no hay jugadores.</p>';
        return;
      }

      // Sort by score: patterns weighted more than marks
      const sorted = [...players].sort((a, b) => {
        const aScore = a.markedCount + (a.patterns.rows.length + a.patterns.columns.length + a.patterns.diagonals.length) * 10;
        const bScore = b.markedCount + (b.patterns.rows.length + b.patterns.columns.length + b.patterns.diagonals.length) * 10;
        return bScore - aScore;
      });

      let html = `
        <table class="classification-table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Marcados</th>
              <th>Filas</th>
              <th>Columnas</th>
              <th>Diagonales</th>
            </tr>
          </thead>
          <tbody>
      `;

      sorted.forEach((player, idx) => {
        const isLeader = idx === 0;
        html += `
          <tr class="${isLeader ? 'leader' : ''}">
            <td class="player-name-cell">
              ${player.playerName}
              <span class="player-id">#${player.playerId}</span>
            </td>
            <td>${player.markedCount}/25</td>
            <td class="patterns-cell">${renderPatterns(player.patterns.rows, 5)}</td>
            <td class="patterns-cell">${renderPatterns(player.patterns.columns, 5)}</td>
            <td class="patterns-cell">${renderPatterns(player.patterns.diagonals, 2)}</td>
          </tr>
        `;
      });

      html += '</tbody></table>';
      classificationBoard.innerHTML = html;
    }

    function renderPatterns(completed, total) {
      let result = '';
      for (let i = 0; i < total; i++) {
        if (completed.includes(i)) {
          result += '<span class="pattern-check">✓</span> ';
        } else {
          result += '<span class="pattern-empty">○</span> ';
        }
      }
      return result.trim();
    }

    // ===== Call Button State =====
    function updateCallButton() {
      callBtn.disabled = players.length === 0 || gameOver;
      if (players.length === 0 && !gameOver) {
        statusEl.textContent = 'Esperando jugadores...';
      }
    }

    // ===== Generate shuffled number order =====
    function generateCallOrder() {
      const nums = [];
      for (let i = 1; i <= 75; i++) nums.push(i);
      return shuffleArray(nums);
    }

    // ===== Call Number =====
    callBtn.addEventListener('click', () => {
      if (gameOver) return;
      if (!callOrder || callOrder.length === 0) {
        callOrder = generateCallOrder();
      }
      if (callIndex >= callOrder.length) {
        statusEl.textContent = '¡Se han sacado todos los números!';
        callBtn.disabled = true;
        return;
      }

      const nextNumber = callOrder[callIndex];
      callIndex++;
      calledNumbers.push(nextNumber);

      // Update UI immediately (don't wait for Firebase listener — it skips host's own writes)
      const label = labelForNumber(nextNumber);
      playCallSound();
      currentBall.classList.remove('pop');
      void currentBall.offsetWidth;
      currentBall.textContent = label;
      currentBall.classList.add('pop');
      statusEl.innerHTML = `Sacado: <strong>${nextNumber}</strong> — ${label}`;
      calledCountEl.textContent = calledNumbers.length;
      renderCalledGrid();

      // Write to Firebase so players see the new number
      db.ref('bingo-game/host').update({
        calledNumbers: calledNumbers,
        callIndex: callIndex
      }).then(() => {
        console.log('[Host] Number called:', nextNumber, '(', label, ')');
      }).catch((err) => {
        console.error('[Host] Error calling number:', err);
      });
    });

    // ===== New Game =====
    function startNewGame() {
      // Clear all game state
      db.ref('bingo-game').remove().then(() => {
        // Re-initialize
        db.ref('bingo-game/host').set({
          authenticated: true,
          calledNumbers: [],
          callIndex: 0,
          gameOver: false,
          winners: []
        });
        // Reset local state
        calledNumbers = [];
        callOrder = [];
        callIndex = 0;
        gameOver = false;
        callBtn.disabled = false;
        currentBall.textContent = '--';
        currentBall.classList.remove('pop');
        calledCountEl.textContent = '0';
        winOverlay.classList.add('hidden');
        renderCalledGrid();
        statusEl.textContent = 'Nuevo juego iniciado. Presiona "Sacar número"';
        console.log('[Host] New game started');
      }).catch((err) => {
        console.error('[Host] Error starting new game:', err);
      });
    }

    newGameBtn.addEventListener('click', () => {
      startNewGame();
    });

    playAgainBtn.addEventListener('click', () => {
      startNewGame();
    });

    const returnBtn = document.getElementById('return-btn');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => {
        window.location.href = '/';
      });
    }

    // ===== Service Worker =====
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

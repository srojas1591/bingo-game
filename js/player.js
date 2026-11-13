(function () {
  'use strict';

  // ===== Firebase Connection =====
  let db = null;
  let playerRef = null;

  // ===== DOM References =====
  const joinScreen = document.getElementById('join-screen');
  const joinForm = document.getElementById('join-form');
  const playerNameInput = document.getElementById('player-name');
  const playerIdDisplay = document.getElementById('player-id-display');
  const joinError = document.getElementById('join-error');
  const gameScreen = document.getElementById('game-screen');
  const playerInfoEl = document.getElementById('player-info');
  const statusEl = document.getElementById('status');
  const currentBall = document.getElementById('current-ball');
  const calledCountEl = document.getElementById('called-count');
  const cardGrid = document.getElementById('card-grid');
  const calledGrid = document.getElementById('called-grid');
  const winOverlay = document.getElementById('win-overlay');
  const winMessage = document.getElementById('win-message');

  // ===== Generate 5-digit Player ID =====
  const playerId = String(Math.floor(10000 + Math.random() * 90000));
  playerIdDisplay.textContent = playerId;

  // ===== Game State =====
  let card = [];          // 5x5 array generated client-side
  let marked = [];        // 5x5 boolean array
  let calledNumbers = [];
  let playerName = '';
  let gameOver = false;
  let isWinner = false;

  // ===== Initialize when DOM is ready =====
  function init() {
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

    // Firebase connection state listener
    const connRef = db.ref('.info/connected');
    connRef.on('value', (snap) => {
      if (snap.val() === true) {
        console.log('[Player] Connected to Firebase');
      } else {
        console.log('[Player] Disconnected from Firebase');
        if (gameScreen && !gameScreen.classList.contains('hidden')) {
          statusEl.textContent = 'Conexión perdida. Reconectando...';
        }
      }
    });

    // ===== Join Form =====
    joinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = playerNameInput.value.trim();

      if (!name) {
        joinError.classList.remove('hidden');
        playerNameInput.focus();
        return;
      }

      joinError.classList.add('hidden');
      playerName = name;

      // Generate card and join game
      joinGame();
    });

    // ===== Join Game =====
    function joinGame() {
      console.log('[Player] Joining game as', playerName, 'ID:', playerId);

      // Generate bingo card
      card = generateCard();
      marked = Array.from({ length: 25 }, () => false);
      marked[12] = true; // FREE space (center, index 12 in flat array)

      const gameRef = db.ref('bingo-game');

      // Write player data to Firebase
      playerRef = gameRef.child('players').child(playerId);
      playerRef.set({
        name: playerName,
        card: card,
        marked: marked,
        patterns: { rows: [], columns: [], diagonals: [] }
      }).then(() => {
        console.log('[Player] Joined successfully');
        ensureAudio();

        // Show game screen
        joinScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        playerInfoEl.textContent = `Jugador: ${playerName} (#${playerId})`;

        // Listen to host state for called numbers and game over
        gameRef.child('host').on('value', (snap) => {
          const data = snap.val();

          // If host data is gone, the game was reset
          if (!data) {
            if (calledNumbers.length > 0 || gameOver) {
              console.log('[Player] Game reset detected (host data removed)');
              window.location.href = '/';
            }
            return;
          }

          // Wait for the host to be authenticated before rendering anything
          if (!data.authenticated) {
            console.log('[Player] Waiting for host to authenticate...');
            return;
          }

          // Check if game was reset (new game) — calledNumbers cleared
          if (data.calledNumbers && data.calledNumbers.length === 0 && calledNumbers.length > 0) {
            // Game was reset — redirect to re-join
            console.log('[Player] Game reset detected');
            window.location.href = '/';
            return;
          }

          // Update called numbers
          if (data.calledNumbers) {
            const prevCount = calledNumbers.length;
            calledNumbers = data.calledNumbers;

            if (calledNumbers.length > prevCount) {
              const lastNumber = calledNumbers[calledNumbers.length - 1];
              const label = labelForNumber(lastNumber);

              // Display the called number
              currentBall.classList.remove('pop');
              void currentBall.offsetWidth;
              currentBall.textContent = label;
              currentBall.classList.add('pop');

              statusEl.innerHTML = `Sacado: <strong>${lastNumber}</strong> — ${label}`;
              calledCountEl.textContent = calledNumbers.length;

              // Play sound
              playCallSound();

              // Update card to show called numbers with orange border
              renderCard();
              renderCalledGrid();
            } else if (prevCount === 0) {
              // Initial load — render card with existing called numbers
              calledCountEl.textContent = calledNumbers.length;
              renderCard();
              renderCalledGrid();
            }
          }

          // Check game over
          if (data.gameOver && !gameOver) {
            gameOver = true;
            const winners = data.winners || [];
            isWinner = winners.some(w => w.id === playerId);

            if (isWinner) {
              playWinSound();
              winMessage.textContent = `¡Felicidades ${playerName}! ¡Has ganado!`;
              document.querySelectorAll('.card-cell.marked').forEach((cell) => {
                cell.classList.add('winning');
              });
              const winnerNames = winners.map(w => w.name).join(', ');
              statusEl.innerHTML = `🎉 <strong>¡BINGO!</strong> ¡${winnerNames} ha ganado!`;
            } else {
              winMessage.textContent = '¡El bingo ha finalizado! ¡No has ganado!';
              const winnerNames = winners.map(w => w.name).join(', ');
              statusEl.innerHTML = `🎉 <strong>¡BINGO!</strong> ¡${winnerNames} ha ganado!`;
            }
            setTimeout(() => {
              winOverlay.classList.remove('hidden');
            }, 600);
          }
        });

        // Only show status after host is authenticated
        statusEl.textContent = 'Esperando a que el anfitrión inicie el juego...';
      }).catch((err) => {
        console.error('[Player] Error joining game:', err);
        joinError.textContent = 'Error al unirse al juego. Recarga la página.';
        joinError.classList.remove('hidden');
      });
    }

    function showFirebaseError() {
      if (joinScreen) joinScreen.classList.remove('hidden');
      if (joinError) {
        joinError.textContent = 'Firebase no está configurado. Edita js/firebase.config.js con tus credenciales.';
        joinError.classList.remove('hidden');
      }
    }

    // ===== Card Rendering =====
    function renderCard() {
      cardGrid.innerHTML = '';
      for (let i = 0; i < 25; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const cell = document.createElement('div');
        cell.className = 'card-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        if (card[i] === null) {
          cell.classList.add('free', 'marked');
          cell.textContent = 'LIBRE';
        } else {
          cell.textContent = card[i];
          if (marked[i]) {
            cell.classList.add('marked');
          } else if (calledNumbers.includes(card[i])) {
            cell.classList.add('called');
          }
          cell.addEventListener('click', () => toggleCell(i));
          cell.addEventListener('touchend', (e) => {
            e.preventDefault();
            toggleCell(i);
          });
        }
        cardGrid.appendChild(cell);
      }
    }

    // ===== Toggle Cell Marking =====
    function toggleCell(index) {
      if (card[index] === null) return; // FREE space
      if (gameOver) return;

      const num = card[index];
      if (!calledNumbers.includes(num)) {
        return; // Only mark called numbers
      }

      // Toggle mark
      marked[index] = !marked[index];

      // Play sound
      if (marked[index]) {
        playMarkSound();
      }

      // Update Firebase
      if (playerRef) {
        // Calculate patterns
        const patterns = calculatePatterns(marked);
        playerRef.update({
          marked: marked,
          patterns: patterns
        });

        // Check for win
        if (checkWin(marked) && !gameOver) {
          // Add this player to the winners list (supports multiple winners)
          const hostRef = db.ref('bingo-game/host');
          hostRef.once('value').then((snap) => {
            const hostData = snap.val();
            const existingWinners = (hostData && hostData.winners) || [];
            // Avoid duplicate entries
            if (!existingWinners.some(w => w.id === playerId)) {
              existingWinners.push({ id: playerId, name: playerName });
              hostRef.update({
                gameOver: true,
                winners: existingWinners
              });
            }
          });
        }
      }

      renderCard();
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

    // ===== Return Button =====
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

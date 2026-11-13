// Router page — controls player button based on host authentication status
(function () {
  'use strict';

  // Check Firebase configuration
  if (!window.FirebaseInit || !window.FirebaseInit.isConfigured()) {
    console.log('[Router] Firebase not configured — player button remains disabled');
    return;
  }

  // Initialize Firebase
  const result = window.FirebaseInit.init();
  if (!result.configured) {
    console.log('[Router] Firebase init failed — player button remains disabled');
    return;
  }

  const db = window.FirebaseInit.getDatabase();
  const playerBtn = document.getElementById('player-btn');
  const playerStatus = document.getElementById('player-status');

  if (!playerBtn || !playerStatus) {
    console.log('[Router] Player button or status element not found');
    return;
  }

  // Start with player button disabled
  playerBtn.classList.add('disabled');
  playerStatus.textContent = 'Esperando a que el anfitrión inicie el juego...';

  console.log('[Router] Listening for host authentication...');

  // Check if host session is alive (heartbeat within last 30 seconds)
  function isHostAlive(data) {
    if (!data || data.authenticated !== true) return false;
    if (!data.lastSeen) return false; // No heartbeat = stale session
    const now = Date.now();
    const STALE_THRESHOLD = 30000; // 30 seconds
    return (now - data.lastSeen) < STALE_THRESHOLD;
  }

  // Listen to host authentication status
  db.ref('bingo-game/host').on('value', (snap) => {
    const data = snap.val();

    if (isHostAlive(data)) {
      // Host is authenticated and alive — enable player button
      if (playerBtn.classList.contains('disabled')) {
        playerBtn.classList.remove('disabled');
        playerStatus.textContent = '¡Juego activo! Toca "Soy Jugador" para unirte.';
        playerStatus.classList.add('active');
        console.log('[Router] Host authenticated and alive — player button enabled');
      }
    } else {
      // No host or stale session — disable player button
      if (!playerBtn.classList.contains('disabled')) {
        playerBtn.classList.add('disabled');
        playerStatus.textContent = 'Esperando a que el anfitrión inicie el juego...';
        playerStatus.classList.remove('active');
        console.log('[Router] No active host (stale or missing) — player button disabled');
      }
      // Auto-cleanup stale sessions: if authenticated but no heartbeat, remove the data
      if (data && data.authenticated === true && !isHostAlive(data)) {
        console.log('[Router] Cleaning up stale host session');
        db.ref('bingo-game').remove();
      }
    }
  });

  // Firebase connection state listener
  db.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true) {
      console.log('[Router] Connected to Firebase');
    } else {
      console.log('[Router] Disconnected from Firebase');
    }
  });
})();

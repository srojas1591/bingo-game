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

  // Listen to host authentication status
  db.ref('bingo-game/host').on('value', (snap) => {
    const data = snap.val();

    if (data && data.authenticated === true) {
      // Host is authenticated — enable player button
      if (playerBtn.classList.contains('disabled')) {
        playerBtn.classList.remove('disabled');
        playerStatus.textContent = '¡Juego activo! Toca "Soy Jugador" para unirte.';
        playerStatus.classList.add('active');
        console.log('[Router] Host authenticated — player button enabled');
      }
    } else {
      // No host or not authenticated — disable player button
      if (!playerBtn.classList.contains('disabled')) {
        playerBtn.classList.add('disabled');
        playerStatus.textContent = 'Esperando a que el anfitrión inicie el juego...';
        playerStatus.classList.remove('active');
        console.log('[Router] No active host — player button disabled');
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

# Bingo en Español — Multiplayer 🎱

Juego de Bingo en español para móviles con modo **multiplayer en tiempo real**. Un anfitrión controla el juego y los jugadores se unen desde sus propios dispositivos. Sin servidor — usa **Firebase Realtime Database** para la sincronización.

## Características

- **Modo Anfitrión**: Controla el juego, saca números y monitorea la clasificación
- **Modo Jugador**: Cada jugador tiene su propio cartón en su dispositivo
- **Tiempo real**: Sincronización instantánea vía Firebase
- **Tabla de clasificación**: El anfitrión ve marcados y patrones completados de cada jugador
- **Efectos de sonido**: Sonidos al sacar números, marcar casillas y ganar
- **Cartón de Bingo 5×5** con espacio LIBRE en el centro
- **Detección de Bingo** — filas, columnas y diagonales
- **Tema Matrix**: Diseño inspirado en la película Matrix
- **Diseño responsivo** optimizado para móviles
- **Instalable** como app nativa (PWA)
- **Sin servidor**: Se hospeda en GitHub Pages

## Configuración de Firebase

Este juego usa Firebase Realtime Database para la comunicación en tiempo real. Necesitas configurar un proyecto de Firebase:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto (o usa uno existente)
3. Ve a **Project Settings** (icono ⚙️) > **General**
4. Desplázate a **"Your apps"** > **Web app** > Registra una app
5. Copia los valores de configuración
6. Edita `js/firebase.config.js` y reemplaza los valores placeholder:

```javascript
window.firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "TU_PROYECTO_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

7. En Firebase Console, ve a **Realtime Database** > **Rules** y configura:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ Las reglas abiertas son aceptables para este juego casual. No se almacenan datos sensibles.

## Desplegar en GitHub Pages

1. Sube el código a un repositorio de GitHub
2. Ve a **Settings** > **Pages**
3. Selecciona la rama (ej. `main`) y la carpeta (`/root`)
4. Guarda — tu app estará disponible en `https://TU_USUARIO.github.io/TU_REPOSITORIO/`

## Cómo jugar

### Como Anfitrión

1. Abre la app y haz clic en **"🎤 Soy el Anfitrión"**
2. Ingresa el código de acceso: **1591**
3. Comparte la URL de la app con los jugadores
4. Presiona **"Sacar número"** para comenzar
5. Monitorea la tabla de clasificación en tiempo real

### Como Jugador

1. Abre la app y haz clic en **"🎮 Soy Jugador"**
2. Ingresa tu nombre (se genera un ID de 5 dígitos automáticamente)
3. Recibe tu cartón de Bingo
4. Toca las casillas para marcar los números que han sido sacados
5. ¡Completa una línea para ganar!

### Jugar desde diferentes dispositivos

Como la app se hospeda en GitHub Pages (o cualquier servidor estático), todos los jugadores acceden a la misma URL desde sus dispositivos. No necesitas estar en la misma red WiFi.

## Estructura del proyecto

```
bingo-project/
├── index.html             # Página de inicio (router)
├── views/
│   ├── host.html          # Vista del anfitrión
│   └── player.html        # Vista del jugador
├── styles/
│   ├── host.css           # Estilos del anfitrión
│   └── player.css         # Estilos del jugador
├── js/
│   ├── firebase.config.js # Configuración de Firebase
│   ├── firebase-init.js   # Inicialización de Firebase
│   ├── host.js            # Lógica del anfitrión
│   ├── player.js          # Lógica del jugador
│   └── shared.js          # Utilidades compartidas (sonidos, cartas)
├── manifest.json          # Configuración PWA
├── sw.js                  # Service Worker
├── icon-192.png, icon-512.png  # Iconos PWA
└── README.md              # Este archivo
```

## Tecnologías

- HTML5, CSS3, JavaScript vanilla (sin frameworks)
- Firebase Realtime Database para comunicación en tiempo real
- Progressive Web App (PWA)
- Service Worker para caché offline
- Diseño mobile-first responsivo
- Tema Matrix Movie

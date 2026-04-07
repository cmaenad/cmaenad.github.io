/**
 * renderer.js — Renderizado 3D del cubo con CSS transforms
 *
 * Cada cara tiene un botón de movimiento superpuesto en su centro 3D,
 * de modo que el botón siempre está visualmente sobre la cara correcta
 * sin importar el ángulo de vista.
 */

import { FACE_NAMES } from './cube.js';

// Ángulos de vista actuales
let rotX = -25;
let rotY = 30;

export function getViewAngles() { return { rotX, rotY }; }
export function setViewAngles(x, y) { rotX = x; rotY = y; }

/**
 * Configuración de cada cara: etiqueta visible y símbolo del botón.
 * El botón se coloca en el sticker central (índice 4) de cada cara.
 * Click = horario, click derecho / long-press = antihorario.
 */
const FACE_CONFIG = {
  U: { label: 'U', symbol: '↻', title: 'Cara superior' },
  D: { label: 'D', symbol: '↻', title: 'Cara inferior' },
  F: { label: 'F', symbol: '↻', title: 'Cara frontal' },
  B: { label: 'B', symbol: '↻', title: 'Cara trasera' },
  L: { label: 'L', symbol: '↻', title: 'Cara izquierda' },
  R: { label: 'R', symbol: '↻', title: 'Cara derecha' },
};

/**
 * Inicializa las 6 caras en el DOM.
 * El sticker central (índice 4) lleva además un botón de movimiento
 * superpuesto que gira con la cara en el espacio 3D.
 *
 * @param {HTMLElement} cubeEl
 * @param {function} onFaceMove — callback(faceName, cw: boolean)
 */
export function initRenderer(cubeEl, onFaceMove) {
  FACE_NAMES.forEach(name => {
    const face = document.createElement('div');
    face.className = `cube-face face-${name}`;
    face.dataset.face = name;

    for (let i = 0; i < 9; i++) {
      const sticker = document.createElement('div');
      sticker.className = 'sticker';
      sticker.dataset.idx = i;

      // El sticker central lleva el botón de movimiento
      if (i === 4 && onFaceMove) {
        const cfg = FACE_CONFIG[name];
        const btn = document.createElement('button');
        btn.className = 'face-move-btn';
        btn.setAttribute('aria-label', `Girar cara ${name}`);
        btn.title = `${cfg.title} — Click: horario | Click derecho: antihorario`;
        btn.innerHTML = `<span class="face-btn-symbol">${cfg.symbol}</span><span class="face-btn-label">${cfg.label}</span>`;

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          onFaceMove(name, true);
        });
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          onFaceMove(name, false);
        });

        // Long-press móvil = antihorario
        let pressTimer = null;
        btn.addEventListener('touchstart', () => {
          pressTimer = setTimeout(() => {
            onFaceMove(name, false);
            pressTimer = null;
          }, 400);
        }, { passive: true });
        btn.addEventListener('touchend', () => {
          if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        });

        sticker.appendChild(btn);
      }

      face.appendChild(sticker);
    }

    cubeEl.appendChild(face);
  });
}

// Actualiza los colores de todos los stickers según el estado del cubo
export function renderCube(cube, colors) {
  FACE_NAMES.forEach((name, fi) => {
    const face = document.querySelector(`.face-${name}`);
    if (!face) return;
    const stickers = face.querySelectorAll('.sticker');
    stickers.forEach((s, i) => {
      // El color de fondo va al sticker, no al botón interno
      s.style.backgroundColor = colors[cube.state[fi][i]];
    });
  });
}

// Aplica la rotación de vista al contenedor del cubo
export function applyViewRotation(containerEl) {
  containerEl.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}

// Rotar la vista en pasos de 90°
const STEP = 90;
export function rotateView(direction, containerEl) {
  switch (direction) {
    case 'rotateUp':    rotX += STEP; break;
    case 'rotateDown':  rotX -= STEP; break;
    case 'rotateLeft':  rotY -= STEP; break;
    case 'rotateRight': rotY += STEP; break;
  }
  applyViewRotation(containerEl);
}

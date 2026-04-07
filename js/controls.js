/**
 * controls.js — Botones de rotación de vista, flechas de movimiento,
 * randomizar, resolver y reiniciar. También maneja touch/swipe.
 */

import { rotateView, renderCube, applyViewRotation } from './renderer.js';

/**
 * Definición de flechas de movimiento.
 * Cada flecha tiene: posición CSS (top/left/right/bottom en %),
 * símbolo, movimiento CW y movimiento CCW.
 * Las posiciones están pensadas para verse sobre el cubo en la vista por defecto.
 */
const ARROWS = [
  // Cara frontal — aristas horizontales
  { id: 'U-row', top: '12%', left: '50%', symbol: '↑', moveCW: 'U',  moveCCW: "U'" },
  { id: 'D-row', top: '88%', left: '50%', symbol: '↓', moveCW: 'D',  moveCCW: "D'" },
  // Cara frontal — aristas verticales
  { id: 'L-col', top: '50%', left: '12%', symbol: '←', moveCW: 'L',  moveCCW: "L'" },
  { id: 'R-col', top: '50%', left: '88%', symbol: '→', moveCW: 'R',  moveCCW: "R'" },
  // Cara frontal
  { id: 'F-cw',  top: '50%', left: '50%', symbol: '↻', moveCW: 'F',  moveCCW: "F'" },
  // Cara trasera (accesible rotando la vista)
  { id: 'B-cw',  top: '50%', left: '50%', symbol: '↺', moveCW: 'B',  moveCCW: "B'", hidden: true },
];

// Mapa de teclas de teclado a movimientos
const KEY_MAP = {
  'u': 'U', 'U': "U'",
  'd': 'D', 'D': "D'",
  'f': 'F', 'F': "F'",
  'b': 'B', 'B': "B'",
  'l': 'L', 'L': "L'",
  'r': 'R', 'R': "R'",
};

export function initControls({ cube, colors, onMove, onRandomize, onSolve, onReset, containerEl }) {
  // Botones de rotación de vista
  document.querySelectorAll('.rot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      rotateView(btn.dataset.rot, containerEl);
      onMove(null); // solo guarda la vista, no mueve el cubo
    });
  });

  // Flechas de movimiento
  const arrowsEl = document.getElementById('move-arrows');
  ARROWS.filter(a => !a.hidden).forEach(arrow => {
    const btn = document.createElement('button');
    btn.className = 'move-arrow';
    btn.title = `${arrow.moveCW} / ${arrow.moveCCW}`;
    btn.innerHTML = arrow.symbol;
    btn.style.top = arrow.top;
    btn.style.left = arrow.left;
    btn.style.transform = 'translate(-50%, -50%)';

    // Click izquierdo = CW, click derecho = CCW
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      cube.move(arrow.moveCW);
      renderCube(cube, colors);
      onMove(arrow.moveCW);
    });
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      cube.move(arrow.moveCCW);
      renderCube(cube, colors);
      onMove(arrow.moveCCW);
    });

    arrowsEl.appendChild(btn);
  });

  // Botones de acción
  document.getElementById('btn-randomize').addEventListener('click', onRandomize);
  document.getElementById('btn-solve').addEventListener('click', onSolve);
  document.getElementById('btn-reset').addEventListener('click', onReset);

  // Teclado (PC)
  document.addEventListener('keydown', (e) => {
    const m = KEY_MAP[e.key];
    if (m) {
      cube.move(m);
      renderCube(cube, colors);
      onMove(m);
    }
  });

  // Touch/swipe sobre el cubo
  initTouchControls(cube, colors, onMove);
}

// ===== Swipe táctil =====
function initTouchControls(cube, colors, onMove) {
  const scene = document.getElementById('scene-wrapper');
  let startX = 0, startY = 0;

  scene.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  scene.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 30) return; // swipe muy corto

    let m;
    if (absDx > absDy) {
      m = dx > 0 ? 'R' : "R'";
    } else {
      m = dy > 0 ? 'D' : "D'";
    }
    cube.move(m);
    renderCube(cube, colors);
    onMove(m);
  }, { passive: true });
}

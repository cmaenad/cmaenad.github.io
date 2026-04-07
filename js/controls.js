/**
 * controls.js — Controles de vista, teclado, swipe y botones de acción.
 * Los movimientos de cara se manejan directamente desde los botones
 * centrales de cada cara 3D (ver renderer.js → initRenderer).
 */

import { rotateView, renderCube } from './renderer.js';

// Teclas: minúscula = horario, mayúscula = antihorario
const KEY_MAP = {
  'u': 'U',  'U': "U'",
  'd': 'D',  'D': "D'",
  'f': 'F',  'F': "F'",
  'b': 'B',  'B': "B'",
  'l': 'L',  'L': "L'",
  'r': 'R',  'R': "R'",
};

export function initControls({ cube, colorsRef, onMove, onRandomize, onSolve, onReset, containerEl }) {

  // ── Rotación de vista ──────────────────────────────────────────────
  document.querySelectorAll('.rot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      rotateView(btn.dataset.rot, containerEl);
      onMove(null);
    });
  });

  // ── Botones de acción ──────────────────────────────────────────────
  document.getElementById('btn-randomize').addEventListener('click', onRandomize);
  document.getElementById('btn-solve').addEventListener('click', onSolve);
  document.getElementById('btn-reset').addEventListener('click', onReset);

  // ── Teclado (PC) ──────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const m = KEY_MAP[e.key];
    if (m) {
      cube.move(m);
      renderCube(cube, colorsRef.value);
      onMove(m);
    }
  });

  // ── Swipe táctil sobre la escena ──────────────────────────────────
  // Permite rotar la vista arrastrando fuera de los botones de cara
  const scene = document.getElementById('scene-wrapper');
  let startX = 0, startY = 0;

  scene.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  scene.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
    // Swipe horizontal = rotar vista izq/der, vertical = arriba/abajo
    if (Math.abs(dx) > Math.abs(dy)) {
      rotateView(dx > 0 ? 'rotateRight' : 'rotateLeft', containerEl);
    } else {
      rotateView(dy > 0 ? 'rotateDown' : 'rotateUp', containerEl);
    }
    onMove(null);
  }, { passive: true });
}

/**
 * controls.js — Botones de rotación de vista, flechas de movimiento,
 * randomizar, resolver y reiniciar. También maneja touch/swipe.
 *
 * IMPORTANTE: colors se pasa como objeto contenedor { value: [] } para que
 * las flechas siempre lean el array actualizado, no una copia vacía inicial.
 */

import { rotateView, renderCube, applyViewRotation } from './renderer.js';

// Flechas visibles sobre el cubo
// click izquierdo = CW, click derecho / long-press = CCW
const ARROWS = [
  { id: 'U-row', top: '8%',  left: '50%', symbol: '↑', moveCW: 'U',  moveCCW: "U'" },
  { id: 'D-row', top: '92%', left: '50%', symbol: '↓', moveCW: 'D',  moveCCW: "D'" },
  { id: 'L-col', top: '50%', left: '8%',  symbol: '←', moveCW: 'L',  moveCCW: "L'" },
  { id: 'R-col', top: '50%', left: '92%', symbol: '→', moveCW: 'R',  moveCCW: "R'" },
  { id: 'F-cw',  top: '50%', left: '50%', symbol: '↻', moveCW: 'F',  moveCCW: "F'" },
];

// Teclas: minúscula = horario, mayúscula = antihorario
const KEY_MAP = {
  'u': 'U',  'U': "U'",
  'd': 'D',  'D': "D'",
  'f': 'F',  'F': "F'",
  'b': 'B',  'B': "B'",
  'l': 'L',  'L': "L'",
  'r': 'R',  'R': "R'",
};

/**
 * @param {object} opts
 * @param {Cube}   opts.cube        — instancia del cubo
 * @param {object} opts.colorsRef   — { value: string[] } referencia mutable a los colores
 * @param {function} opts.onMove    — callback tras cada movimiento
 * @param {function} opts.onRandomize
 * @param {function} opts.onSolve
 * @param {function} opts.onReset
 * @param {HTMLElement} opts.containerEl — #cube-container para rotación de vista
 */
export function initControls({ cube, colorsRef, onMove, onRandomize, onSolve, onReset, containerEl }) {

  // ── Rotación de vista ──────────────────────────────────────────────
  document.querySelectorAll('.rot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      rotateView(btn.dataset.rot, containerEl);
      onMove(null);
    });
  });

  // ── Flechas de movimiento ──────────────────────────────────────────
  const arrowsEl = document.getElementById('move-arrows');

  ARROWS.forEach(arrow => {
    const btn = document.createElement('button');
    btn.className = 'move-arrow';
    btn.setAttribute('aria-label', `${arrow.moveCW} / ${arrow.moveCCW}`);
    btn.title = `Click: ${arrow.moveCW}  |  Click derecho: ${arrow.moveCCW}`;
    btn.innerHTML = arrow.symbol;
    btn.style.cssText = `top:${arrow.top};left:${arrow.left};transform:translate(-50%,-50%)`;

    const doMove = (notation) => {
      cube.move(notation);
      renderCube(cube, colorsRef.value);
      onMove(notation);
    };

    btn.addEventListener('click', (e) => { e.preventDefault(); doMove(arrow.moveCW); });
    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); doMove(arrow.moveCCW); });

    // Long-press en móvil = movimiento inverso
    let pressTimer = null;
    btn.addEventListener('touchstart', (e) => {
      pressTimer = setTimeout(() => {
        e.preventDefault();
        doMove(arrow.moveCCW);
        pressTimer = null;
      }, 400);
    }, { passive: true });
    btn.addEventListener('touchend', () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    });

    arrowsEl.appendChild(btn);
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

  // ── Swipe táctil ──────────────────────────────────────────────────
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
    const m = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'R' : "R'")
      : (dy > 0 ? 'D' : "D'");
    cube.move(m);
    renderCube(cube, colorsRef.value);
    onMove(m);
  }, { passive: true });
}

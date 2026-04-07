/**
 * app.js — Bootstrap y coordinación del juego
 */

import { Cube } from './cube.js';
import { initRenderer, renderCube, applyViewRotation, setViewAngles, getViewAngles } from './renderer.js';
import { initControls } from './controls.js';
import { resolveColors } from './location.js';
import { saveSession, loadSession } from './session.js';
import { solve } from './solver.js';

const cube = new Cube();
let colors = [];
let country = 'DEFAULT';
let solveAnimating = false;

const cubeEl = document.getElementById('cube');
const containerEl = document.getElementById('cube-container');
const overlay = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlay-msg');
const countryInfo = document.getElementById('country-info');

// ===== Guardar sesión =====
function saveState() {
  const { rotX, rotY } = getViewAngles();
  saveSession(cube, colors, country, { rotX, rotY });
}

// ===== Inicializar renderer =====
initRenderer(cubeEl);

// ===== Arranque =====
async function init() {
  const session = loadSession();

  if (session && session.colors && session.state) {
    // Restaurar sesión guardada
    colors = session.colors;
    country = session.country || 'DEFAULT';
    cube.deserialize(session.state);
    if (session.viewAngles) {
      setViewAngles(session.viewAngles.rotX, session.viewAngles.rotY);
    }
    applyViewRotation(containerEl);
    renderCube(cube, colors);
    showCountryInfo(country, colors);
    hideOverlay();
  } else {
    // Primera vez: pedir geolocalización
    overlayMsg.textContent = 'Necesitamos tu ubicación para personalizar los colores del cubo.';
    document.getElementById('btn-allow').style.display = 'inline-block';
    document.getElementById('btn-default').style.display = 'inline-block';

    document.getElementById('btn-allow').addEventListener('click', async () => {
      overlayMsg.textContent = 'Obteniendo ubicación...';
      document.getElementById('btn-allow').style.display = 'none';
      document.getElementById('btn-default').style.display = 'none';
      await loadColors();
    });

    document.getElementById('btn-default').addEventListener('click', async () => {
      await loadColors(true);
    });
  }

  // Inicializar controles (siempre, para que funcionen los botones)
  initControls({
    cube,
    colors,
    onMove: () => saveState(),
    onRandomize: handleRandomize,
    onSolve: handleSolve,
    onReset: handleReset,
    containerEl,
  });
}

async function loadColors(useDefault = false) {
  if (useDefault) {
    const { ensureSixColors, FLAG_COLORS } = await import('./location.js');
    colors = ensureSixColors(FLAG_COLORS.DEFAULT);
    country = 'DEFAULT';
  } else {
    const result = await resolveColors();
    colors = result.colors;
    country = result.country;
  }
  renderCube(cube, colors);
  applyViewRotation(containerEl);
  showCountryInfo(country, colors);
  saveState();
  hideOverlay();
}

function hideOverlay() {
  overlay.style.display = 'none';
}

function showCountryInfo(c, cols) {
  const swatches = cols.map(col =>
    `<span style="display:inline-block;width:14px;height:14px;background:${col};border-radius:3px;margin:0 2px;vertical-align:middle;border:1px solid rgba(255,255,255,0.2)"></span>`
  ).join('');
  countryInfo.innerHTML = `País: <strong>${c}</strong> ${swatches}`;
}

// ===== Handlers =====

function handleRandomize() {
  if (solveAnimating) return;
  cube.randomize(25);
  renderCube(cube, colors);
  saveState();
}

async function handleSolve() {
  if (solveAnimating) return;
  if (cube.isSolved()) return;

  solveAnimating = true;
  document.getElementById('btn-solve').disabled = true;

  const moves = solve(cube);

  // Animar cada movimiento con delay
  for (const m of moves) {
    cube.move(m);
    renderCube(cube, colors);
    saveState();
    await delay(180);
  }

  solveAnimating = false;
  document.getElementById('btn-solve').disabled = false;
}

function handleReset() {
  if (solveAnimating) return;
  cube.reset();
  renderCube(cube, colors);
  saveState();
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// ===== Arrancar =====
init();

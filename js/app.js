/**
 * app.js — Bootstrap y coordinación del juego
 */

import { Cube, invertMoves } from './cube.js';
import { initRenderer, renderCube, applyViewRotation, setViewAngles, getViewAngles } from './renderer.js';
import { initControls } from './controls.js';
import { resolveColors, randomCountry, CLASSIC_COLORS } from './location.js';
import { saveSession, loadSession } from './session.js';

const cube = new Cube();

// colorsRef es un objeto mutable compartido con controls.js
// así las flechas siempre leen el array de colores actualizado
const colorsRef = { value: [] };
let country = 'DEFAULT';
let solveAnimating = false;
let scrambleSolution = null; // solución garantizada tras randomize

const cubeEl      = document.getElementById('cube');
const containerEl = document.getElementById('cube-container');
const overlay     = document.getElementById('overlay');
const overlayMsg  = document.getElementById('overlay-msg');
const countryInfo = document.getElementById('country-info');
const btnSolve    = document.getElementById('btn-solve');

// ── Renderer ────────────────────────────────────────────────────────
initRenderer(cubeEl, (faceName, cw) => {
  cube.move(cw ? faceName : `${faceName}'`);
  scrambleSolution = null; // movimiento manual invalida la solución guardada
  renderCube(cube, colorsRef.value);
  saveState();
});

// ── Persistencia ────────────────────────────────────────────────────
function saveState() {
  const { rotX, rotY } = getViewAngles();
  saveSession(cube, colorsRef.value, country, { rotX, rotY });
}

// ── Arranque ────────────────────────────────────────────────────────
async function init() {
  const session = loadSession();

  if (session && session.colors && session.state) {
    colorsRef.value = session.colors;
    country = session.country || 'DEFAULT';
    cube.deserialize(session.state);
    if (session.viewAngles) setViewAngles(session.viewAngles.rotX, session.viewAngles.rotY);
    applyViewRotation(containerEl);
    renderCube(cube, colorsRef.value);
    showCountryInfo(country, colorsRef.value);
    hideOverlay();
  } else {
    overlayMsg.textContent = 'Necesitamos tu ubicación para personalizar los colores del cubo.';
    document.getElementById('btn-allow').style.display   = 'inline-block';
    document.getElementById('btn-default').style.display = 'inline-block';

    document.getElementById('btn-allow').addEventListener('click', async () => {
      overlayMsg.textContent = 'Obteniendo ubicación...';
      document.getElementById('btn-allow').style.display   = 'none';
      document.getElementById('btn-default').style.display = 'none';
      await loadColors(false);
    });
    document.getElementById('btn-default').addEventListener('click', () => loadColors(true));
  }

  // Controles siempre se inicializan, usan colorsRef por referencia
  initControls({
    cube,
    colorsRef,
    onMove: () => {
      scrambleSolution = null; // movimiento manual invalida solución guardada
      saveState();
    },
    onRandomize:  handleRandomize,
    onSolve:      handleSolve,
    onReset:      handleReset,
    containerEl,
  });

  // Botón 🎨 Colores — toggle del panel
  const colorPanel = document.getElementById('color-panel');
  document.getElementById('btn-colors').addEventListener('click', (e) => {
    e.stopPropagation();
    colorPanel.classList.toggle('visible');
  });
  document.addEventListener('click', () => colorPanel.classList.remove('visible'));

  document.getElementById('btn-location').addEventListener('click', () => {
    colorPanel.classList.remove('visible');
    handleRelocate();
  });
  document.getElementById('btn-random-country').addEventListener('click', () => {
    colorPanel.classList.remove('visible');
    handleRandomCountry();
  });
  document.getElementById('btn-classic').addEventListener('click', () => {
    colorPanel.classList.remove('visible');
    handleClassicColors();
  });
}

async function loadColors(useDefault = false) {
  if (useDefault) {
    const { ensureSixColors, FLAG_COLORS } = await import('./location.js');
    colorsRef.value = ensureSixColors(FLAG_COLORS.DEFAULT);
    country = 'DEFAULT';
  } else {
    const result = await resolveColors();
    colorsRef.value = result.colors;
    country = result.country;
  }
  renderCube(cube, colorsRef.value);
  applyViewRotation(containerEl);
  showCountryInfo(country, colorsRef.value);
  saveState();
  hideOverlay();
}

function hideOverlay() { overlay.style.display = 'none'; }

function showCountryInfo(c, cols) {
  const swatches = cols.map(col =>
    `<span style="display:inline-block;width:14px;height:14px;background:${col};
     border-radius:3px;margin:0 2px;vertical-align:middle;
     border:1px solid rgba(255,255,255,0.2)"></span>`
  ).join('');
  countryInfo.innerHTML = `País: <strong>${c}</strong> ${swatches}`;
}

// ── Handlers ────────────────────────────────────────────────────────

function handleRandomize() {
  if (solveAnimating) return;
  const seq = cube.randomize(25);
  scrambleSolution = invertMoves(seq); // solución garantizada
  renderCube(cube, colorsRef.value);
  saveState();
}

function handleReset() {
  // Reset siempre funciona, incluso si el solver estaba corriendo
  solveAnimating = false;
  btnSolve.disabled = false;
  btnSolve.textContent = '✨ Resolver';
  cube.reset();
  renderCube(cube, colorsRef.value);
  saveState();
}

async function handleRelocate() {
  if (solveAnimating) return;
  const btn = document.getElementById('btn-location');
  btn.disabled = true;
  btn.textContent = '⏳ Buscando...';
  const result = await resolveColors();
  colorsRef.value = result.colors;
  country = result.country;
  renderCube(cube, colorsRef.value);
  showCountryInfo(country, colorsRef.value);
  saveState();
  btn.disabled = false;
  btn.textContent = '📍 Mi ubicación';
}

function handleRandomCountry() {
  if (solveAnimating) return;
  const result = randomCountry();
  colorsRef.value = result.colors;
  country = result.country;
  renderCube(cube, colorsRef.value);
  showCountryInfo(country, colorsRef.value);
  saveState();
}

function handleClassicColors() {
  if (solveAnimating) return;
  colorsRef.value = [...CLASSIC_COLORS];
  country = 'CLASSIC';
  renderCube(cube, colorsRef.value);
  showCountryInfo('Clásico', colorsRef.value);
  saveState();
}

/**
 * Resolver: delega el cálculo al Web Worker para no bloquear la UI,
 * luego anima cada movimiento en tiempo real con un delay visible.
 */
async function handleSolve() {
  if (solveAnimating || cube.isSolved()) return;

  solveAnimating = true;
  btnSolve.disabled = true;

  let moves;

  if (scrambleSolution) {
    // Solución garantizada disponible (tras randomize sin movimientos manuales)
    moves = scrambleSolution;
    scrambleSolution = null;
  } else {
    // Calcular con worker
    btnSolve.textContent = '⏳ Calculando...';
    moves = await calcSolutionInWorker(cube.serialize());
  }

  if (!moves || moves.length === 0) {
    btnSolve.textContent = '✨ Resolver';
    btnSolve.disabled = false;
    solveAnimating = false;
    return;
  }

  btnSolve.textContent = '▶ Resolviendo...';

  for (const m of moves) {
    cube.move(m);
    renderCube(cube, colorsRef.value);
    saveState();
    await delay(200);
  }

  btnSolve.textContent = '✨ Resolver';
  btnSolve.disabled = false;
  solveAnimating = false;
}

/**
 * Lanza el solver en un Web Worker y devuelve una Promise con los movimientos.
 * Si el navegador no soporta Workers, cae al solver síncrono como fallback.
 */
function calcSolutionInWorker(state) {
  return new Promise(async (resolve) => {
    if (typeof Worker === 'undefined') {
      // Fallback síncrono (no debería ocurrir en Chrome moderno)
      const { solve } = await import('./solver.js');
      const c = new Cube();
      c.deserialize(state);
      resolve(solve(c));
      return;
    }

    const worker = new Worker('./js/solver-worker.js');
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.error) { resolve([]); return; }
      resolve(e.data.moves);
    };
    worker.onerror = () => { worker.terminate(); resolve([]); };
    worker.postMessage({ state });
  });
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// ── Arrancar ────────────────────────────────────────────────────────
init();

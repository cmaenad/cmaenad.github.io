/**
 * renderer.js — Renderizado 3D del cubo con CSS transforms
 */

import { FACE_NAMES } from './cube.js';

// Ángulos de vista actuales (rotación del contenedor)
let rotX = -25;
let rotY = 30;

export function getViewAngles() { return { rotX, rotY }; }
export function setViewAngles(x, y) { rotX = x; rotY = y; }

// Inicializa las 6 caras en el DOM
export function initRenderer(cubeEl) {
  FACE_NAMES.forEach(name => {
    const face = document.createElement('div');
    face.className = `cube-face face-${name}`;
    face.dataset.face = name;
    for (let i = 0; i < 9; i++) {
      const sticker = document.createElement('div');
      sticker.className = 'sticker';
      sticker.dataset.idx = i;
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
      s.style.backgroundColor = colors[cube.state[fi][i]];
    });
  });
}

// Aplica la rotación de vista al contenedor del cubo
export function applyViewRotation(containerEl) {
  containerEl.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}

// Rotar la vista en pasos
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

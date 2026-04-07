/**
 * session.js — Persistencia del estado del cubo en localStorage
 */

const KEY = 'rubik_session';

export function saveSession(cube, colors, country, viewAngles) {
  const data = {
    state: cube.serialize(),
    colors,
    country,
    viewAngles,
    ts: Date.now(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('No se pudo guardar la sesión:', e);
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

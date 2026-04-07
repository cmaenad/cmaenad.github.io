/**
 * solver-worker.js — Web Worker que ejecuta el solver en segundo plano
 * para no bloquear el hilo principal (UI).
 *
 * Recibe: { state: string }  (cubo serializado)
 * Envía:  { moves: string[] } o { error: string }
 */

// Importar el módulo del solver dentro del worker
// Los workers soportan importScripts o módulos ES según el navegador.
// Usamos importScripts con una versión CommonJS-compatible inline para máxima compatibilidad.

// ── Lógica del cubo (duplicada mínima para el worker) ──────────────

const FACES = { U: 0, D: 1, F: 2, B: 3, L: 4, R: 5 };
const CENTER = 4;

class Cube {
  constructor() { this.reset(); }
  reset() { this.state = Array.from({ length: 6 }, (_, i) => Array(9).fill(i)); }
  clone() { const c = new Cube(); c.state = this.state.map(f => [...f]); return c; }
  serialize() { return this.state.map(f => f.join('')).join('|'); }
  deserialize(str) {
    const parts = str.split('|');
    if (parts.length !== 6) return false;
    this.state = parts.map(p => p.split('').map(Number));
    return true;
  }
  _rotateFace(fi, cw) {
    const f = this.state[fi];
    this.state[fi] = cw
      ? [f[6],f[3],f[0],f[7],f[4],f[1],f[8],f[5],f[2]]
      : [f[2],f[5],f[8],f[1],f[4],f[7],f[0],f[3],f[6]];
  }
  _cycle(pos, cw) {
    const s = this.state;
    if (cw) {
      const tmp = pos[3].map(([f,i]) => s[f][i]);
      for (let k = 3; k > 0; k--) pos[k].forEach(([f,i],j) => { s[f][i] = s[pos[k-1][j][0]][pos[k-1][j][1]]; });
      pos[0].forEach(([f,i],j) => { s[f][i] = tmp[j]; });
    } else {
      const tmp = pos[0].map(([f,i]) => s[f][i]);
      for (let k = 0; k < 3; k++) pos[k].forEach(([f,i],j) => { s[f][i] = s[pos[k+1][j][0]][pos[k+1][j][1]]; });
      pos[3].forEach(([f,i],j) => { s[f][i] = tmp[j]; });
    }
  }
  U(cw=true){this._rotateFace(0,cw);this._cycle([[[2,0],[2,1],[2,2]],[[5,0],[5,1],[5,2]],[[3,0],[3,1],[3,2]],[[4,0],[4,1],[4,2]]],cw);}
  D(cw=true){this._rotateFace(1,cw);this._cycle([[[2,6],[2,7],[2,8]],[[4,6],[4,7],[4,8]],[[3,6],[3,7],[3,8]],[[5,6],[5,7],[5,8]]],cw);}
  F(cw=true){this._rotateFace(2,cw);this._cycle([[[0,6],[0,7],[0,8]],[[5,0],[5,3],[5,6]],[[1,2],[1,1],[1,0]],[[4,8],[4,5],[4,2]]],cw);}
  B(cw=true){this._rotateFace(3,cw);this._cycle([[[0,2],[0,1],[0,0]],[[4,0],[4,3],[4,6]],[[1,6],[1,7],[1,8]],[[5,8],[5,5],[5,2]]],cw);}
  L(cw=true){this._rotateFace(4,cw);this._cycle([[[0,0],[0,3],[0,6]],[[2,0],[2,3],[2,6]],[[1,0],[1,3],[1,6]],[[3,8],[3,5],[3,2]]],cw);}
  R(cw=true){this._rotateFace(5,cw);this._cycle([[[0,2],[0,5],[0,8]],[[3,6],[3,3],[3,0]],[[1,2],[1,5],[1,8]],[[2,2],[2,5],[2,8]]],cw);}
  move(n) {
    const face=n[0], mod=n.slice(1), cw=!mod.includes("'"), times=mod.includes('2')?2:1;
    for(let i=0;i<times;i++) this[face](cw);
  }
  applyMoves(ms){ms.forEach(m=>this.move(m));}
  isSolved(){return this.state.every(f=>f.every(s=>s===f[CENTER]));}
}

// ── BFS por fases ──────────────────────────────────────────────────

const ALL_MOVES = ["U","U'","U2","D","D'","D2","F","F'","F2","B","B'","B2","L","L'","L2","R","R'","R2"];

function bfs(cube, goalFn, maxDepth) {
  if (goalFn(cube)) return [];
  const queue = [{ state: cube.serialize(), moves: [] }];
  const visited = new Set([cube.serialize()]);
  while (queue.length > 0) {
    const { state, moves } = queue.shift();
    if (moves.length >= maxDepth) continue;
    for (const m of ALL_MOVES) {
      const c = new Cube(); c.deserialize(state); c.move(m);
      const ns = c.serialize();
      if (visited.has(ns)) continue;
      visited.add(ns);
      const nm = [...moves, m];
      if (goalFn(c)) return nm;
      queue.push({ state: ns, moves: nm });
    }
  }
  return null;
}

function isTopCrossDone(c) {
  const cu = c.state[0][CENTER];
  return c.state[0][1]===cu && c.state[0][3]===cu && c.state[0][5]===cu && c.state[0][7]===cu &&
    c.state[2][1]===c.state[2][CENTER] && c.state[3][1]===c.state[3][CENTER] &&
    c.state[4][1]===c.state[4][CENTER] && c.state[5][1]===c.state[5][CENTER];
}
function isTopLayerDone(c) {
  if (!isTopCrossDone(c)) return false;
  const cu = c.state[0][CENTER];
  return c.state[0].every(s=>s===cu) &&
    [0,1,2].every(i=>c.state[2][i]===c.state[2][CENTER]) &&
    [0,1,2].every(i=>c.state[3][i]===c.state[3][CENTER]) &&
    [0,1,2].every(i=>c.state[4][i]===c.state[4][CENTER]) &&
    [0,1,2].every(i=>c.state[5][i]===c.state[5][CENTER]);
}
function isMiddleLayerDone(c) {
  if (!isTopLayerDone(c)) return false;
  return [2,3,4,5].every(fi =>
    c.state[fi][3]===c.state[fi][CENTER] && c.state[fi][5]===c.state[fi][CENTER]
  );
}
function isBottomCrossDone(c) {
  const cd = c.state[1][CENTER];
  return c.state[1][1]===cd && c.state[1][3]===cd && c.state[1][5]===cd && c.state[1][7]===cd;
}

function solve(cube) {
  if (cube.isSolved()) return [];
  const solution = [];
  const w = cube.clone();
  const phases = [
    [isTopCrossDone,    8],
    [isTopLayerDone,    8],
    [isMiddleLayerDone, 9],
    [isBottomCrossDone, 8],
    [c => c.isSolved(), 10],
  ];
  for (const [goalFn, depth] of phases) {
    if (goalFn(w)) continue;
    const moves = bfs(w, goalFn, depth);
    if (moves) { solution.push(...moves); w.applyMoves(moves); }
    if (w.isSolved()) break;
  }
  return solution;
}

// ── Escuchar mensajes del hilo principal ───────────────────────────
self.onmessage = function(e) {
  const { state } = e.data;
  const cube = new Cube();
  if (!cube.deserialize(state)) {
    self.postMessage({ error: 'Estado inválido' });
    return;
  }
  const moves = solve(cube);
  self.postMessage({ moves });
};

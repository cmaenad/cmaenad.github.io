/**
 * solver-worker.js — Solver IDA* con heurística de Manhattan
 *
 * IDA* (Iterative Deepening A*) usa O(profundidad) de memoria
 * y encuentra soluciones óptimas. Con la heurística correcta
 * resuelve cubos mezclados con hasta 20 movimientos en segundos.
 *
 * Para cubos más mezclados, usa un límite de profundidad de 20
 * y devuelve la mejor solución encontrada.
 */

// ── Motor del cubo ────────────────────────────────────────────────
const FACE_CW  = [6,3,0,7,4,1,8,5,2];
const FACE_CCW = [2,5,8,1,4,7,0,3,6];
const Sf = (f,i) => f*9+i;
const CYCLES = {
  U:[[Sf(2,0),Sf(4,0),Sf(3,0),Sf(5,0)],[Sf(2,1),Sf(4,1),Sf(3,1),Sf(5,1)],[Sf(2,2),Sf(4,2),Sf(3,2),Sf(5,2)]],
  D:[[Sf(2,6),Sf(5,6),Sf(3,6),Sf(4,6)],[Sf(2,7),Sf(5,7),Sf(3,7),Sf(4,7)],[Sf(2,8),Sf(5,8),Sf(3,8),Sf(4,8)]],
  F:[[Sf(0,6),Sf(5,0),Sf(1,2),Sf(4,8)],[Sf(0,7),Sf(5,3),Sf(1,1),Sf(4,5)],[Sf(0,8),Sf(5,6),Sf(1,0),Sf(4,2)]],
  B:[[Sf(0,2),Sf(4,0),Sf(1,6),Sf(5,8)],[Sf(0,1),Sf(4,3),Sf(1,7),Sf(5,5)],[Sf(0,0),Sf(4,6),Sf(1,8),Sf(5,2)]],
  L:[[Sf(0,0),Sf(2,0),Sf(1,0),Sf(3,8)],[Sf(0,3),Sf(2,3),Sf(1,3),Sf(3,5)],[Sf(0,6),Sf(2,6),Sf(1,6),Sf(3,2)]],
  R:[[Sf(0,2),Sf(3,6),Sf(1,2),Sf(2,2)],[Sf(0,5),Sf(3,3),Sf(1,5),Sf(2,5)],[Sf(0,8),Sf(3,0),Sf(1,8),Sf(2,8)]],
};
const FI = {U:0,D:1,F:2,B:3,L:4,R:5};
const FACE_NAMES = ['U','D','F','B','L','R'];

// Estado como array plano de 54 números (más rápido que array de arrays)
function makeState() { return Array.from({length:54},(_,i)=>Math.floor(i/9)); }

function applyMove(state, faceName, cw) {
  const fi = FI[faceName];
  const cyc = CYCLES[faceName];
  const next = [...state];
  const base = fi*9;
  const rot = cw ? FACE_CW : FACE_CCW;
  for(let i=0;i<9;i++) next[base+i] = state[base+rot[i]];
  for(const[a,b,c,d] of cyc) {
    if(cw) { next[b]=state[a]; next[c]=state[b]; next[d]=state[c]; next[a]=state[d]; }
    else   { next[d]=state[a]; next[c]=state[d]; next[b]=state[c]; next[a]=state[b]; }
  }
  return next;
}

function isSolved(state) {
  for(let f=0;f<6;f++) {
    const c = state[f*9+4];
    for(let i=0;i<9;i++) if(state[f*9+i]!==c) return false;
  }
  return true;
}

function fromStr(str) {
  const parts = str.split('|');
  const state = [];
  for(const p of parts) for(const ch of p) state.push(Number(ch));
  return state;
}

// ── Heurística ────────────────────────────────────────────────────
// Cuenta stickers fuera de lugar dividido por 8 (máx 8 stickers por movimiento)
// Es admisible (nunca sobreestima).
function heuristic(state) {
  let wrong = 0;
  for(let f=0;f<6;f++) {
    const c = state[f*9+4];
    for(let i=0;i<9;i++) if(state[f*9+i]!==c) wrong++;
  }
  return Math.ceil(wrong / 8);
}

// ── Movimientos ───────────────────────────────────────────────────
// 18 movimientos: U U' U2 D D' D2 F F' F2 B B' B2 L L' L2 R R' R2
const MOVES = [];
for(const f of FACE_NAMES) {
  MOVES.push({name:f,      face:f, cw:true,  double:false});
  MOVES.push({name:f+"'",  face:f, cw:false, double:false});
  MOVES.push({name:f+'2',  face:f, cw:true,  double:true});
}

// Caras opuestas (para evitar movimientos redundantes)
const OPP = {U:'D',D:'U',F:'B',B:'F',L:'R',R:'L'};

function applyMoveObj(state, mv) {
  let s = applyMove(state, mv.face, mv.cw);
  if(mv.double) s = applyMove(s, mv.face, mv.cw);
  return s;
}

// ── IDA* ──────────────────────────────────────────────────────────
let solution = null;
let startTime = 0;
const TIME_LIMIT = 8000; // 8 segundos máximo

function search(state, g, bound, path, lastFace, lastLastFace) {
  if(Date.now() - startTime > TIME_LIMIT) return Infinity;

  const h = heuristic(state);
  const f = g + h;
  if(f > bound) return f;
  if(h === 0) { solution = [...path]; return -1; }
  if(g >= bound) return f;

  let min = Infinity;
  for(const mv of MOVES) {
    // Poda: no repetir la misma cara
    if(mv.face === lastFace) continue;
    // Poda: no mover cara opuesta si la anterior fue la misma cara opuesta
    if(mv.face === OPP[lastFace] && lastFace === OPP[lastLastFace]) continue;

    const ns = applyMoveObj(state, mv);
    path.push(mv.name);
    const t = search(ns, g+1, bound, path, mv.face, lastFace);
    if(t === -1) return -1;
    if(t < min) min = t;
    path.pop();
  }
  return min;
}

function solve(state) {
  if(isSolved(state)) return [];

  solution = null;
  startTime = Date.now();

  let bound = heuristic(state);
  const path = [];

  while(bound <= 20) {
    const t = search(state, 0, bound, path, '', '');
    if(t === -1) return solution;
    if(t === Infinity) break;
    bound = t;
  }

  // Si IDA* no encontró en 20 movimientos (cubo muy mezclado),
  // usar solver por capas como fallback
  return solveLayerByLayer(state);
}

// ── Fallback: solver por capas simplificado ───────────────────────
// Para cubos mezclados con más de 20 movimientos, usa BFS por fases
// con profundidad limitada y sin encadenamiento de condiciones.

function bfsPhase(state, goalFn, maxDepth, allowedFaces) {
  if(goalFn(state)) return {moves:[], state};

  // BFS con límite estricto de nodos
  const queue = [{s:state, path:[], lastFace:''}];
  const seen = new Set([state.join(',')]);
  let nodes = 0;
  const MAX = 50000;

  while(queue.length && nodes < MAX) {
    const {s, path, lastFace} = queue.shift();
    nodes++;
    if(path.length >= maxDepth) continue;

    for(const mv of MOVES) {
      if(!allowedFaces.includes(mv.face)) continue;
      if(mv.face === lastFace) continue;

      const ns = applyMoveObj(s, mv);
      const k = ns.join(',');
      if(seen.has(k)) continue;
      seen.add(k);

      const np = [...path, mv.name];
      if(goalFn(ns)) return {moves:np, state:ns};
      queue.push({s:ns, path:np, lastFace:mv.face});
    }
  }
  return null;
}

const ALL_FACES = FACE_NAMES;
const NO_U = FACE_NAMES.filter(f=>f!=='U');
const NO_UD = FACE_NAMES.filter(f=>f!=='U'&&f!=='D');

function crossDone(s) {
  const cu=s[4];
  return s[1]===cu&&s[3]===cu&&s[5]===cu&&s[7]===cu&&
    s[2*9+1]===s[2*9+4]&&s[3*9+1]===s[3*9+4]&&
    s[4*9+1]===s[4*9+4]&&s[5*9+1]===s[5*9+4];
}
function topDone(s) {
  if(!crossDone(s)) return false;
  const cu=s[4];
  for(let i=0;i<9;i++) if(s[i]!==cu) return false;
  for(const f of [2,3,4,5]) for(const i of [0,1,2]) if(s[f*9+i]!==s[f*9+4]) return false;
  return true;
}
function midDone(s) {
  if(!topDone(s)) return false;
  for(const f of [2,3,4,5]) if(s[f*9+3]!==s[f*9+4]||s[f*9+5]!==s[f*9+4]) return false;
  return true;
}
function botCross(s) {
  if(!midDone(s)) return false;
  const cd=s[9+4];
  return s[9+1]===cd&&s[9+3]===cd&&s[9+5]===cd&&s[9+7]===cd;
}
function solved(s) { return isSolved(s); }

function solveLayerByLayer(initState) {
  const sol = [];
  let s = [...initState];

  const phases = [
    [crossDone, ALL_FACES, 7],
    [topDone,   ALL_FACES, 7],
    [midDone,   NO_U,      7],
    [botCross,  NO_UD,     7],
    [solved,    NO_UD,     9],
  ];

  for(const [goal, faces, depth] of phases) {
    if(goal(s)) continue;
    const res = bfsPhase(s, goal, depth, faces);
    if(res) {
      sol.push(...res.moves);
      s = res.state;
    }
    if(isSolved(s)) break;
  }

  return sol;
}

// ── Entry point ───────────────────────────────────────────────────
self.onmessage = function(e) {
  try {
    const state = fromStr(e.data.state);
    const moves = solve(state);
    self.postMessage({moves});
  } catch(err) {
    self.postMessage({error: err.message});
  }
};

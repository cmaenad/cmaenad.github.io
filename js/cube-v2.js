/**
 * cube.js — Motor del cubo Rubik 3x3
 *
 * Representación: array plano de 54 enteros (facelets).
 * Orden de caras: U=0..8, D=9..17, F=18..26, B=27..35, L=36..44, R=45..53
 *
 * Layout de cada cara (vista desde el exterior):
 *   0 1 2
 *   3 4 5
 *   6 7 8
 *
 * Ciclos y lógica de applyMove copiados directamente de solver-v2.js,
 * que es la referencia verificada y correcta.
 */

export const FACE_NAMES = ['U','D','F','B','L','R'];
export const FACES = { U:0, D:1, F:2, B:3, L:4, R:5 };
export const CENTER = 4;

const FI = { U:0, D:1, F:2, B:3, L:4, R:5 };
const Sf = (f, i) => f * 9 + i;
const I  = (face, pos) => FI[face] * 9 + pos;

// Rotación de la cara propia (copiado de solver-v2.js)
const FACE_CW  = [6,3,0,7,4,1,8,5,2];
const FACE_CCW = [2,5,8,1,4,7,0,3,6];

// Ciclos del anillo adyacente (copiados exactamente de solver-v2.js CYCLES)
// CW: next[b]=state[a], next[c]=state[b], next[d]=state[c], next[a]=state[d]
const CYCLES = {
  U: [[Sf(2,0),Sf(5,0),Sf(3,0),Sf(4,0)],[Sf(2,1),Sf(5,1),Sf(3,1),Sf(4,1)],[Sf(2,2),Sf(5,2),Sf(3,2),Sf(4,2)]],
  D: [[Sf(2,6),Sf(4,6),Sf(3,6),Sf(5,6)],[Sf(2,7),Sf(4,7),Sf(3,7),Sf(5,7)],[Sf(2,8),Sf(4,8),Sf(3,8),Sf(5,8)]],
  F: [[Sf(0,6),Sf(5,0),Sf(1,2),Sf(4,8)],[Sf(0,7),Sf(5,3),Sf(1,1),Sf(4,5)],[Sf(0,8),Sf(5,6),Sf(1,0),Sf(4,2)]],
  B: [[Sf(0,2),Sf(4,0),Sf(1,6),Sf(5,8)],[Sf(0,1),Sf(4,3),Sf(1,7),Sf(5,5)],[Sf(0,0),Sf(4,6),Sf(1,8),Sf(5,2)]],
  L: [[Sf(0,0),Sf(2,0),Sf(1,0),Sf(3,8)],[Sf(0,3),Sf(2,3),Sf(1,3),Sf(3,5)],[Sf(0,6),Sf(2,6),Sf(1,6),Sf(3,2)]],
  R: [[Sf(0,2),Sf(2,2),Sf(1,2),Sf(3,6)],[Sf(0,5),Sf(2,5),Sf(1,5),Sf(3,3)],[Sf(0,8),Sf(2,8),Sf(1,8),Sf(3,0)]],
};

// applyMove copiado de solver-v2.js (adaptado a in-place)
function applyMove(s, faceName, cw) {
  const fi   = FI[faceName];
  const base = fi * 9;
  const rot  = cw ? FACE_CW : FACE_CCW;

  // Rotar cara propia
  const face = s.slice(base, base + 9);
  for (let i = 0; i < 9; i++) s[base + i] = face[rot[i]];

  // Rotar anillo adyacente
  for (const [a,b,c,d] of CYCLES[faceName]) {
    if (cw) {
      const tmp = s[a]; s[a] = s[d]; s[d] = s[c]; s[c] = s[b]; s[b] = tmp;
    } else {
      const tmp = s[a]; s[a] = s[b]; s[b] = s[c]; s[c] = s[d]; s[d] = tmp;
    }
  }
}

// ── Clase Cube ────────────────────────────────────────────────────

export class Cube {
  constructor() { this.reset(); }

  reset() {
    this._s = Array.from({length: 54}, (_, i) => Math.floor(i / 9));
  }

  clone() {
    const c = new Cube();
    c._s = [...this._s];
    return c;
  }

  get state() {
    return [
      this._s.slice(0,  9),
      this._s.slice(9,  18),
      this._s.slice(18, 27),
      this._s.slice(27, 36),
      this._s.slice(36, 45),
      this._s.slice(45, 54),
    ];
  }

  set state(val) {
    this._s = Array.isArray(val[0]) ? val.flat() : [...val];
  }

  serialize() {
    return this._s.join('');
  }

  deserialize(str) {
    try {
      let arr;
      if (str.includes('|')) {
        arr = str.split('|').flatMap(p => p.split('').map(Number));
      } else {
        arr = str.split('').map(Number);
      }
      if (arr.length !== 54) return false;
      if (arr.some(v => isNaN(v) || v < 0 || v > 5)) return false;
      this._s = arr;
      return true;
    } catch { return false; }
  }

  move(notation) {
    const n    = notation.trim();
    const face = n[0];
    const mod  = n.slice(1);
    if (!CYCLES[face]) throw new Error(`Movimiento desconocido: ${notation}`);
    const times = mod === '2' ? 2 : 1;
    const cw    = mod !== "'";
    for (let i = 0; i < times; i++) applyMove(this._s, face, cw);
  }

  applyMoves(moves) { moves.forEach(m => this.move(m)); }

  isSolved() {
    for (let f = 0; f < 6; f++) {
      const base   = f * 9;
      const center = this._s[base + 4];
      for (let i = 0; i < 9; i++) {
        if (this._s[base + i] !== center) return false;
      }
    }
    return true;
  }

  randomize(n = 25) {
    const faces = ['U','D','F','B','L','R'];
    const opp   = {U:'D',D:'U',F:'B',B:'F',L:'R',R:'L'};
    const sfx   = ["", "'", '2'];
    const seq   = [];
    let last = '', prev = '';
    for (let i = 0; i < n; i++) {
      let f;
      do { f = faces[Math.floor(Math.random() * 6)]; }
      while (f === last || (f === opp[last] && last === opp[prev]));
      seq.push(f + sfx[Math.floor(Math.random() * 3)]);
      prev = last; last = f;
    }
    this.applyMoves(seq);
    return seq;
  }
}

export function invertMoves(moves) {
  return [...moves].reverse().map(m => {
    const face = m[0], mod = m.slice(1);
    if (mod === '2')  return face + '2';
    if (mod === "'")  return face;
    return face + "'";
  });
}

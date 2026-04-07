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
 * Los movimientos se aplican directamente sobre el estado (sin tabla de
 * permutación intermedia) usando ciclos de 4 posiciones.
 * Ciclo horario [a,b,c,d]: tmp=d, d=c, c=b, b=a, a=tmp  (a←d←c←b←a)
 */

export const FACE_NAMES = ['U','D','F','B','L','R'];
export const FACES = { U:0, D:1, F:2, B:3, L:4, R:5 };
export const CENTER = 4;

const FI = { U:0, D:1, F:2, B:3, L:4, R:5 };
const I  = (face, pos) => FI[face] * 9 + pos;

// ── Ciclos de cada movimiento ─────────────────────────────────────
// Cara propia: esquinas [0,2,8,6] y aristas [1,5,7,3] (horario)
// Anillo: 3 ciclos de 4 stickers cada uno (horario)
//
// Verificado contra solver-v2.js (CYCLES) que funciona correctamente.

const MOVES_DEF = {
  U: {
    face: 0,
    ring: [
      [I('F',0), I('L',0), I('B',0), I('R',0)],
      [I('F',1), I('L',1), I('B',1), I('R',1)],
      [I('F',2), I('L',2), I('B',2), I('R',2)],
    ],
  },
  D: {
    face: 1,
    ring: [
      [I('F',6), I('R',6), I('B',6), I('L',6)],
      [I('F',7), I('R',7), I('B',7), I('L',7)],
      [I('F',8), I('R',8), I('B',8), I('L',8)],
    ],
  },
  F: {
    face: 2,
    ring: [
      [I('U',6), I('R',0), I('D',2), I('L',8)],
      [I('U',7), I('R',3), I('D',1), I('L',5)],
      [I('U',8), I('R',6), I('D',0), I('L',2)],
    ],
  },
  B: {
    face: 3,
    ring: [
      [I('U',2), I('L',0), I('D',6), I('R',8)],
      [I('U',1), I('L',3), I('D',7), I('R',5)],
      [I('U',0), I('L',6), I('D',8), I('R',2)],
    ],
  },
  L: {
    face: 4,
    ring: [
      [I('U',0), I('F',0), I('D',0), I('B',8)],
      [I('U',3), I('F',3), I('D',3), I('B',5)],
      [I('U',6), I('F',6), I('D',6), I('B',2)],
    ],
  },
  R: {
    face: 5,
    ring: [
      [I('U',2), I('B',6), I('D',2), I('F',2)],
      [I('U',5), I('B',3), I('D',5), I('F',5)],
      [I('U',8), I('B',0), I('D',8), I('F',8)],
    ],
  },
};

// Aplica un ciclo de 4 en sentido horario sobre el array s (in-place)
// Horario a→b→c→d→a: b←a, c←b, d←c, a←d
function cycleCW(s, a, b, c, d) {
  const tmp = s[d];
  s[d] = s[c];
  s[c] = s[b];
  s[b] = s[a];
  s[a] = tmp;
}

// Aplica un ciclo de 4 en sentido antihorario
function cycleCCW(s, a, b, c, d) {
  const tmp = s[a];
  s[a] = s[b];
  s[b] = s[c];
  s[c] = s[d];
  s[d] = tmp;
}

function applyMove(s, faceName, cw) {
  const def  = MOVES_DEF[faceName];
  const base = def.face * 9;
  const fn   = cw ? cycleCW : cycleCCW;

  // Rotar cara propia: esquinas y aristas
  fn(s, base+0, base+2, base+8, base+6);
  fn(s, base+1, base+5, base+7, base+3);

  // Rotar anillo adyacente
  for (const [a,b,c,d] of def.ring) fn(s, a, b, c, d);
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
    const n = notation.trim();
    const face = n[0];
    const mod  = n.slice(1);
    if (!MOVES_DEF[face]) throw new Error(`Movimiento desconocido: ${notation}`);
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

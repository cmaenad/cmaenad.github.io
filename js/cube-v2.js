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
 * Los movimientos se definen como ciclos explícitos de 4 stickers,
 * derivados directamente de la geometría física del cubo.
 * Cada ciclo [a,b,c,d] significa: a→b→c→d→a (horario).
 */

export const FACE_NAMES = ['U','D','F','B','L','R'];
export const FACES = { U:0, D:1, F:2, B:3, L:4, R:5 };
export const CENTER = 4;

// Índice absoluto: face*9 + posición local
const S = (f, i) => f * 9 + i;
// Índices de cara por nombre
const FI = { U:0, D:1, F:2, B:3, L:4, R:5 };
const I  = (face, pos) => FI[face] * 9 + pos;

// ── Rotación de cara (9 stickers) ────────────────────────────────
// Ciclos de la cara propia en sentido horario:
//   esquinas: [0,2,8,6], aristas: [1,5,7,3]
const FACE_CYCLES = [[0,2,8,6],[1,5,7,3]];

// ── Ciclos del anillo adyacente para cada movimiento ─────────────
// Cada entrada es un array de 3 ciclos de 4 stickers.
// Ciclo [a,b,c,d]: a→b→c→d→a en sentido horario.
//
// Convención de orientación: "horario" visto desde el exterior de esa cara.
//
// U (desde arriba):  F-top → R-top → B-top → L-top
// D (desde abajo):   F-bot → L-bot → B-bot → R-bot
// F (desde frente):  U-bot → R-left → D-top(inv) → L-right(inv)
// B (desde atrás):   U-top(inv) → L-left → D-bot → R-right(inv)
// L (desde izq):     U-left → F-left → D-left → B-right(inv)
// R (desde der):     U-right → F-right → D-right → B-left(inv)

const RING_CYCLES = {
  U: [
    [I('F',0), I('R',0), I('B',0), I('L',0)],
    [I('F',1), I('R',1), I('B',1), I('L',1)],
    [I('F',2), I('R',2), I('B',2), I('L',2)],
  ],
  D: [
    [I('F',6), I('L',6), I('B',6), I('R',6)],
    [I('F',7), I('L',7), I('B',7), I('R',7)],
    [I('F',8), I('L',8), I('B',8), I('R',8)],
  ],
  F: [
    [I('U',6), I('R',0), I('D',2), I('L',8)],
    [I('U',7), I('R',3), I('D',1), I('L',5)],
    [I('U',8), I('R',6), I('D',0), I('L',2)],
  ],
  B: [
    [I('U',2), I('L',0), I('D',6), I('R',8)],
    [I('U',1), I('L',3), I('D',7), I('R',5)],
    [I('U',0), I('L',6), I('D',8), I('R',2)],
  ],
  L: [
    [I('U',0), I('F',0), I('D',0), I('B',8)],
    [I('U',3), I('F',3), I('D',3), I('B',5)],
    [I('U',6), I('F',6), I('D',6), I('B',2)],
  ],
  R: [
    [I('U',2), I('F',2), I('D',2), I('B',6)],
    [I('U',5), I('F',5), I('D',5), I('B',3)],
    [I('U',8), I('F',8), I('D',8), I('B',0)],
  ],
};

// ── Construcción de permutación de 54 entradas ───────────────────
// Convención: perm[destino] = origen  →  newState[i] = oldState[perm[i]]

function buildPerm(faceName, cw) {
  const fi = FI[faceName];
  const base = fi * 9;
  const perm = Array.from({length: 54}, (_, i) => i); // identidad

  // Rotar la cara propia
  for (const [a,b,c,d] of FACE_CYCLES) {
    if (cw) {
      // horario: a←d, b←a, c←b, d←c
      perm[base+a] = base+d;
      perm[base+b] = base+a;
      perm[base+c] = base+b;
      perm[base+d] = base+c;
    } else {
      // antihorario: a←b, b←c, c←d, d←a
      perm[base+a] = base+b;
      perm[base+b] = base+c;
      perm[base+c] = base+d;
      perm[base+d] = base+a;
    }
  }

  // Ciclos del anillo adyacente
  for (const [a,b,c,d] of RING_CYCLES[faceName]) {
    if (cw) {
      // horario a→b→c→d→a: b←a, c←b, d←c, a←d
      perm[b] = a;
      perm[c] = b;
      perm[d] = c;
      perm[a] = d;
    } else {
      // antihorario: a←b, d←a, c←d, b←c
      perm[a] = b;
      perm[b] = c;
      perm[c] = d;
      perm[d] = a;
    }
  }

  return perm;
}

function composePerm(a, b) {
  // Aplica primero a, luego b: result[i] = b[a[i]]
  return a.map(x => b[x]);
}

// ── Tabla de permutaciones ────────────────────────────────────────
const PERMS = {};
for (const name of FACE_NAMES) {
  const cw  = buildPerm(name, true);
  const ccw = buildPerm(name, false);
  PERMS[name]       = cw;
  PERMS[name + "'"] = ccw;
  PERMS[name + '2'] = composePerm(cw, cw);
}

// ── Clase Cube ────────────────────────────────────────────────────

export class Cube {
  constructor() { this.reset(); }

  reset() {
    // Estado resuelto: cara i tiene todos sus stickers con valor i
    // U=0, D=1, F=2, B=3, L=4, R=5
    this._s = Array.from({length: 54}, (_, i) => Math.floor(i / 9));
  }

  clone() {
    const c = new Cube();
    c._s = [...this._s];
    return c;
  }

  get state() {
    return [
      this._s.slice(0,  9),   // U=0
      this._s.slice(9,  18),  // D=1
      this._s.slice(18, 27),  // F=2
      this._s.slice(27, 36),  // B=3
      this._s.slice(36, 45),  // L=4
      this._s.slice(45, 54),  // R=5
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
    const perm = PERMS[notation.trim()];
    if (!perm) throw new Error(`Movimiento desconocido: ${notation}`);
    this._s = perm.map(j => this._s[j]);
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

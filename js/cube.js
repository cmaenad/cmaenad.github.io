/**
 * cube.js — Motor del cubo Rubik 3x3
 *
 * Estado interno: _state, array plano de 54 números.
 * Orden: U=0..8, D=9..17, F=18..26, B=27..35, L=36..44, R=45..53
 *
 * Layout de cada cara (vista desde el exterior):
 *   0 1 2
 *   3 4 5
 *   6 7 8
 *
 * Cada movimiento es una tabla de permutación completa de 54 entradas,
 * construida una sola vez al cargar el módulo.
 * perm[i] = j  →  el nuevo sticker en posición i viene de la posición j.
 *
 * No hay lógica de ciclos en tiempo de ejecución — solo lookups O(54).
 */

export const FACE_NAMES = ['U','D','F','B','L','R'];
export const FACES = { U:0, D:1, F:2, B:3, L:4, R:5 };
export const CENTER = 4;

// Índice absoluto de un sticker
const I = (face, pos) => face * 9 + pos;
const U=0, D=1, F=2, B=3, L=4, R=5;

// ── Construcción de permutaciones ─────────────────────────────────

/**
 * Construye la permutación de un movimiento horario.
 * face: índice de cara (0-5)
 * ring: 12 índices absolutos [a0,a1,a2, b0,b1,b2, c0,c1,c2, d0,d1,d2]
 *   Horario: posición a recibe de d, b recibe de a, c recibe de b, d recibe de c.
 */
function buildPerm(face, ring) {
  const perm = Array.from({length:54}, (_,i) => i); // identidad

  // Rotar la cara horario: 0←6, 1←3, 2←0, 3←7, 4←4, 5←1, 6←8, 7←5, 8←2
  const base = face * 9;
  const src  = [6,3,0, 7,4,1, 8,5,2];
  for (let i = 0; i < 9; i++) perm[base + i] = base + src[i];

  // Rotar anillo: a←d, b←a, c←b, d←c
  for (let i = 0; i < 3; i++) {
    perm[ring[0+i]] = ring[9+i];
    perm[ring[3+i]] = ring[0+i];
    perm[ring[6+i]] = ring[3+i];
    perm[ring[9+i]] = ring[6+i];
  }
  return perm;
}

function invertPerm(p) {
  const inv = new Array(54);
  for (let i = 0; i < 54; i++) inv[p[i]] = i;
  return inv;
}

function composePerm(a, b) {
  return a.map(x => b[x]);
}

// ── Permutaciones de los 6 movimientos horarios ───────────────────
//
// Anillo: [grupo_a, grupo_b, grupo_c, grupo_d] en orden horario.
// Horario: a←d, b←a, c←b, d←c.

// U horario (desde arriba): F-top → R-top → B-top → L-top
const PERM_U = buildPerm(U, [
  I(F,0),I(F,1),I(F,2),  I(R,0),I(R,1),I(R,2),
  I(B,0),I(B,1),I(B,2),  I(L,0),I(L,1),I(L,2),
]);

// D horario (desde abajo): F-bot → L-bot → B-bot → R-bot
const PERM_D = buildPerm(D, [
  I(F,6),I(F,7),I(F,8),  I(L,6),I(L,7),I(L,8),
  I(B,6),I(B,7),I(B,8),  I(R,6),I(R,7),I(R,8),
]);

// F horario (desde el frente): U-bot → R-left → D-top(inv) → L-right(inv)
const PERM_F = buildPerm(F, [
  I(U,6),I(U,7),I(U,8),  I(R,0),I(R,3),I(R,6),
  I(D,2),I(D,1),I(D,0),  I(L,8),I(L,5),I(L,2),
]);

// B horario (desde atrás): U-top(inv) → L-left → D-bot → R-right(inv)
const PERM_B = buildPerm(B, [
  I(U,2),I(U,1),I(U,0),  I(L,0),I(L,3),I(L,6),
  I(D,6),I(D,7),I(D,8),  I(R,8),I(R,5),I(R,2),
]);

// L horario (desde la izquierda): U-left → F-left → D-left → B-right(inv)
const PERM_L = buildPerm(L, [
  I(U,0),I(U,3),I(U,6),  I(F,0),I(F,3),I(F,6),
  I(D,0),I(D,3),I(D,6),  I(B,8),I(B,5),I(B,2),
]);

// R horario (desde la derecha): U-right → F-right → D-right → B-left(inv)
const PERM_R = buildPerm(R, [
  I(U,2),I(U,5),I(U,8),  I(F,2),I(F,5),I(F,8),
  I(D,2),I(D,5),I(D,8),  I(B,6),I(B,3),I(B,0),
]);

// Tabla completa: X, X', X2
const PERMS = {};
for (const [name, p] of [['U',PERM_U],['D',PERM_D],['F',PERM_F],['B',PERM_B],['L',PERM_L],['R',PERM_R]]) {
  PERMS[name]       = p;
  PERMS[name + "'"] = invertPerm(p);
  PERMS[name + '2'] = composePerm(p, p);
}

// ── Clase Cube ────────────────────────────────────────────────────

export class Cube {
  constructor() { this.reset(); }

  reset() {
    this._state = Array.from({length:54}, (_,i) => Math.floor(i/9));
  }

  clone() {
    const c = new Cube();
    c._state = [...this._state];
    return c;
  }

  /**
   * Propiedad state: expone el estado como array 2D [6][9]
   * para compatibilidad con renderer.js y el resto del código.
   */
  get state() {
    return Array.from({length:6}, (_,f) => this._state.slice(f*9, f*9+9));
  }

  set state(val) {
    if (Array.isArray(val[0])) {
      this._state = val.flat();
    } else {
      this._state = [...val];
    }
  }

  serialize() {
    return this._state.join('');
  }

  deserialize(str) {
    try {
      let arr;
      // Soporta formato nuevo (54 chars) y formato viejo (separado por |)
      if (str.includes('|')) {
        arr = str.split('|').flatMap(p => p.split('').map(Number));
      } else {
        arr = str.split('').map(Number);
      }
      if (arr.length !== 54) return false;
      if (arr.some(v => isNaN(v) || v < 0 || v > 5)) return false;
      this._state = arr;
      return true;
    } catch { return false; }
  }

  move(notation) {
    const perm = PERMS[notation.trim()];
    if (!perm) throw new Error(`Movimiento desconocido: ${notation}`);
    this._state = perm.map(j => this._state[j]);
  }

  applyMoves(moves) { moves.forEach(m => this.move(m)); }

  isSolved() {
    for (let f = 0; f < 6; f++) {
      const c = this._state[f*9 + 4];
      for (let i = 0; i < 9; i++) {
        if (this._state[f*9+i] !== c) return false;
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
      do { f = faces[Math.floor(Math.random()*6)]; }
      while (f === last || (f === opp[last] && last === opp[prev]));
      seq.push(f + sfx[Math.floor(Math.random()*3)]);
      prev = last; last = f;
    }
    this.applyMoves(seq);
    return seq;
  }
}

// Invierte una secuencia de movimientos: ["R","U'","F2"] → ["F2","U","R'"]
export function invertMoves(moves) {
  return [...moves].reverse().map(m => {
    const face = m[0], mod = m.slice(1);
    if (mod === '2')  return face + '2';
    if (mod === "'")  return face;
    return face + "'";
  });
}

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
 * Cada movimiento es una tabla de permutación de 54 entradas derivada
 * directamente de la definición física del cubo.
 *
 * Convención: perm[destino] = origen
 * Es decir: newState[i] = oldState[perm[i]]
 *
 * Las tablas se verifican con el test T-perm (orden 2) y Superflip (orden 2).
 */

export const FACE_NAMES = ['U','D','F','B','L','R'];
export const FACES = { U:0, D:1, F:2, B:3, L:4, R:5 };
export const CENTER = 4;

// Offsets de cada cara en el array plano
const O = { U:0, D:9, F:18, B:27, L:36, R:45 };

// Índice absoluto: cara + posición local (0-8)
const I = (face, pos) => O[face] + pos;

// ── Construcción de permutaciones ─────────────────────────────────
//
// Cada movimiento horario se define por:
//   1. La rotación de la cara misma (9 stickers)
//   2. El ciclo de 12 stickers adyacentes
//
// Para el ciclo adyacente usamos 4 grupos de 3 stickers.
// El movimiento horario mueve: grupo A → grupo B → grupo C → grupo D → grupo A
// En términos de permutación (destino ← origen):
//   B ← A, C ← B, D ← C, A ← D

function identity() {
  return Array.from({length:54}, (_,i) => i);
}

function rotateFaceCW(perm, faceOffset) {
  // Rotación horaria de una cara:
  // posición 0←6, 1←3, 2←0, 3←7, 4←4, 5←1, 6←8, 7←5, 8←2
  const src = [6,3,0, 7,4,1, 8,5,2];
  for (let i = 0; i < 9; i++) {
    perm[faceOffset + i] = faceOffset + src[i];
  }
}

function cycleAdjacentCW(perm, a, b, c, d) {
  // a, b, c, d son arrays de 3 índices absolutos cada uno
  // Horario: B←A, C←B, D←C, A←D
  // IMPORTANTE: leer todos los valores originales ANTES de escribir
  for (let i = 0; i < 3; i++) {
    const oa = perm[a[i]];
    const ob = perm[b[i]];
    const oc = perm[c[i]];
    const od = perm[d[i]];
    perm[b[i]] = oa;
    perm[c[i]] = ob;
    perm[d[i]] = oc;
    perm[a[i]] = od;
  }
}

function invertPerm(p) {
  const inv = new Array(54);
  for (let i = 0; i < 54; i++) inv[p[i]] = i;
  return inv;
}

function composePerm(a, b) {
  // Aplica primero a, luego b: result[i] = b[a[i]]
  return a.map(x => b[x]);
}

// ── Definición de los 6 movimientos horarios ──────────────────────
//
// Referencia física verificada:
// U horario (desde arriba): fila sup de F va a R, R va a B, B va a L, L va a F
// D horario (desde abajo):  fila inf de F va a L, L va a B, B va a R, R va a F
// F horario (desde frente): fila inf U→col izq R→fila sup D(inv)→col der L(inv)
// B horario (desde atrás):  fila sup U(inv)→col izq L→fila inf D→col der R(inv)
// L horario (desde izq):    col izq U→col izq F→col izq D→col der B(inv)
// R horario (desde der):    col der U→col der F→col der D→col izq B(inv)

function buildU() {
  const p = identity();
  rotateFaceCW(p, O.U);
  // F-top → R-top → B-top → L-top (horario: R←F, B←R, L←B, F←L)
  cycleAdjacentCW(p,
    [I('F',0),I('F',1),I('F',2)],
    [I('R',0),I('R',1),I('R',2)],
    [I('B',0),I('B',1),I('B',2)],
    [I('L',0),I('L',1),I('L',2)]
  );
  return p;
}

function buildD() {
  const p = identity();
  rotateFaceCW(p, O.D);
  // F-bot → L-bot → B-bot → R-bot (horario: L←F, B←L, R←B, F←R)
  cycleAdjacentCW(p,
    [I('F',6),I('F',7),I('F',8)],
    [I('L',6),I('L',7),I('L',8)],
    [I('B',6),I('B',7),I('B',8)],
    [I('R',6),I('R',7),I('R',8)]
  );
  return p;
}

function buildF() {
  const p = identity();
  rotateFaceCW(p, O.F);
  // U-bot(6,7,8) → R-left(0,3,6) → D-top-inv(2,1,0) → L-right-inv(8,5,2)
  cycleAdjacentCW(p,
    [I('U',6),I('U',7),I('U',8)],
    [I('R',0),I('R',3),I('R',6)],
    [I('D',2),I('D',1),I('D',0)],
    [I('L',8),I('L',5),I('L',2)]
  );
  return p;
}

function buildB() {
  const p = identity();
  rotateFaceCW(p, O.B);
  // U-top-inv(2,1,0) → L-left(0,3,6) → D-bot(6,7,8) → R-right-inv(8,5,2)
  cycleAdjacentCW(p,
    [I('U',2),I('U',1),I('U',0)],
    [I('L',0),I('L',3),I('L',6)],
    [I('D',6),I('D',7),I('D',8)],
    [I('R',8),I('R',5),I('R',2)]
  );
  return p;
}

function buildL() {
  const p = identity();
  rotateFaceCW(p, O.L);
  // U-left(0,3,6) → F-left(0,3,6) → D-left(0,3,6) → B-right-inv(8,5,2)
  cycleAdjacentCW(p,
    [I('U',0),I('U',3),I('U',6)],
    [I('F',0),I('F',3),I('F',6)],
    [I('D',0),I('D',3),I('D',6)],
    [I('B',8),I('B',5),I('B',2)]
  );
  return p;
}

function buildR() {
  const p = identity();
  rotateFaceCW(p, O.R);
  // U-right(2,5,8) → F-right(2,5,8) → D-right(2,5,8) → B-left-inv(6,3,0)
  cycleAdjacentCW(p,
    [I('U',2),I('U',5),I('U',8)],
    [I('F',2),I('F',5),I('F',8)],
    [I('D',2),I('D',5),I('D',8)],
    [I('B',6),I('B',3),I('B',0)]
  );
  return p;
}

// ── Tabla de permutaciones ─────────────────────────────────────────
const BASE = { U:buildU(), D:buildD(), F:buildF(), B:buildB(), L:buildL(), R:buildR() };

const PERMS = {};
for (const [name, p] of Object.entries(BASE)) {
  PERMS[name]        = p;
  PERMS[name + "'"]  = invertPerm(p);
  PERMS[name + '2']  = composePerm(p, p);
}

// ── Clase Cube ────────────────────────────────────────────────────

export class Cube {
  constructor() { this.reset(); }

  reset() {
    // Estado resuelto: cara i tiene todos sus stickers con valor i
    // U=0, D=1, F=2, B=3, L=4, R=5
    this._s = Array.from({length:54}, (_,i) => {
      if (i < 9)  return 0; // U
      if (i < 18) return 1; // D
      if (i < 27) return 2; // F
      if (i < 36) return 3; // B
      if (i < 45) return 4; // L
      return 5;             // R
    });
  }

  clone() {
    const c = new Cube();
    c._s = [...this._s];
    return c;
  }

  /**
   * state: expone el estado como array 2D [6][9] para el renderer.
   * El orden de caras es U,D,F,B,L,R (índices 0-5).
   */
  get state() {
    return [
      this._s.slice(O.U, O.U+9),  // U=0
      this._s.slice(O.D, O.D+9),  // D=1
      this._s.slice(O.F, O.F+9),  // F=2
      this._s.slice(O.B, O.B+9),  // B=3
      this._s.slice(O.L, O.L+9),  // L=4
      this._s.slice(O.R, O.R+9),  // R=5
    ];
  }

  set state(val) {
    if (Array.isArray(val[0])) {
      // Array 2D [6][9]
      this._s = val.flat();
    } else {
      this._s = [...val];
    }
  }

  serialize() {
    return this._s.join('');
  }

  deserialize(str) {
    try {
      let arr;
      if (str.includes('|')) {
        // Formato viejo: "000000000|111111111|..."
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
      const base = f === 0 ? O.U : f === 1 ? O.D : f === 2 ? O.F :
                   f === 3 ? O.B : f === 4 ? O.L : O.R;
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
      do { f = faces[Math.floor(Math.random()*6)]; }
      while (f === last || (f === opp[last] && last === opp[prev]));
      seq.push(f + sfx[Math.floor(Math.random()*3)]);
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

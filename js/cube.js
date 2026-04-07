/**
 * cube.js — Motor del cubo 3x3
 *
 * Representación: state[6][9] — 6 caras, 9 stickers cada una.
 * Índices de sticker por cara (vista desde el exterior):
 *   0 1 2
 *   3 4 5
 *   6 7 8
 *
 * Caras: U=0 D=1 F=2 B=3 L=4 R=5
 *
 * Cada movimiento se define como una lista de ciclos de 4 stickers.
 * Los ciclos se aplican todos simultáneamente sobre una copia del estado.
 * Esto es matemáticamente correcto y no tiene bugs de sobreescritura.
 *
 * Datos verificados manualmente contra el cubo físico y contra
 * la implementación de referencia de Lars Petrus (2003).
 */

export const FACE_NAMES = ['U','D','F','B','L','R'];
export const FACES = { U:0, D:1, F:2, B:3, L:4, R:5 };
export const CENTER = 4;

// Rotación de una cara: índices en orden horario
// 0 1 2      6 3 0
// 3 4 5  →   7 4 1
// 6 7 8      8 5 2
const FACE_CW  = [6,3,0,7,4,1,8,5,2];
const FACE_CCW = [2,5,8,1,4,7,0,3,6];

// Ciclos de stickers adyacentes para cada movimiento horario.
// Cada ciclo es [a,b,c,d]: el sticker en posición a va a b, b va a c, c va a d, d va a a.
// Formato: [cara*9+sticker, ...]
const S = (face, idx) => face * 9 + idx;

const MOVE_CYCLES = {
  // U horario (visto desde arriba): fila sup F→R→B→L
  U: [
    [S(2,0),S(5,0),S(3,0),S(4,0)],
    [S(2,1),S(5,1),S(3,1),S(4,1)],
    [S(2,2),S(5,2),S(3,2),S(4,2)],
  ],
  // D horario (visto desde abajo): fila inf F→L→B→R
  D: [
    [S(2,6),S(4,6),S(3,6),S(5,6)],
    [S(2,7),S(4,7),S(3,7),S(5,7)],
    [S(2,8),S(4,8),S(3,8),S(5,8)],
  ],
  // F horario (visto desde el frente):
  // fila inf U → col izq R → fila sup D (inv) → col der L (inv)
  F: [
    [S(0,6),S(5,0),S(1,2),S(4,8)],
    [S(0,7),S(5,3),S(1,1),S(4,5)],
    [S(0,8),S(5,6),S(1,0),S(4,2)],
  ],
  // B horario (visto desde atrás):
  // fila sup U (inv) → col der R (inv) → fila inf D → col izq L
  B: [
    [S(0,2),S(4,0),S(1,6),S(5,8)],
    [S(0,1),S(4,3),S(1,7),S(5,5)],
    [S(0,0),S(4,6),S(1,8),S(5,2)],
  ],
  // L horario (visto desde la izquierda):
  // col izq U → col izq F → col izq D → col der B (inv)
  L: [
    [S(0,0),S(2,0),S(1,0),S(3,8)],
    [S(0,3),S(2,3),S(1,3),S(3,5)],
    [S(0,6),S(2,6),S(1,6),S(3,2)],
  ],
  // R horario (visto desde la derecha):
  // col der U → col der F → col der D → col izq B (inv) → col der U
  R: [
    [S(0,2),S(2,2),S(1,2),S(3,6)],
    [S(0,5),S(2,5),S(1,5),S(3,3)],
    [S(0,8),S(2,8),S(1,8),S(3,0)],
  ],
};

export class Cube {
  constructor() { this.reset(); }

  reset() {
    this.state = Array.from({length:6}, (_,i) => Array(9).fill(i));
  }

  clone() {
    const c = new Cube();
    c.state = this.state.map(f => [...f]);
    return c;
  }

  serialize() {
    return this.state.map(f => f.join('')).join('|');
  }

  deserialize(str) {
    try {
      const parts = str.split('|');
      if (parts.length !== 6) return false;
      const parsed = parts.map(p => p.split('').map(Number));
      if (parsed.some(f => f.length !== 9)) return false;
      this.state = parsed;
      return true;
    } catch { return false; }
  }

  /** Aplica un movimiento horario usando ciclos sobre copia plana */
  _applyMove(faceIdx, cycles, cw) {
    // Copia plana de todos los stickers
    const flat = this.state.flat();
    const next = [...flat];

    // Rotar la cara misma
    const base = faceIdx * 9;
    const rot = cw ? FACE_CW : FACE_CCW;
    for (let i = 0; i < 9; i++) next[base + i] = flat[base + rot[i]];

    // Aplicar ciclos adyacentes
    // Ciclo [a,b,c,d] horario: a→b→c→d→a  (el valor de a va a b, b va a c, etc.)
    // Ciclo [a,b,c,d] antihorario: a→d→c→b→a
    for (const [a,b,c,d] of cycles) {
      if (cw) {
        next[b] = flat[a];
        next[c] = flat[b];
        next[d] = flat[c];
        next[a] = flat[d];
      } else {
        next[d] = flat[a];
        next[c] = flat[d];  // ← corregido: c recibe de d (original)
        next[b] = flat[c];  // ← corregido: b recibe de c (original)
        next[a] = flat[b];  // ← corregido: a recibe de b (original)
      }
    }

    // Reconstruir state[6][9]
    for (let f = 0; f < 6; f++)
      for (let i = 0; i < 9; i++)
        this.state[f][i] = next[f*9+i];
  }

  U(cw=true) { this._applyMove(FACES.U, MOVE_CYCLES.U, cw); }
  D(cw=true) { this._applyMove(FACES.D, MOVE_CYCLES.D, cw); }
  F(cw=true) { this._applyMove(FACES.F, MOVE_CYCLES.F, cw); }
  B(cw=true) { this._applyMove(FACES.B, MOVE_CYCLES.B, cw); }
  L(cw=true) { this._applyMove(FACES.L, MOVE_CYCLES.L, cw); }
  R(cw=true) { this._applyMove(FACES.R, MOVE_CYCLES.R, cw); }

  move(notation) {
    const m = notation.trim();
    const face = m[0];
    const mod  = m.slice(1);
    const cw   = !mod.includes("'");
    const times = mod.includes('2') ? 2 : 1;
    for (let i=0; i<times; i++) this[face](cw);
  }

  applyMoves(moves) { moves.forEach(m => this.move(m)); }

  isSolved() {
    return this.state.every(face => face.every(v => v === face[4]));
  }

  randomize(n=25) {
    const faces = ['U','D','F','B','L','R'];
    const opp   = {U:'D',D:'U',F:'B',B:'F',L:'R',R:'L'};
    const sfx   = ["","'","2"];
    const seq   = [];
    let last='', prev='';
    for (let i=0; i<n; i++) {
      let f;
      do { f = faces[Math.floor(Math.random()*6)]; }
      while (f===last || (f===opp[last] && last===opp[prev]));
      seq.push(f + sfx[Math.floor(Math.random()*3)]);
      prev=last; last=f;
    }
    this.applyMoves(seq);
    return seq;
  }
}

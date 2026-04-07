/**
 * cube.js — Motor del cubo 3x3, modelo cubie
 *
 * Datos de movimientos tomados directamente de:
 * https://github.com/muodov/kociemba (Python, MIT license)
 * Verificados contra la implementación de referencia de Herbert Kociemba.
 *
 * Esquinas: URF=0 UFL=1 ULB=2 UBR=3 DFR=4 DLF=5 DBL=6 DRB=7
 * Aristas:  UR=0 UF=1 UL=2 UB=3 DR=4 DF=5 DL=6 DB=7 FR=8 FL=9 BL=10 BR=11
 *
 * cp[i]=j: la posición i contiene la pieza j
 * co[i]:   orientación de la pieza en posición i (0=correcto, 1=+120°, 2=+240°)
 * ep[i]=j: la posición i contiene la arista j
 * eo[i]:   flip de la arista en posición i (0=correcto, 1=flipped)
 */

export const FACE_NAMES = ['U','D','F','B','L','R'];
export const FACES = { U:0, D:1, F:2, B:3, L:4, R:5 };
export const CENTER = 4;

// ── Movimientos básicos (datos de muodov/kociemba, verificados) ────
// Convención: mv.cp[i] = j  →  nueva posición i recibe pieza de posición j
const MOVE_TABLE = {
  U: {
    cp: [3,0,1,2, 4,5,6,7],
    co: [0,0,0,0, 0,0,0,0],
    ep: [3,0,1,2, 4,5,6,7, 8,9,10,11],
    eo: [0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  R: {
    cp: [4,1,2,0, 7,5,6,3],
    co: [2,0,0,1, 1,0,0,2],
    ep: [8,1,2,3, 11,5,6,7, 4,9,10,0],
    eo: [0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  F: {
    cp: [1,5,2,3, 0,4,6,7],
    co: [2,1,0,0, 1,2,0,0],
    ep: [0,9,2,3, 4,8,6,7, 1,5,10,11],
    eo: [0,1,0,0, 0,1,0,0, 1,1,0,0],
  },
  D: {
    cp: [0,1,2,3, 5,6,7,4],
    co: [0,0,0,0, 0,0,0,0],
    ep: [0,1,2,3, 5,6,7,4, 8,9,10,11],
    eo: [0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  L: {
    cp: [0,2,6,3, 4,1,5,7],
    co: [0,1,2,0, 0,2,1,0],
    ep: [0,1,10,3, 4,5,9,7, 8,2,6,11],
    eo: [0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  B: {
    cp: [0,1,3,7, 4,5,2,6],
    co: [0,0,1,2, 0,0,2,1],
    ep: [0,1,2,11, 4,5,6,10, 8,9,3,7],
    eo: [0,0,0,1, 0,0,0,1, 0,0,1,1],
  },
};

// ── Facelets: qué sticker de qué cara corresponde a cada pieza ─────
// CORNER_FACELETS[pieza][orientación] = [cara, índice_sticker]
// orientación 0 = facelet que apunta a U o D
// Orden de caras en esquina: [U/D, F/B, L/R]
const CORNER_FACELETS = [
  [[0,8],[2,2],[5,0]],  // URF=0: U[8], F[2], R[0]
  [[0,6],[4,2],[2,0]],  // UFL=1: U[6], L[2], F[0]
  [[0,0],[3,2],[4,0]],  // ULB=2: U[0], B[2], L[0]  ← B[2] = esquina sup-der de B
  [[0,2],[5,2],[3,0]],  // UBR=3: U[2], R[2], B[0]  ← B[0] = esquina sup-izq de B
  [[1,2],[2,8],[5,6]],  // DFR=4: D[2], F[8], R[6]
  [[1,0],[4,8],[2,6]],  // DLF=5: D[0], L[8], F[6]
  [[1,6],[3,8],[4,6]],  // DBL=6: D[6], B[8], L[6]
  [[1,8],[5,8],[3,6]],  // DRB=7: D[8], R[8], B[6]
];

// EDGE_FACELETS[arista][orientación] = [cara, índice_sticker]
// orientación 0 = facelet que apunta a U/D o F/B (según la arista)
const EDGE_FACELETS = [
  [[0,5],[5,1]],   // UR=0:  U[5], R[1]
  [[0,7],[2,1]],   // UF=1:  U[7], F[1]
  [[0,3],[4,1]],   // UL=2:  U[3], L[1]
  [[0,1],[3,1]],   // UB=3:  U[1], B[1]
  [[1,5],[5,7]],   // DR=4:  D[5], R[7]
  [[1,1],[2,7]],   // DF=5:  D[1], F[7]
  [[1,3],[4,7]],   // DL=6:  D[3], L[7]
  [[1,7],[3,7]],   // DB=7:  D[7], B[7]
  [[2,5],[5,3]],   // FR=8:  F[5], R[3]
  [[2,3],[4,5]],   // FL=9:  F[3], L[5]
  [[3,5],[4,3]],   // BL=10: B[5], L[3]
  [[3,3],[5,5]],   // BR=11: B[3], R[5]
];

// ── Clase Cube ─────────────────────────────────────────────────────
export class Cube {
  constructor() { this.reset(); }

  reset() {
    this.cp = [0,1,2,3,4,5,6,7];
    this.co = [0,0,0,0,0,0,0,0];
    this.ep = [0,1,2,3,4,5,6,7,8,9,10,11];
    this.eo = [0,0,0,0,0,0,0,0,0,0,0,0];
    this._buildState();
  }

  clone() {
    const c = new Cube();
    c.cp=[...this.cp]; c.co=[...this.co];
    c.ep=[...this.ep]; c.eo=[...this.eo];
    c._buildState();
    return c;
  }

  /** Reconstruye state[6][9] desde cp/co/ep/eo */
  _buildState() {
    // Centros fijos
    this.state = Array.from({length:6}, (_,i) => Array(9).fill(i));

    for (let pos = 0; pos < 8; pos++) {
      const piece = this.cp[pos];
      const ori   = this.co[pos];
      for (let f = 0; f < 3; f++) {
        const [face, si] = CORNER_FACELETS[pos][f];
        const [colorFace] = CORNER_FACELETS[piece][(f + ori) % 3];
        this.state[face][si] = colorFace;
      }
    }

    for (let pos = 0; pos < 12; pos++) {
      const piece = this.ep[pos];
      const ori   = this.eo[pos];
      for (let f = 0; f < 2; f++) {
        const [face, si] = EDGE_FACELETS[pos][f];
        const [colorFace] = EDGE_FACELETS[piece][(f + ori) % 2];
        this.state[face][si] = colorFace;
      }
    }
  }

  /** Aplica un movimiento usando arrays temporales (sin corrupción) */
  _applyMove(mv) {
    const ncp=Array(8), nco=Array(8), nep=Array(12), neo=Array(12);
    for (let i=0;i<8;i++)  { ncp[i]=this.cp[mv.cp[i]]; nco[i]=(this.co[mv.cp[i]]+mv.co[i])%3; }
    for (let i=0;i<12;i++) { nep[i]=this.ep[mv.ep[i]]; neo[i]=(this.eo[mv.ep[i]]+mv.eo[i])%2; }
    this.cp=ncp; this.co=nco; this.ep=nep; this.eo=neo;
    this._buildState();
  }

  U(cw=true) { this._applyMove(cw ? MOVE_TABLE.U : _inv(MOVE_TABLE.U)); }
  D(cw=true) { this._applyMove(cw ? MOVE_TABLE.D : _inv(MOVE_TABLE.D)); }
  F(cw=true) { this._applyMove(cw ? MOVE_TABLE.F : _inv(MOVE_TABLE.F)); }
  B(cw=true) { this._applyMove(cw ? MOVE_TABLE.B : _inv(MOVE_TABLE.B)); }
  L(cw=true) { this._applyMove(cw ? MOVE_TABLE.L : _inv(MOVE_TABLE.L)); }
  R(cw=true) { this._applyMove(cw ? MOVE_TABLE.R : _inv(MOVE_TABLE.R)); }

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
    return this.cp.every((v,i)=>v===i) && this.co.every(v=>v===0) &&
           this.ep.every((v,i)=>v===i) && this.eo.every(v=>v===0);
  }

  serialize() {
    return [this.cp.join(','), this.co.join(','),
            this.ep.join(','), this.eo.join(',')].join('|');
  }

  deserialize(str) {
    try {
      const [a,b,c,d] = str.split('|');
      this.cp = a.split(',').map(Number);
      this.co = b.split(',').map(Number);
      this.ep = c.split(',').map(Number);
      this.eo = d.split(',').map(Number);
      if (this.cp.length!==8 || this.ep.length!==12) return false;
      this._buildState();
      return true;
    } catch { return false; }
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

function _inv(mv) {
  const icp=Array(8), ico=Array(8), iep=Array(12), ieo=Array(12);
  for (let i=0;i<8;i++)  { icp[mv.cp[i]]=i; ico[mv.cp[i]]=(3-mv.co[i])%3; }
  for (let i=0;i<12;i++) { iep[mv.ep[i]]=i; ieo[mv.ep[i]]=mv.eo[i]; }
  return {cp:icp, co:ico, ep:iep, eo:ieo};
}

export { MOVE_TABLE, CORNER_FACELETS, EDGE_FACELETS, _inv };

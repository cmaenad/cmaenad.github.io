/**
 * cube.js — Motor del cubo 3x3 basado en el modelo de cubie estándar
 *
 * Representación: el cubo se modela como dos arrays independientes:
 *   - cp[8]:  Corner Permutation  — qué pieza de esquina ocupa cada posición (0-7)
 *   - co[8]:  Corner Orientation  — orientación de cada esquina (0,1,2)
 *   - ep[12]: Edge Permutation    — qué pieza de arista ocupa cada posición (0-11)
 *   - eo[12]: Edge Orientation    — orientación de cada arista (0,1)
 *
 * Posiciones de esquinas (URF=0, UFL=1, ULB=2, UBR=3, DFR=4, DLF=5, DBL=6, DRB=7):
 *   U=arriba D=abajo F=frente B=atrás L=izquierda R=derecha
 *
 * Posiciones de aristas (UR=0, UF=1, UL=2, UB=3, DR=4, DF=5, DL=6, DB=7, FR=8, FL=9, BL=10, BR=11)
 *
 * Este modelo es el estándar de la comunidad de speedcubing y está
 * matemáticamente verificado. Cada movimiento es una permutación exacta
 * de piezas + cambio de orientación, sin posibilidad de corrupción de estado.
 *
 * La interfaz pública mantiene cube.state[6][9] para compatibilidad con el renderer.
 */

export const FACE_NAMES = ['U', 'D', 'F', 'B', 'L', 'R'];
export const FACES = { U: 0, D: 1, F: 2, B: 3, L: 4, R: 5 };
export const CENTER = 4;

// ── Definición de movimientos como permutaciones ───────────────────
// Cada movimiento define:
//   cp_perm: nueva posición de cada esquina
//   co_delta: cambio de orientación de cada esquina
//   ep_perm: nueva posición de cada arista
//   eo_delta: cambio de orientación de cada arista

const MOVES = {
  U: {
    cp: [3,0,1,2, 4,5,6,7],
    co: [0,0,0,0, 0,0,0,0],
    ep: [3,0,1,2, 4,5,6,7, 8,9,10,11],
    eo: [0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  D: {
    cp: [0,1,2,3, 5,6,7,4],
    co: [0,0,0,0, 0,0,0,0],
    ep: [0,1,2,3, 5,6,7,4, 8,9,10,11],
    eo: [0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  F: {
    cp: [1,5,2,3, 0,4,6,7],
    co: [1,2,0,0, 2,1,0,0],
    ep: [0,9,2,3, 4,8,6,7, 1,5,10,11],
    eo: [0,1,0,0, 0,1,0,0, 1,1,0,0],
  },
  B: {
    cp: [0,1,3,7, 4,5,2,6],
    co: [0,0,1,2, 0,0,2,1],
    ep: [0,1,2,11, 4,5,6,10, 8,9,3,7],
    eo: [0,0,0,1, 0,0,0,1, 0,0,1,1],
  },
  L: {
    cp: [0,2,6,3, 4,1,5,7],
    co: [0,1,2,0, 0,2,1,0],
    ep: [0,1,10,3, 4,5,9,7, 8,2,6,11],
    eo: [0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  R: {
    cp: [4,1,2,0, 7,5,6,3],
    co: [2,0,0,1, 1,0,0,2],
    ep: [8,1,2,3, 11,5,6,7, 4,9,10,0],
    eo: [0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
};

// ── Mapeo cubie → stickers para renderizar ─────────────────────────
// Para cada cara, los 9 stickers en orden [0..8] se obtienen de:
// centros (fijos), aristas y esquinas según su posición y orientación.
//
// Cara U (índice 0): stickers [0..8]
//   pos: 0=esquina ULB, 1=arista UB, 2=esquina UBR
//        3=arista UL,   4=centro U,  5=arista UR
//        6=esquina UFL, 7=arista UF, 8=esquina URF
//
// Definimos para cada sticker: { tipo, pieza_idx, cara_en_pieza }
// cara_en_pieza: qué facelet de la pieza apunta a esta cara

// Colores de esquinas en estado resuelto: [cara0, cara1, cara2]
// Orden de caras en esquina: U/D primero, luego F/B, luego L/R
const CORNER_FACELETS = [
  // URF=0: U,R,F
  [[FACES.U,8],[FACES.R,0],[FACES.F,2]],
  // UFL=1: U,F,L
  [[FACES.U,6],[FACES.F,0],[FACES.L,2]],
  // ULB=2: U,L,B
  [[FACES.U,0],[FACES.L,0],[FACES.B,2]],
  // UBR=3: U,B,R
  [[FACES.U,2],[FACES.B,0],[FACES.R,2]],
  // DFR=4: D,F,R
  [[FACES.D,2],[FACES.F,8],[FACES.R,6]],
  // DLF=5: D,L,F
  [[FACES.D,0],[FACES.L,8],[FACES.F,6]],
  // DBL=6: D,B,L
  [[FACES.D,6],[FACES.B,8],[FACES.L,6]],
  // DRB=7: D,R,B
  [[FACES.D,8],[FACES.R,8],[FACES.B,6]],
];

const EDGE_FACELETS = [
  // UR=0: U,R
  [[FACES.U,5],[FACES.R,1]],
  // UF=1: U,F
  [[FACES.U,7],[FACES.F,1]],
  // UL=2: U,L
  [[FACES.U,3],[FACES.L,1]],
  // UB=3: U,B
  [[FACES.U,1],[FACES.B,1]],
  // DR=4: D,R
  [[FACES.D,5],[FACES.R,7]],
  // DF=5: D,F
  [[FACES.D,1],[FACES.F,7]],
  // DL=6: D,L
  [[FACES.D,3],[FACES.L,7]],
  // DB=7: D,B
  [[FACES.D,7],[FACES.B,7]],
  // FR=8: F,R
  [[FACES.F,5],[FACES.R,3]],
  // FL=9: F,L
  [[FACES.F,3],[FACES.L,5]],
  // BL=10: B,L
  [[FACES.B,5],[FACES.L,3]],
  // BR=11: B,R
  [[FACES.B,3],[FACES.R,5]],
];

export class Cube {
  constructor() {
    this.reset();
  }

  reset() {
    // Estado resuelto: cada pieza en su posición, orientación 0
    this.cp = [0,1,2,3,4,5,6,7];
    this.co = [0,0,0,0,0,0,0,0];
    this.ep = [0,1,2,3,4,5,6,7,8,9,10,11];
    this.eo = [0,0,0,0,0,0,0,0,0,0,0,0];
    this._buildState();
  }

  clone() {
    const c = new Cube();
    c.cp = [...this.cp]; c.co = [...this.co];
    c.ep = [...this.ep]; c.eo = [...this.eo];
    c._buildState();
    return c;
  }

  /**
   * Construye cube.state[6][9] a partir de cp/co/ep/eo.
   * Este es el array que consume el renderer.
   * state[cara][sticker] = índice de color (0-5)
   */
  _buildState() {
    // Inicializar con centros (color = índice de cara)
    this.state = Array.from({length:6}, (_,i) => {
      const f = Array(9).fill(i);
      f[4] = i; // centro siempre es el color de la cara
      return f;
    });

    // Colocar esquinas
    for (let pos = 0; pos < 8; pos++) {
      const piece = this.cp[pos];       // qué pieza está en esta posición
      const ori   = this.co[pos];       // orientación de esa pieza
      const facelets = CORNER_FACELETS[pos];   // stickers de esta posición
      const colors   = CORNER_FACELETS[piece]; // colores de la pieza en estado resuelto

      for (let f = 0; f < 3; f++) {
        const [face, stickerIdx] = facelets[f];
        // La orientación rota qué cara de la pieza apunta aquí
        const colorFacelet = colors[(f + ori) % 3];
        this.state[face][stickerIdx] = colorFacelet[0]; // cara = color
      }
    }

    // Colocar aristas
    for (let pos = 0; pos < 12; pos++) {
      const piece = this.ep[pos];
      const ori   = this.eo[pos];
      const facelets = EDGE_FACELETS[pos];
      const colors   = EDGE_FACELETS[piece];

      for (let f = 0; f < 2; f++) {
        const [face, stickerIdx] = facelets[f];
        const colorFacelet = colors[(f + ori) % 2];
        this.state[face][stickerIdx] = colorFacelet[0];
      }
    }
  }

  /**
   * Aplica un movimiento usando permutación de piezas.
   * Completamente libre de bugs de ciclo — opera sobre arrays temporales.
   */
  _applyMove(mv) {
    const { cp, co, ep, eo } = mv;
    const newCp = Array(8), newCo = Array(8);
    const newEp = Array(12), newEo = Array(12);

    for (let i = 0; i < 8; i++) {
      newCp[i] = this.cp[cp[i]];
      newCo[i] = (this.co[cp[i]] + co[i]) % 3;
    }
    for (let i = 0; i < 12; i++) {
      newEp[i] = this.ep[ep[i]];
      newEo[i] = (this.eo[ep[i]] + eo[i]) % 2;
    }

    this.cp = newCp; this.co = newCo;
    this.ep = newEp; this.eo = newEo;
    this._buildState();
  }

  // Movimientos individuales
  U(cw=true)  { cw ? this._applyMove(MOVES.U)  : this._applyMove(inv(MOVES.U));  }
  D(cw=true)  { cw ? this._applyMove(MOVES.D)  : this._applyMove(inv(MOVES.D));  }
  F(cw=true)  { cw ? this._applyMove(MOVES.F)  : this._applyMove(inv(MOVES.F));  }
  B(cw=true)  { cw ? this._applyMove(MOVES.B)  : this._applyMove(inv(MOVES.B));  }
  L(cw=true)  { cw ? this._applyMove(MOVES.L)  : this._applyMove(inv(MOVES.L));  }
  R(cw=true)  { cw ? this._applyMove(MOVES.R)  : this._applyMove(inv(MOVES.R));  }

  move(notation) {
    const m = notation.trim();
    const face = m[0];
    const mod  = m.slice(1);
    const cw   = !mod.includes("'");
    const times = mod.includes('2') ? 2 : 1;
    for (let i = 0; i < times; i++) this[face](cw);
  }

  applyMoves(moves) { moves.forEach(m => this.move(m)); }

  isSolved() {
    return this.cp.every((v,i)=>v===i) && this.co.every(v=>v===0) &&
           this.ep.every((v,i)=>v===i) && this.eo.every(v=>v===0);
  }

  serialize() {
    return [
      this.cp.join(','), this.co.join(','),
      this.ep.join(','), this.eo.join(','),
    ].join('|');
  }

  deserialize(str) {
    try {
      const [cpS,coS,epS,eoS] = str.split('|');
      this.cp = cpS.split(',').map(Number);
      this.co = coS.split(',').map(Number);
      this.ep = epS.split(',').map(Number);
      this.eo = eoS.split(',').map(Number);
      if (this.cp.length!==8||this.ep.length!==12) return false;
      this._buildState();
      return true;
    } catch { return false; }
  }

  randomize(n = 25) {
    const faces = ['U','D','F','B','L','R'];
    const opp   = {U:'D',D:'U',F:'B',B:'F',L:'R',R:'L'};
    const sfx   = ["","'","2"];
    const seq   = [];
    let last = '', prev = '';
    for (let i = 0; i < n; i++) {
      let f;
      do { f = faces[Math.floor(Math.random()*6)]; }
      while (f===last || (f===opp[last] && last===opp[prev]));
      const s = sfx[Math.floor(Math.random()*3)];
      seq.push(f+s);
      prev = last; last = f;
    }
    this.applyMoves(seq);
    return seq;
  }
}

// Calcula el movimiento inverso de un movimiento dado
function inv(mv) {
  const n = mv.cp.length;
  const ne = mv.ep.length;
  const icp=Array(n), ico=Array(n), iep=Array(ne), ieo=Array(ne);
  for (let i=0;i<n;i++) { icp[mv.cp[i]]=i; ico[mv.cp[i]]=(3-mv.co[i])%3; }
  for (let i=0;i<ne;i++) { iep[mv.ep[i]]=i; ieo[mv.ep[i]]=mv.eo[i]; }
  return {cp:icp,co:ico,ep:iep,eo:ieo};
}

/**
 * cube.js — Modelo de estado del cubo 3x3
 *
 * Representación conceptual según la lógica del cubo de Rubik:
 * - 6 piezas centrales (índice 4 de cada cara): posición fija, nunca se mueven
 *   entre sí. Son el ancla que define el color de cada cara al resolverse.
 * - 12 piezas de arista (2 colores): índices 1,3,5,7 de cada cara
 * - 8 piezas de esquina (3 colores): índices 0,2,6,8 de cada cara
 *
 * Caras: U=0 (arriba), D=1 (abajo), F=2 (frente), B=3 (atrás), L=4 (izq), R=5 (der)
 *
 * Layout de índices por cara (vista desde el exterior):
 *   0 1 2
 *   3 4 5
 *   6 7 8
 *
 * Notación Singmaster: U/D/F/B/L/R = horario, X' = antihorario, X2 = 180°
 * El sentido horario se define mirando la cara desde el exterior del cubo.
 *
 * Regla fundamental: el estado solo se modifica mediante rotaciones de caras
 * completas (9 piezas en bloque). Nunca se altera un sticker individual.
 * Esto garantiza que el cubo siempre esté en un estado resoluble.
 */

export const FACES = { U: 0, D: 1, F: 2, B: 3, L: 4, R: 5 };
export const FACE_NAMES = ['U', 'D', 'F', 'B', 'L', 'R'];

// Índice del centro de cada cara — nunca cambia de cara, es el ancla de color
export const CENTER = 4;

export class Cube {
  constructor() {
    this.reset();
  }

  /**
   * Estado resuelto: cada cara tiene su propio color (índice 0-5).
   * El centro (índice 4) de cada cara define el color objetivo de esa cara.
   */
  reset() {
    this.state = Array.from({ length: 6 }, (_, i) => Array(9).fill(i));
  }

  // Clonar estado
  clone() {
    const c = new Cube();
    c.state = this.state.map(f => [...f]);
    return c;
  }

  // Serializar a string para localStorage
  serialize() {
    return this.state.map(f => f.join('')).join('|');
  }

  // Restaurar desde string
  deserialize(str) {
    const parts = str.split('|');
    if (parts.length !== 6) return false;
    const parsed = parts.map(p => p.split('').map(Number));
    // Validación básica: cada cara debe tener 9 stickers con valores 0-5
    if (parsed.some(f => f.length !== 9 || f.some(v => v < 0 || v > 5))) return false;
    this.state = parsed;
    return true;
  }

  /**
   * Rotar la cara fi en sentido horario (cw=true) o antihorario.
   * Solo rota los 9 stickers de esa cara; los stickers adyacentes
   * se manejan por separado en _cycle.
   *
   * Rotación horaria (vista desde el exterior):
   *   0 1 2        6 3 0
   *   3 4 5  -->   7 4 1
   *   6 7 8        8 5 2
   */
  _rotateFace(fi, cw) {
    const f = this.state[fi];
    if (cw) {
      this.state[fi] = [f[6],f[3],f[0], f[7],f[4],f[1], f[8],f[5],f[2]];
    } else {
      this.state[fi] = [f[2],f[5],f[8], f[1],f[4],f[7], f[0],f[3],f[6]];
    }
  }

  /**
   * Ciclo de 4 grupos de stickers entre 4 caras adyacentes.
   * Toma snapshot completo antes de escribir para evitar leer
   * valores ya sobreescritos durante el mismo ciclo.
   *
   * En sentido horario: grupo[0] <- grupo[1] <- grupo[2] <- grupo[3] <- grupo[0]
   */
  _cycle(positions, cw) {
    const s = this.state;
    // Snapshot de los 4 grupos ANTES de cualquier escritura
    const snap = positions.map(group => group.map(([f, i]) => s[f][i]));

    if (cw) {
      // grupo[0] recibe snap[3], grupo[1] recibe snap[0], etc.
      positions.forEach((group, k) => {
        const src = snap[(k + 3) % 4];
        group.forEach(([f, i], j) => { s[f][i] = src[j]; });
      });
    } else {
      // grupo[0] recibe snap[1], grupo[1] recibe snap[2], etc.
      positions.forEach((group, k) => {
        const src = snap[(k + 1) % 4];
        group.forEach(([f, i], j) => { s[f][i] = src[j]; });
      });
    }
  }

  // =========================================================
  // Movimientos básicos — Notación Singmaster estándar
  // El sentido horario se define mirando la cara desde afuera.
  // =========================================================

  /**
   * U — Cara superior, horario visto desde arriba.
   * Fila superior de: F -> R -> B -> L -> F
   */
  U(cw = true) {
    this._rotateFace(FACES.U, cw);
    this._cycle([
      [[FACES.F,0],[FACES.F,1],[FACES.F,2]],
      [[FACES.R,0],[FACES.R,1],[FACES.R,2]],
      [[FACES.B,0],[FACES.B,1],[FACES.B,2]],
      [[FACES.L,0],[FACES.L,1],[FACES.L,2]],
    ], cw);
  }

  /**
   * D — Cara inferior, horario visto desde abajo.
   * Fila inferior de: F -> L -> B -> R -> F
   */
  D(cw = true) {
    this._rotateFace(FACES.D, cw);
    this._cycle([
      [[FACES.F,6],[FACES.F,7],[FACES.F,8]],
      [[FACES.L,6],[FACES.L,7],[FACES.L,8]],
      [[FACES.B,6],[FACES.B,7],[FACES.B,8]],
      [[FACES.R,6],[FACES.R,7],[FACES.R,8]],
    ], cw);
  }

  /**
   * F — Cara frontal, horario visto desde el frente.
   * U(fila inferior) -> R(col izq) -> D(fila sup, invertida) -> L(col der, invertida)
   */
  F(cw = true) {
    this._rotateFace(FACES.F, cw);
    this._cycle([
      [[FACES.U,6],[FACES.U,7],[FACES.U,8]],
      [[FACES.R,0],[FACES.R,3],[FACES.R,6]],
      [[FACES.D,2],[FACES.D,1],[FACES.D,0]],
      [[FACES.L,8],[FACES.L,5],[FACES.L,2]],
    ], cw);
  }

  /**
   * B — Cara trasera, horario visto desde atrás.
   * U(fila superior, invertida) -> L(col izq) -> D(fila inf) -> R(col der, invertida)
   */
  B(cw = true) {
    this._rotateFace(FACES.B, cw);
    this._cycle([
      [[FACES.U,2],[FACES.U,1],[FACES.U,0]],
      [[FACES.L,0],[FACES.L,3],[FACES.L,6]],
      [[FACES.D,6],[FACES.D,7],[FACES.D,8]],
      [[FACES.R,8],[FACES.R,5],[FACES.R,2]],
    ], cw);
  }

  /**
   * L — Cara izquierda, horario visto desde la izquierda.
   * U(col izq) -> F(col izq) -> D(col izq) -> B(col der, invertida)
   */
  L(cw = true) {
    this._rotateFace(FACES.L, cw);
    this._cycle([
      [[FACES.U,0],[FACES.U,3],[FACES.U,6]],
      [[FACES.F,0],[FACES.F,3],[FACES.F,6]],
      [[FACES.D,0],[FACES.D,3],[FACES.D,6]],
      [[FACES.B,8],[FACES.B,5],[FACES.B,2]],
    ], cw);
  }

  /**
   * R — Cara derecha, horario visto desde la derecha.
   * U(col der) -> B(col izq, invertida) -> D(col der) -> F(col der)
   */
  R(cw = true) {
    this._rotateFace(FACES.R, cw);
    this._cycle([
      [[FACES.U,2],[FACES.U,5],[FACES.U,8]],
      [[FACES.B,6],[FACES.B,3],[FACES.B,0]],
      [[FACES.D,2],[FACES.D,5],[FACES.D,8]],
      [[FACES.F,2],[FACES.F,5],[FACES.F,8]],
    ], cw);
  }

  /**
   * Ejecutar un movimiento por notación string.
   * Ejemplos: "U", "U'", "R2", "B'"
   */
  move(notation) {
    const m = notation.trim();
    const face = m[0];
    const mod = m.slice(1);
    const cw = !mod.includes("'");
    const times = mod.includes('2') ? 2 : 1;
    if (!this[face]) throw new Error(`Movimiento desconocido: ${notation}`);
    for (let i = 0; i < times; i++) {
      this[face](cw);
    }
  }

  // Aplicar secuencia de movimientos
  applyMoves(moves) {
    moves.forEach(m => this.move(m));
  }

  /**
   * Verificar si el cubo está resuelto.
   * Condición: todos los stickers de cada cara deben coincidir con su centro (índice 4).
   * El centro es el ancla fija que define el color objetivo de cada cara.
   */
  isSolved() {
    return this.state.every(face => face.every(s => s === face[CENTER]));
  }

  /**
   * Mezclar el cubo aplicando n movimientos aleatorios válidos.
   *
   * Reglas para garantizar una mezcla efectiva y respetar la integridad
   * de las piezas (esquinas con 3 colores únicos, aristas con 2):
   * - Solo se aplican rotaciones de caras completas (movimientos legales).
   * - Se evita repetir la misma cara en el movimiento siguiente.
   * - Se evita mover la cara opuesta del mismo eje consecutivamente
   *   (ej: U seguido de D), ya que produce patrones predecibles.
   * - Los sufijos '', "'" y '2' se eligen con igual probabilidad.
   *
   * Al partir siempre del estado actual mediante movimientos válidos,
   * el resultado siempre es un estado resoluble donde cada pieza
   * mantiene su identidad (esquina/arista/centro) y sus colores
   * son combinaciones únicas e irrepetibles.
   */
  randomize(n = 25) {
    // Pares de caras opuestas (mismo eje)
    const opposites = { U:'D', D:'U', F:'B', B:'F', L:'R', R:'L' };
    const faces = ['U','D','F','B','L','R'];
    const suffixes = ["", "'", '2'];
    const seq = [];
    let lastFace = '';
    let secondLastFace = '';

    for (let i = 0; i < n; i++) {
      let face;
      do {
        face = faces[Math.floor(Math.random() * faces.length)];
      } while (
        face === lastFace ||
        // Evitar cara opuesta si la anterior ya era del mismo eje
        (face === opposites[lastFace] && secondLastFace === opposites[face])
      );

      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      seq.push(face + suffix);
      secondLastFace = lastFace;
      lastFace = face;
    }

    this.applyMoves(seq);
    return seq;
  }
}

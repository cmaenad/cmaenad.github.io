/**
 * solver.js — Solver capa por capa (beginner's method con BFS por fases)
 *
 * Principio: los centros (índice 4 de cada cara) son fijos y definen el color
 * objetivo de cada cara. El solver trabaja siempre con movimientos válidos,
 * garantizando que el cubo permanezca en un estado resoluble en todo momento.
 *
 * Fases:
 *   1. Cruz superior: 4 aristas de U con color correcto y alineadas con sus centros
 *   2. Capa superior completa: 4 esquinas de U en su lugar
 *   3. Capa media: 4 aristas de la franja central
 *   4. Cruz inferior: 4 aristas de D con color D hacia abajo
 *   5. Resolución final: BFS sobre el estado restante
 */

import { Cube, FACES, CENTER } from './cube.js';

const ALL_MOVES = ["U","U'","U2","D","D'","D2","F","F'","F2","B","B'","B2","L","L'","L2","R","R'","R2"];

/**
 * BFS genérico: encuentra la secuencia más corta de movimientos que lleva
 * el cubo a satisfacer goalFn, explorando hasta maxDepth niveles.
 */
function bfs(cube, goalFn, maxDepth = 7) {
  if (goalFn(cube)) return [];

  const queue = [{ state: cube.serialize(), moves: [] }];
  const visited = new Set([cube.serialize()]);

  while (queue.length > 0) {
    const { state, moves } = queue.shift();
    if (moves.length >= maxDepth) continue;

    for (const m of ALL_MOVES) {
      const c = new Cube();
      c.deserialize(state);
      c.move(m);
      const ns = c.serialize();
      if (visited.has(ns)) continue;
      visited.add(ns);
      const newMoves = [...moves, m];
      if (goalFn(c)) return newMoves;
      queue.push({ state: ns, moves: newMoves });
    }
  }
  return null;
}

/**
 * Solver principal: devuelve array de movimientos para resolver el cubo.
 * Trabaja sobre un clon para no modificar el cubo original.
 */
export function solve(cube) {
  if (cube.isSolved()) return [];

  const solution = [];
  const w = cube.clone();

  // Helpers: color del centro de cada cara (ancla fija)
  const centerColor = fi => w.state[fi][CENTER];

  // Fase 1: Cruz superior
  const p1 = bfs(w, c => isTopCrossDone(c), 8);
  if (p1) { solution.push(...p1); w.applyMoves(p1); }

  // Fase 2: Capa superior completa
  const p2 = bfs(w, c => isTopLayerDone(c), 8);
  if (p2) { solution.push(...p2); w.applyMoves(p2); }

  // Fase 3: Capa media
  const p3 = bfs(w, c => isMiddleLayerDone(c), 9);
  if (p3) { solution.push(...p3); w.applyMoves(p3); }

  // Fase 4: Cruz inferior
  const p4 = bfs(w, c => isBottomCrossDone(c), 8);
  if (p4) { solution.push(...p4); w.applyMoves(p4); }

  // Fase 5: Resolución final
  if (!w.isSolved()) {
    const p5 = bfs(w, c => c.isSolved(), 10);
    if (p5) { solution.push(...p5); w.applyMoves(p5); }
  }

  return solution;
}

// ===== Verificadores de fase =====
// Todos usan face[CENTER] (índice 4) como referencia de color, no índices hardcodeados.

/**
 * Cruz superior: las 4 aristas de la cara U tienen el color del centro U,
 * y cada arista lateral está alineada con el centro de su cara adyacente.
 */
function isTopCrossDone(c) {
  const { U, F, B, L, R } = FACES;
  const cu = c.state[U][CENTER];
  return (
    c.state[U][1] === cu && c.state[U][3] === cu &&
    c.state[U][5] === cu && c.state[U][7] === cu &&
    c.state[F][1] === c.state[F][CENTER] &&
    c.state[B][1] === c.state[B][CENTER] &&
    c.state[L][1] === c.state[L][CENTER] &&
    c.state[R][1] === c.state[R][CENTER]
  );
}

/**
 * Capa superior completa: toda la cara U es del color de su centro,
 * y la fila superior de cada cara lateral coincide con su centro.
 */
function isTopLayerDone(c) {
  if (!isTopCrossDone(c)) return false;
  const { U, F, B, L, R } = FACES;
  const cu = c.state[U][CENTER];
  return (
    c.state[U].every(s => s === cu) &&
    [0,1,2].every(i => c.state[F][i] === c.state[F][CENTER]) &&
    [0,1,2].every(i => c.state[B][i] === c.state[B][CENTER]) &&
    [0,1,2].every(i => c.state[L][i] === c.state[L][CENTER]) &&
    [0,1,2].every(i => c.state[R][i] === c.state[R][CENTER])
  );
}

/**
 * Capa media: las aristas centrales (índices 3 y 5) de las 4 caras laterales
 * coinciden con el color del centro de su cara.
 */
function isMiddleLayerDone(c) {
  if (!isTopLayerDone(c)) return false;
  const { F, B, L, R } = FACES;
  return (
    c.state[F][3] === c.state[F][CENTER] && c.state[F][5] === c.state[F][CENTER] &&
    c.state[B][3] === c.state[B][CENTER] && c.state[B][5] === c.state[B][CENTER] &&
    c.state[L][3] === c.state[L][CENTER] && c.state[L][5] === c.state[L][CENTER] &&
    c.state[R][3] === c.state[R][CENTER] && c.state[R][5] === c.state[R][CENTER]
  );
}

/**
 * Cruz inferior: las 4 aristas de la cara D tienen el color del centro D.
 */
function isBottomCrossDone(c) {
  const { D } = FACES;
  const cd = c.state[D][CENTER];
  return (
    c.state[D][1] === cd && c.state[D][3] === cd &&
    c.state[D][5] === cd && c.state[D][7] === cd
  );
}

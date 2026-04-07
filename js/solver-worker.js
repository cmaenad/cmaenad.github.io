/**
 * solver-worker.js — Solver capa por capa usando el modelo cubie
 *
 * Opera directamente sobre cp/co/ep/eo para evitar cualquier
 * ambigüedad de stickers. Implementa el método principiante:
 *
 *   1. Cruz blanca (aristas U en posición y orientación correctas)
 *   2. Esquinas capa U
 *   3. Aristas capa media
 *   4. Cruz amarilla (D)
 *   5. Permutación aristas D
 *   6. Permutación esquinas D
 *   7. Orientación esquinas D
 *
 * Cada fase usa BFS limitado sobre el subespacio relevante.
 * Profundidad máxima por fase: 7 movimientos → siempre termina rápido.
 */

// ── Modelo cubie (idéntico a cube.js) ─────────────────────────────

const MOVES_DEF = {
  U: { cp:[3,0,1,2,4,5,6,7], co:[0,0,0,0,0,0,0,0], ep:[3,0,1,2,4,5,6,7,8,9,10,11], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
  D: { cp:[0,1,2,3,5,6,7,4], co:[0,0,0,0,0,0,0,0], ep:[0,1,2,3,5,6,7,4,8,9,10,11], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
  F: { cp:[1,5,2,3,0,4,6,7], co:[1,2,0,0,2,1,0,0], ep:[0,9,2,3,4,8,6,7,1,5,10,11], eo:[0,1,0,0,0,1,0,0,1,1,0,0] },
  B: { cp:[0,1,3,7,4,5,2,6], co:[0,0,1,2,0,0,2,1], ep:[0,1,2,11,4,5,6,10,8,9,3,7], eo:[0,0,0,1,0,0,0,1,0,0,1,1] },
  L: { cp:[0,2,6,3,4,1,5,7], co:[0,1,2,0,0,2,1,0], ep:[0,1,10,3,4,5,9,7,8,2,6,11], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
  R: { cp:[4,1,2,0,7,5,6,3], co:[2,0,0,1,1,0,0,2], ep:[8,1,2,3,11,5,6,7,4,9,10,0], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
};

function invMove(mv) {
  const icp=Array(8),ico=Array(8),iep=Array(12),ieo=Array(12);
  for(let i=0;i<8;i++){icp[mv.cp[i]]=i;ico[mv.cp[i]]=(3-mv.co[i])%3;}
  for(let i=0;i<12;i++){iep[mv.ep[i]]=i;ieo[mv.ep[i]]=mv.eo[i];}
  return {cp:icp,co:ico,ep:iep,eo:ieo};
}

const MOVES_INV = {};
for(const k of Object.keys(MOVES_DEF)) MOVES_INV[k+"'"] = invMove(MOVES_DEF[k]);
const MOVES_ALL = {...MOVES_DEF, ...MOVES_INV};
// Añadir movimientos dobles
for(const k of Object.keys(MOVES_DEF)){
  const m=MOVES_DEF[k];
  const m2cp=Array(8),m2co=Array(8),m2ep=Array(12),m2eo=Array(12);
  for(let i=0;i<8;i++){m2cp[i]=m.cp[m.cp[i]];m2co[i]=(m.co[m.cp[i]]+m.co[i])%3;}
  for(let i=0;i<12;i++){m2ep[i]=m.ep[m.ep[i]];m2eo[i]=(m.eo[m.ep[i]]+m.eo[i])%2;}
  MOVES_ALL[k+'2']={cp:m2cp,co:m2co,ep:m2ep,eo:m2eo};
}

class CubeState {
  constructor(){
    this.cp=[0,1,2,3,4,5,6,7];
    this.co=[0,0,0,0,0,0,0,0];
    this.ep=[0,1,2,3,4,5,6,7,8,9,10,11];
    this.eo=[0,0,0,0,0,0,0,0,0,0,0,0];
  }
  clone(){
    const c=new CubeState();
    c.cp=[...this.cp];c.co=[...this.co];
    c.ep=[...this.ep];c.eo=[...this.eo];
    return c;
  }
  apply(mv){
    const ncp=Array(8),nco=Array(8),nep=Array(12),neo=Array(12);
    for(let i=0;i<8;i++){ncp[i]=this.cp[mv.cp[i]];nco[i]=(this.co[mv.cp[i]]+mv.co[i])%3;}
    for(let i=0;i<12;i++){nep[i]=this.ep[mv.ep[i]];neo[i]=(this.eo[mv.ep[i]]+mv.eo[i])%2;}
    this.cp=ncp;this.co=nco;this.ep=nep;this.eo=neo;
  }
  move(n){this.apply(MOVES_ALL[n]);}
  applyMoves(ms){ms.forEach(m=>this.move(m));}
  key(){return this.cp.join()+'/'+this.co.join()+'/'+this.ep.join()+'/'+this.eo.join();}
  isSolved(){
    return this.cp.every((v,i)=>v===i)&&this.co.every(v=>v===0)&&
           this.ep.every((v,i)=>v===i)&&this.eo.every(v=>v===0);
  }
  fromStr(s){
    const [a,b,c,d]=s.split('|');
    this.cp=a.split(',').map(Number);this.co=b.split(',').map(Number);
    this.ep=c.split(',').map(Number);this.eo=d.split(',').map(Number);
  }
}

// ── BFS genérico ───────────────────────────────────────────────────
const ALL_MOVE_NAMES = Object.keys(MOVES_ALL);

function bfs(state, goalFn, maxDepth, allowedMoves) {
  if(goalFn(state)) return [];
  const moves = allowedMoves || ALL_MOVE_NAMES;
  const queue=[{s:state.clone(), path:[]}];
  const seen=new Set([state.key()]);
  while(queue.length){
    const {s,path}=queue.shift();
    if(path.length>=maxDepth) continue;
    for(const m of moves){
      const ns=s.clone(); ns.move(m);
      const k=ns.key();
      if(seen.has(k)) continue;
      seen.add(k);
      const np=[...path,m];
      if(goalFn(ns)) return np;
      queue.push({s:ns,path:np});
    }
  }
  return null;
}

// ── Funciones de objetivo por fase ────────────────────────────────

// Aristas de U: posiciones 0(UR),1(UF),2(UL),3(UB)
function crossDone(c){
  return c.ep[0]===0&&c.eo[0]===0 &&
         c.ep[1]===1&&c.eo[1]===0 &&
         c.ep[2]===2&&c.eo[2]===0 &&
         c.ep[3]===3&&c.eo[3]===0;
}

// Esquinas de U: posiciones 0(URF),1(UFL),2(ULB),3(UBR)
function topLayerDone(c){
  if(!crossDone(c)) return false;
  return c.cp[0]===0&&c.co[0]===0 &&
         c.cp[1]===1&&c.co[1]===0 &&
         c.cp[2]===2&&c.co[2]===0 &&
         c.cp[3]===3&&c.co[3]===0;
}

// Aristas de capa media: posiciones 8(FR),9(FL),10(BL),11(BR)
function middleLayerDone(c){
  if(!topLayerDone(c)) return false;
  return c.ep[8]===8&&c.eo[8]===0 &&
         c.ep[9]===9&&c.eo[9]===0 &&
         c.ep[10]===10&&c.eo[10]===0 &&
         c.ep[11]===11&&c.eo[11]===0;
}

// Cruz D: aristas 4(DR),5(DF),6(DL),7(DB) orientadas correctamente
function bottomCrossDone(c){
  if(!middleLayerDone(c)) return false;
  return c.eo[4]===0&&c.eo[5]===0&&c.eo[6]===0&&c.eo[7]===0;
}

// Aristas D en posición correcta
function bottomEdgesPlaced(c){
  if(!bottomCrossDone(c)) return false;
  return c.ep[4]===4&&c.ep[5]===5&&c.ep[6]===6&&c.ep[7]===7;
}

// Esquinas D en posición correcta (sin importar orientación)
function bottomCornersPlaced(c){
  if(!bottomEdgesPlaced(c)) return false;
  return c.cp[4]===4&&c.cp[5]===5&&c.cp[6]===6&&c.cp[7]===7;
}

// ── Solver principal ───────────────────────────────────────────────
function solve(state) {
  if(state.isSolved()) return [];
  const sol=[];
  const w=state.clone();

  // Movimientos permitidos por fase (evitar mover capas ya resueltas)
  const allM = ALL_MOVE_NAMES;
  const noU  = allM.filter(m=>m[0]!=='U');
  const noUD = allM.filter(m=>m[0]!=='U'&&m[0]!=='D');

  const phases = [
    [crossDone,           allM,  7],
    [topLayerDone,        allM,  7],
    [middleLayerDone,     noU,   7],
    [bottomCrossDone,     noUD,  7],
    [bottomEdgesPlaced,   noUD,  7],
    [bottomCornersPlaced, noUD,  7],
    [c=>c.isSolved(),     noUD,  8],
  ];

  for(const [goal, moves, depth] of phases){
    if(goal(w)) continue;
    const found = bfs(w, goal, depth, moves);
    if(found){ sol.push(...found); w.applyMoves(found); }
    if(w.isSolved()) break;
  }

  return sol;
}

// ── Entry point ────────────────────────────────────────────────────
self.onmessage = function(e){
  const s = new CubeState();
  s.fromStr(e.data.state);
  try {
    const moves = solve(s);
    self.postMessage({moves});
  } catch(err){
    self.postMessage({error: err.message});
  }
};

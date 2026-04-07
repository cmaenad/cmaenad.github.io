/**
 * solver-worker.js — Solver capa por capa, modelo cubie
 * Datos de movimientos idénticos a cube.js (muodov/kociemba reference)
 */

const MOVE_TABLE = {
  U: { cp:[1,2,3,0,4,5,6,7], co:[0,0,0,0,0,0,0,0], ep:[1,2,3,0,4,5,6,7,8,9,10,11], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
  D: { cp:[0,1,2,3,7,4,5,6], co:[0,0,0,0,0,0,0,0], ep:[0,1,2,3,7,4,5,6,8,9,10,11], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
  F: { cp:[4,0,2,3,5,1,6,7], co:[1,2,0,0,2,1,0,0], ep:[0,8,2,3,4,9,6,7,5,1,10,11], eo:[0,1,0,0,0,1,0,0,1,1,0,0] },
  B: { cp:[0,1,7,2,4,5,3,6], co:[0,0,2,1,0,0,1,2], ep:[0,1,2,10,4,5,6,11,8,9,7,3], eo:[0,0,0,1,0,0,0,1,0,0,1,1] },
  L: { cp:[0,5,1,3,4,6,2,7], co:[0,2,1,0,0,1,2,0], ep:[0,1,9,3,4,5,10,7,8,6,2,11], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
  R: { cp:[3,1,2,7,0,5,6,4], co:[1,0,0,2,2,0,0,1], ep:[11,1,2,3,8,5,6,7,4,9,10,0], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
};

function _inv(mv) {
  const icp=Array(8),ico=Array(8),iep=Array(12),ieo=Array(12);
  for(let i=0;i<8;i++){icp[mv.cp[i]]=i;ico[mv.cp[i]]=(3-mv.co[i])%3;}
  for(let i=0;i<12;i++){iep[mv.ep[i]]=i;ieo[mv.ep[i]]=mv.eo[i];}
  return {cp:icp,co:ico,ep:iep,eo:ieo};
}

// Construir tabla completa: X, X', X2
const ALL_MOVES = {};
for (const [k,mv] of Object.entries(MOVE_TABLE)) {
  ALL_MOVES[k]    = mv;
  ALL_MOVES[k+"'"] = _inv(mv);
  // X2 = aplicar X dos veces
  const m2cp=Array(8),m2co=Array(8),m2ep=Array(12),m2eo=Array(12);
  for(let i=0;i<8;i++){m2cp[i]=mv.cp[mv.cp[i]];m2co[i]=(mv.co[mv.cp[i]]+mv.co[i])%3;}
  for(let i=0;i<12;i++){m2ep[i]=mv.ep[mv.ep[i]];m2eo[i]=(mv.eo[mv.ep[i]]+mv.eo[i])%2;}
  ALL_MOVES[k+'2'] = {cp:m2cp,co:m2co,ep:m2ep,eo:m2eo};
}

class CS {
  constructor() {
    this.cp=[0,1,2,3,4,5,6,7]; this.co=[0,0,0,0,0,0,0,0];
    this.ep=[0,1,2,3,4,5,6,7,8,9,10,11]; this.eo=[0,0,0,0,0,0,0,0,0,0,0,0];
  }
  clone() {
    const c=new CS();
    c.cp=[...this.cp];c.co=[...this.co];c.ep=[...this.ep];c.eo=[...this.eo];
    return c;
  }
  apply(mv) {
    const ncp=Array(8),nco=Array(8),nep=Array(12),neo=Array(12);
    for(let i=0;i<8;i++){ncp[i]=this.cp[mv.cp[i]];nco[i]=(this.co[mv.cp[i]]+mv.co[i])%3;}
    for(let i=0;i<12;i++){nep[i]=this.ep[mv.ep[i]];neo[i]=(this.eo[mv.ep[i]]+mv.eo[i])%2;}
    this.cp=ncp;this.co=nco;this.ep=nep;this.eo=neo;
  }
  move(n){this.apply(ALL_MOVES[n]);}
  applyMoves(ms){ms.forEach(m=>this.move(m));}
  key(){return this.cp+'/'+this.co+'/'+this.ep+'/'+this.eo;}
  isSolved(){return this.cp.every((v,i)=>v===i)&&this.co.every(v=>v===0)&&this.ep.every((v,i)=>v===i)&&this.eo.every(v=>v===0);}
  fromStr(s){
    const[a,b,c,d]=s.split('|');
    this.cp=a.split(',').map(Number);this.co=b.split(',').map(Number);
    this.ep=c.split(',').map(Number);this.eo=d.split(',').map(Number);
  }
}

// BFS con límite de nodos para evitar consumo de memoria infinito
function bfs(state, goalFn, maxDepth, allowedMoves, maxNodes=80000) {
  if(goalFn(state)) return [];
  const queue=[{s:state.clone(),path:[]}];
  const seen=new Set([state.key()]);
  let nodes=0;
  while(queue.length && nodes<maxNodes){
    const {s,path}=queue.shift();
    nodes++;
    if(path.length>=maxDepth) continue;
    for(const m of allowedMoves){
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

// Nombres de movimientos por grupo
const M_ALL  = Object.keys(ALL_MOVES);
const M_NO_U = M_ALL.filter(m=>m[0]!=='U');
const M_NO_UD= M_ALL.filter(m=>m[0]!=='U'&&m[0]!=='D');

// Objetivos de cada fase
const crossDone = c =>
  c.ep[0]===0&&c.eo[0]===0 && c.ep[1]===1&&c.eo[1]===0 &&
  c.ep[2]===2&&c.eo[2]===0 && c.ep[3]===3&&c.eo[3]===0;

const topLayerDone = c => crossDone(c) &&
  c.cp[0]===0&&c.co[0]===0 && c.cp[1]===1&&c.co[1]===0 &&
  c.cp[2]===2&&c.co[2]===0 && c.cp[3]===3&&c.co[3]===0;

const midLayerDone = c => topLayerDone(c) &&
  c.ep[8]===8&&c.eo[8]===0 && c.ep[9]===9&&c.eo[9]===0 &&
  c.ep[10]===10&&c.eo[10]===0 && c.ep[11]===11&&c.eo[11]===0;

const botCrossDone = c => midLayerDone(c) &&
  c.eo[4]===0&&c.eo[5]===0&&c.eo[6]===0&&c.eo[7]===0;

const botEdgesOk = c => botCrossDone(c) &&
  c.ep[4]===4&&c.ep[5]===5&&c.ep[6]===6&&c.ep[7]===7;

const botCornersOk = c => botEdgesOk(c) &&
  c.cp[4]===4&&c.cp[5]===5&&c.cp[6]===6&&c.cp[7]===7;

function solve(state) {
  if(state.isSolved()) return [];
  const sol=[];
  const w=state.clone();

  const phases=[
    [crossDone,    M_ALL,   7],
    [topLayerDone, M_ALL,   7],
    [midLayerDone, M_NO_U,  7],
    [botCrossDone, M_NO_UD, 7],
    [botEdgesOk,   M_NO_UD, 7],
    [botCornersOk, M_NO_UD, 7],
    [c=>c.isSolved(), M_NO_UD, 8],
  ];

  for(const [goal,moves,depth] of phases){
    if(goal(w)) continue;
    const found=bfs(w,goal,depth,moves);
    if(found){sol.push(...found);w.applyMoves(found);}
    if(w.isSolved()) break;
  }
  return sol;
}

self.onmessage=function(e){
  const s=new CS();
  s.fromStr(e.data.state);
  try{
    const moves=solve(s);
    self.postMessage({moves});
  }catch(err){
    self.postMessage({error:err.message});
  }
};

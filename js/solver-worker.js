/**
 * solver-worker.js — Solver capa por capa, modelo stickers con ciclos
 * Mismo motor que cube.js
 */

const FACE_CW  = [6,3,0,7,4,1,8,5,2];
const FACE_CCW = [2,5,8,1,4,7,0,3,6];
const S = (f,i) => f*9+i;

const CYCLES = {
  U: [[S(2,0),S(5,0),S(3,0),S(4,0)],[S(2,1),S(5,1),S(3,1),S(4,1)],[S(2,2),S(5,2),S(3,2),S(4,2)]],
  D: [[S(2,6),S(4,6),S(3,6),S(5,6)],[S(2,7),S(4,7),S(3,7),S(5,7)],[S(2,8),S(4,8),S(3,8),S(5,8)]],
  F: [[S(0,6),S(5,0),S(1,2),S(4,8)],[S(0,7),S(5,3),S(1,1),S(4,5)],[S(0,8),S(5,6),S(1,0),S(4,2)]],
  B: [[S(0,2),S(4,0),S(1,6),S(5,8)],[S(0,1),S(4,3),S(1,7),S(5,5)],[S(0,0),S(4,6),S(1,8),S(5,2)]],
  L: [[S(0,0),S(2,0),S(1,0),S(3,8)],[S(0,3),S(2,3),S(1,3),S(3,5)],[S(0,6),S(2,6),S(1,6),S(3,2)]],
  R: [[S(0,2),S(2,2),S(1,2),S(3,6)],[S(0,5),S(2,5),S(1,5),S(3,3)],[S(0,8),S(2,8),S(1,8),S(3,0)]],
};
const FACE_IDX = {U:0,D:1,F:2,B:3,L:4,R:5};

class CubeW {
  constructor() { this.s = Array.from({length:6},(_,i)=>Array(9).fill(i)); }
  clone() { const c=new CubeW(); c.s=this.s.map(f=>[...f]); return c; }
  _apply(fi, cycles, cw) {
    const flat=this.s.flat(), next=[...flat];
    const base=fi*9, rot=cw?FACE_CW:FACE_CCW;
    for(let i=0;i<9;i++) next[base+i]=flat[base+rot[i]];
    for(const[a,b,c,d]of cycles){
      if(cw){next[b]=flat[a];next[c]=flat[b];next[d]=flat[c];next[a]=flat[d];}
      else  {next[d]=flat[a];next[c]=flat[d];next[b]=flat[c];next[a]=flat[b];}
    }
    for(let f=0;f<6;f++) for(let i=0;i<9;i++) this.s[f][i]=next[f*9+i];
  }
  move(n) {
    const face=n[0],mod=n.slice(1),cw=!mod.includes("'"),t=mod.includes('2')?2:1;
    for(let i=0;i<t;i++) this._apply(FACE_IDX[face],CYCLES[face],cw);
  }
  applyMoves(ms){ms.forEach(m=>this.move(m));}
  key(){return this.s.map(f=>f.join('')).join('|');}
  isSolved(){return this.s.every(f=>f.every(v=>v===f[4]));}
  fromStr(str){
    const p=str.split('|');
    this.s=p.map(x=>x.split('').map(Number));
  }
}

const ALL_MOVE_NAMES = ['U',"U'","U2",'D',"D'","D2",'F',"F'","F2",'B',"B'","B2",'L',"L'","L2",'R',"R'","R2"];
const NO_U  = ALL_MOVE_NAMES.filter(m=>m[0]!=='U');
const NO_UD = ALL_MOVE_NAMES.filter(m=>m[0]!=='U'&&m[0]!=='D');

function bfs(state, goalFn, maxDepth, moves, maxNodes=60000) {
  if(goalFn(state)) return [];
  const queue=[{s:state.clone(),path:[]}];
  const seen=new Set([state.key()]);
  let n=0;
  while(queue.length&&n<maxNodes){
    const{s,path}=queue.shift(); n++;
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

// Objetivos usando state[cara][sticker] y centro=state[cara][4]
const crossDone = w =>
  w.s[0][1]===w.s[0][4] && w.s[0][3]===w.s[0][4] &&
  w.s[0][5]===w.s[0][4] && w.s[0][7]===w.s[0][4] &&
  w.s[2][1]===w.s[2][4] && w.s[3][1]===w.s[3][4] &&
  w.s[4][1]===w.s[4][4] && w.s[5][1]===w.s[5][4];

const topDone = w => crossDone(w) && w.s[0].every(v=>v===w.s[0][4]) &&
  [0,1,2].every(i=>w.s[2][i]===w.s[2][4]) &&
  [0,1,2].every(i=>w.s[3][i]===w.s[3][4]) &&
  [0,1,2].every(i=>w.s[4][i]===w.s[4][4]) &&
  [0,1,2].every(i=>w.s[5][i]===w.s[5][4]);

const midDone = w => topDone(w) &&
  w.s[2][3]===w.s[2][4] && w.s[2][5]===w.s[2][4] &&
  w.s[3][3]===w.s[3][4] && w.s[3][5]===w.s[3][4] &&
  w.s[4][3]===w.s[4][4] && w.s[4][5]===w.s[4][4] &&
  w.s[5][3]===w.s[5][4] && w.s[5][5]===w.s[5][4];

const botCross = w => midDone(w) &&
  w.s[1][1]===w.s[1][4] && w.s[1][3]===w.s[1][4] &&
  w.s[1][5]===w.s[1][4] && w.s[1][7]===w.s[1][4];

const botEdges = w => botCross(w) &&
  w.s[2][7]===w.s[2][4] && w.s[3][7]===w.s[3][4] &&
  w.s[4][7]===w.s[4][4] && w.s[5][7]===w.s[5][4];

const botCorners = w => botEdges(w) &&
  w.s[1][0]===w.s[1][4] && w.s[1][2]===w.s[1][4] &&
  w.s[1][6]===w.s[1][4] && w.s[1][8]===w.s[1][4];

function solve(state) {
  if(state.isSolved()) return [];
  const sol=[], w=state.clone();
  const phases=[
    [crossDone,   ALL_MOVE_NAMES, 7],
    [topDone,     ALL_MOVE_NAMES, 7],
    [midDone,     NO_U,           7],
    [botCross,    NO_UD,          7],
    [botEdges,    NO_UD,          7],
    [botCorners,  NO_UD,          7],
    [c=>c.isSolved(), NO_UD,      8],
  ];
  for(const[goal,moves,depth]of phases){
    if(goal(w)) continue;
    const found=bfs(w,goal,depth,moves);
    if(found){sol.push(...found);w.applyMoves(found);}
    if(w.isSolved()) break;
  }
  return sol;
}

self.onmessage=function(e){
  const s=new CubeW();
  s.fromStr(e.data.state);
  try{ self.postMessage({moves:solve(s)}); }
  catch(err){ self.postMessage({error:err.message}); }
};

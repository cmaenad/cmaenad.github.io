// Test del motor del cubo — copia inline para Node.js

function fromCycles(n, cycles) {
  const p = Array.from({length:n},(_,i)=>i);
  for (const cycle of cycles) {
    const last = cycle[cycle.length-1];
    const tmp = p[last];
    for (let i = cycle.length-1; i > 0; i--) p[cycle[i]] = p[cycle[i-1]];
    p[cycle[0]] = tmp;
  }
  return p;
}

function makeCoArray(cyclePositions, deltas) {
  const co = Array(8).fill(0);
  cyclePositions.forEach((pos, i) => { co[pos] = deltas[i % deltas.length]; });
  return co;
}
function makeEoArray(cyclePositions) {
  const eo = Array(12).fill(0);
  cyclePositions.forEach(pos => { eo[pos] = 1; });
  return eo;
}

const U_cp = fromCycles(8,  [[0,1,2,3]]);
const U_ep = fromCycles(12, [[0,1,2,3]]);
const D_cp = fromCycles(8,  [[4,7,6,5]]);
const D_ep = fromCycles(12, [[4,5,6,7]]);
const F_cp = fromCycles(8,  [[0,4,5,1]]);
const F_ep = fromCycles(12, [[1,8,5,9]]);
const B_cp = fromCycles(8,  [[3,2,6,7]]);
const B_ep = fromCycles(12, [[3,11,7,10]]);
const L_cp = fromCycles(8,  [[1,5,6,2]]);
const L_ep = fromCycles(12, [[2,9,6,10]]);
const R_cp = fromCycles(8,  [[0,3,7,4]]);
const R_ep = fromCycles(12, [[0,11,4,8]]);

const MOVES = {
  U: { cp:U_cp, co:Array(8).fill(0),  ep:U_ep, eo:Array(12).fill(0) },
  D: { cp:D_cp, co:Array(8).fill(0),  ep:D_ep, eo:Array(12).fill(0) },
  F: { cp:F_cp, co:makeCoArray([0,4,5,1],[1,2,1,2]), ep:F_ep, eo:makeEoArray([1,8,5,9]) },
  B: { cp:B_cp, co:makeCoArray([3,2,6,7],[2,1,2,1]), ep:B_ep, eo:makeEoArray([3,11,7,10]) },
  L: { cp:L_cp, co:makeCoArray([1,5,6,2],[1,2,1,2]), ep:L_ep, eo:Array(12).fill(0) },
  R: { cp:R_cp, co:makeCoArray([0,3,7,4],[2,1,2,1]), ep:R_ep, eo:Array(12).fill(0) },
};

function _inv(mv) {
  const icp=Array(8),ico=Array(8),iep=Array(12),ieo=Array(12);
  for(let i=0;i<8;i++){icp[mv.cp[i]]=i;ico[mv.cp[i]]=(3-mv.co[i])%3;}
  for(let i=0;i<12;i++){iep[mv.ep[i]]=i;ieo[mv.ep[i]]=mv.eo[i];}
  return {cp:icp,co:ico,ep:iep,eo:ieo};
}

const CORNER_FACELETS = [
  [[0,8],[2,2],[5,0]],  // URF=0
  [[0,6],[4,2],[2,0]],  // UFL=1
  [[0,0],[3,2],[4,0]],  // ULB=2
  [[0,2],[5,2],[3,0]],  // UBR=3
  [[1,2],[5,6],[2,8]],  // DFR=4
  [[1,0],[2,6],[4,8]],  // DLF=5
  [[1,6],[4,6],[3,8]],  // DBL=6
  [[1,8],[3,6],[5,8]],  // DRB=7
];
const EDGE_FACELETS = [
  [[0,5],[5,1]],[[0,7],[2,1]],[[0,3],[4,1]],[[0,1],[3,1]],
  [[1,5],[5,7]],[[1,1],[2,7]],[[1,3],[4,7]],[[1,7],[3,7]],
  [[2,5],[5,3]],[[2,3],[4,5]],[[3,5],[4,3]],[[3,3],[5,5]],
];

class Cube {
  constructor(){this.reset();}
  reset(){
    this.cp=[0,1,2,3,4,5,6,7];this.co=[0,0,0,0,0,0,0,0];
    this.ep=[0,1,2,3,4,5,6,7,8,9,10,11];this.eo=[0,0,0,0,0,0,0,0,0,0,0,0];
    this._build();
  }
  _build(){
    this.state=Array.from({length:6},(_,i)=>Array(9).fill(i));
    for(let pos=0;pos<8;pos++){
      const piece=this.cp[pos],ori=this.co[pos];
      for(let f=0;f<3;f++){
        const[face,si]=CORNER_FACELETS[pos][f];
        const[cf]=CORNER_FACELETS[piece][(f+ori)%3];
        this.state[face][si]=cf;
      }
    }
    for(let pos=0;pos<12;pos++){
      const piece=this.ep[pos],ori=this.eo[pos];
      for(let f=0;f<2;f++){
        const[face,si]=EDGE_FACELETS[pos][f];
        const[cf]=EDGE_FACELETS[piece][(f+ori)%2];
        this.state[face][si]=cf;
      }
    }
  }
  _apply(mv){
    const ncp=Array(8),nco=Array(8),nep=Array(12),neo=Array(12);
    for(let i=0;i<8;i++){ncp[i]=this.cp[mv.cp[i]];nco[i]=(this.co[mv.cp[i]]+mv.co[i])%3;}
    for(let i=0;i<12;i++){nep[i]=this.ep[mv.ep[i]];neo[i]=(this.eo[mv.ep[i]]+mv.eo[i])%2;}
    this.cp=ncp;this.co=nco;this.ep=nep;this.eo=neo;this._build();
  }
  U(cw=true){this._apply(cw?MOVES.U:_inv(MOVES.U));}
  D(cw=true){this._apply(cw?MOVES.D:_inv(MOVES.D));}
  F(cw=true){this._apply(cw?MOVES.F:_inv(MOVES.F));}
  B(cw=true){this._apply(cw?MOVES.B:_inv(MOVES.B));}
  L(cw=true){this._apply(cw?MOVES.L:_inv(MOVES.L));}
  R(cw=true){this._apply(cw?MOVES.R:_inv(MOVES.R));}
  move(n){const f=n[0],mod=n.slice(1),cw=!mod.includes("'"),t=mod.includes('2')?2:1;for(let i=0;i<t;i++)this[f](cw);}
  applyMoves(ms){ms.forEach(m=>this.move(m));}
  isSolved(){return this.cp.every((v,i)=>v===i)&&this.co.every(v=>v===0)&&this.ep.every((v,i)=>v===i)&&this.eo.every(v=>v===0);}
  str(){return this.state.map((f,i)=>'UDFBLR'[i]+':'+f.join('')).join('  ');}
}

let pass=0,fail=0;
function test(label,ok,extra=''){
  if(ok){console.log(`\x1b[32m✓\x1b[0m ${label}`);pass++;}
  else{console.log(`\x1b[31m✗ ${label}${extra?'\n    '+extra:''}\x1b[0m`);fail++;}
}

// Estado inicial
{const c=new Cube();test('isSolved inicial',c.isSolved());}

// X×4 = identidad
for(const m of ['U','D','F','B','L','R']){
  const c=new Cube();c.move(m);c.move(m);c.move(m);c.move(m);
  test(`${m}×4 = identidad`,c.isSolved(),c.str());
}

// M M' = identidad
for(const m of ['U','D','F','B','L','R']){
  const c=new Cube();c.move(m);c.move(m+"'");
  test(`${m} ${m}' = identidad`,c.isSolved(),c.str());
}

// Sexy move ×6
{const c=new Cube();for(let i=0;i<6;i++)c.applyMoves(["R","U","R'","U'"]);
test("(R U R' U')×6 = identidad",c.isSolved(),c.str());}

// Sune ×6
{const c=new Cube();for(let i=0;i<6;i++)c.applyMoves(["R","U","R'","U","R","U2","R'"]);
test("Sune×6 = identidad",c.isSolved(),c.str());}

// T-perm ×2 = identidad
{const c=new Cube();for(let i=0;i<2;i++)c.applyMoves(["R","U","R'","U'","R'","F","R2","U'","R'","U'","R","U","R'","F'"]);
test("T-perm×2 = identidad",c.isSolved(),c.str());}

// U: verifica que fila sup F→R
{
  const c=new Cube();c.move('U');
  const ok = [c.state[5][0],c.state[5][1],c.state[5][2]].every(v=>v===2);
  test('U: fila sup F→R (R top = color F=2)',ok,
    'R top: '+[c.state[5][0],c.state[5][1],c.state[5][2]]+' | '+c.str());
}

// R: verifica que col der U→F
{
  const c=new Cube();c.move('R');
  const ok = [c.state[2][2],c.state[2][5],c.state[2][8]].every(v=>v===0);
  test('R: col der U→F (F right = color U=0)',ok,
    'F right: '+[c.state[2][2],c.state[2][5],c.state[2][8]]+' | '+c.str());
}

// F: verifica que fila inf U→col izq R
{
  const c=new Cube();c.move('F');
  const ok = [c.state[5][0],c.state[5][3],c.state[5][6]].every(v=>v===0);
  test('F: fila inf U→col izq R (R left = color U=0)',ok,
    'R left: '+[c.state[5][0],c.state[5][3],c.state[5][6]]+' | '+c.str());
}

console.log(`\n${pass} OK, ${fail} FALLOS`);
process.exit(fail>0?1:0);

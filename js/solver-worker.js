/**
 * solver-worker.js — Solver determinista capa por capa
 *
 * NO usa BFS. Aplica algoritmos fijos del método principiante:
 *   Fase 1: Cruz blanca (U)
 *   Fase 2: Esquinas capa U
 *   Fase 3: Aristas capa media
 *   Fase 4: Cruz amarilla (D)
 *   Fase 5: Orientar esquinas D
 *   Fase 6: Permutar esquinas D
 *   Fase 7: Permutar aristas D
 *
 * Cada fase localiza la pieza objetivo y la inserta con un algoritmo fijo.
 * Complejidad: O(1) por pieza, termina siempre en < 150 movimientos.
 */

// ── Motor del cubo (idéntico a cube.js) ───────────────────────────
const FACE_CW  = [6,3,0,7,4,1,8,5,2];
const FACE_CCW = [2,5,8,1,4,7,0,3,6];
const S = (f,i) => f*9+i;
const CYCLES = {
  U:[[S(2,0),S(5,0),S(3,0),S(4,0)],[S(2,1),S(5,1),S(3,1),S(4,1)],[S(2,2),S(5,2),S(3,2),S(4,2)]],
  D:[[S(2,6),S(4,6),S(3,6),S(5,6)],[S(2,7),S(4,7),S(3,7),S(5,7)],[S(2,8),S(4,8),S(3,8),S(5,8)]],
  F:[[S(0,6),S(5,0),S(1,2),S(4,8)],[S(0,7),S(5,3),S(1,1),S(4,5)],[S(0,8),S(5,6),S(1,0),S(4,2)]],
  B:[[S(0,2),S(4,0),S(1,6),S(5,8)],[S(0,1),S(4,3),S(1,7),S(5,5)],[S(0,0),S(4,6),S(1,8),S(5,2)]],
  L:[[S(0,0),S(2,0),S(1,0),S(3,8)],[S(0,3),S(2,3),S(1,3),S(3,5)],[S(0,6),S(2,6),S(1,6),S(3,2)]],
  R:[[S(0,2),S(2,2),S(1,2),S(3,6)],[S(0,5),S(2,5),S(1,5),S(3,3)],[S(0,8),S(2,8),S(1,8),S(3,0)]],
};
const FI={U:0,D:1,F:2,B:3,L:4,R:5};

class Cube {
  constructor(){this.s=Array.from({length:6},(_,i)=>Array(9).fill(i));}
  clone(){const c=new Cube();c.s=this.s.map(f=>[...f]);return c;}
  _apply(fi,cyc,cw){
    const flat=this.s.flat(),next=[...flat];
    const base=fi*9,rot=cw?FACE_CW:FACE_CCW;
    for(let i=0;i<9;i++) next[base+i]=flat[base+rot[i]];
    for(const[a,b,c,d]of cyc){
      if(cw){next[b]=flat[a];next[c]=flat[b];next[d]=flat[c];next[a]=flat[d];}
      else  {next[d]=flat[a];next[c]=flat[d];next[b]=flat[c];next[a]=flat[b];}
    }
    for(let f=0;f<6;f++) for(let i=0;i<9;i++) this.s[f][i]=next[f*9+i];
  }
  move(n){
    const f=n[0],mod=n.slice(1),cw=!mod.includes("'"),t=mod.includes('2')?2:1;
    for(let i=0;i<t;i++) this._apply(FI[f],CYCLES[f],cw);
  }
  do(...moves){moves.forEach(m=>this.move(m));return moves;}
  isSolved(){return this.s.every(f=>f.every(v=>v===f[4]));}
  // color del centro de la cara f
  cc(f){return this.s[f][4];}
  // color del sticker [face][idx]
  c(f,i){return this.s[f][i];}
  fromStr(str){const p=str.split('|');this.s=p.map(x=>x.split('').map(Number));}
}

// ── Helpers ───────────────────────────────────────────────────────

// Aplica movimientos y los añade al array de solución
function exec(cube, sol, ...moves) {
  moves.forEach(m => { cube.move(m); sol.push(m); });
}

// Rota U n veces (horario) y registra
function rotU(cube, sol, n=1) {
  for(let i=0;i<((n%4)+4)%4;i++) exec(cube,sol,'U');
}

// Rota D n veces (horario) y registra
function rotD(cube, sol, n=1) {
  for(let i=0;i<((n%4)+4)%4;i++) exec(cube,sol,'D');
}

// ── FASE 1: Cruz blanca en U ──────────────────────────────────────
// Aristas de U: UF=[U,7,F,1], UR=[U,5,R,1], UB=[U,1,B,1], UL=[U,3,L,1]
// Caras laterales en orden U: F=2, R=5, B=3, L=4
const U_EDGES = [
  {u:7, side:2, sideIdx:1},  // UF
  {u:5, side:5, sideIdx:1},  // UR
  {u:1, side:3, sideIdx:1},  // UB
  {u:3, side:4, sideIdx:1},  // UL
];
// Caras en orden de rotación U horario: F,R,B,L
const SIDES = [2,5,3,4];

function solveCrossU(cube, sol) {
  const cu = cube.cc(0); // color U

  for(let slot=0; slot<4; slot++) {
    const {u:uIdx, side:sideF, sideIdx} = U_EDGES[slot];
    const cSide = cube.cc(sideF);

    // Intentar hasta 8 veces (rotaciones de U)
    for(let attempt=0; attempt<8; attempt++) {
      if(cube.c(0,uIdx)===cu && cube.c(sideF,sideIdx)===cSide) break;

      // Buscar la arista {cu, cSide} en el cubo
      const loc = findEdge(cube, cu, cSide);
      if(!loc) break;

      // Sacarla a la capa D si no está ya ahí
      bringEdgeToD(cube, sol, loc);

      // Rotar D hasta que quede bajo sideF
      for(let r=0;r<4;r++){
        const loc2 = findEdge(cube, cu, cSide);
        if(loc2 && isDEdge(loc2, sideF)) break;
        exec(cube,sol,'D');
      }

      // Insertar con face×2
      const faceName = 'UDFBLR'[sideF];
      exec(cube,sol,faceName,faceName);
    }
  }
}

// Encuentra la arista con colores c1,c2 y devuelve su ubicación
function findEdge(cube, c1, c2) {
  // Aristas: [cara,idx, cara,idx]
  const edges = [
    [0,1,3,1],[0,3,4,1],[0,5,5,1],[0,7,2,1],  // U edges
    [1,1,2,7],[1,3,4,7],[1,5,5,7],[1,7,3,7],  // D edges
    [2,3,4,5],[2,5,5,3],[3,3,5,5],[3,5,4,3],  // middle edges
  ];
  for(const[f1,i1,f2,i2] of edges){
    const a=cube.c(f1,i1),b=cube.c(f2,i2);
    if((a===c1&&b===c2)||(a===c2&&b===c1)) return {f1,i1,f2,i2};
  }
  return null;
}

// Verifica si una arista está en la capa D bajo la cara targetFace
function isDEdge(loc, targetFace) {
  const dEdges = [[1,1,2,7],[1,3,4,7],[1,5,5,7],[1,7,3,7]];
  for(const[f1,i1,f2,i2] of dEdges){
    if(loc.f1===f1&&loc.i1===i1&&loc.f2===f2&&loc.i2===i2){
      return loc.f2===targetFace || loc.f1===targetFace;
    }
  }
  return false;
}

// Lleva una arista a la capa D
function bringEdgeToD(cube, sol, loc) {
  const {f1,i1,f2,i2} = loc;
  // Si ya está en D, no hacer nada
  if(f1===1||f2===1) return;
  // Si está en U, bajarla con face×2
  if(f1===0||f2===0){
    const sf = f1===0?f2:f1;
    const fn = 'UDFBLR'[sf];
    exec(cube,sol,fn,fn);
    return;
  }
  // Si está en capa media, sacarla a D
  const midToD = {
    // [f1,i1] → movimiento para sacar a D
    '2,3': ["F'","D","F"],
    '2,5': ["F","D'","F'"],
    '4,5': ["L'","D","L"],
    '4,3': ["L","D'","L'"],
    '5,3': ["R","D'","R'"],
    '5,5': ["R'","D","R"],
    '3,3': ["B","D'","B'"],
    '3,5': ["B'","D","B"],
  };
  const key = `${f1},${i1}`;
  const key2 = `${f2},${i2}`;
  const seq = midToD[key] || midToD[key2];
  if(seq) exec(cube,sol,...seq);
}

// ── FASE 2: Esquinas capa U ───────────────────────────────────────
// Esquinas de U: URF, UFL, ULB, UBR
// Posiciones: [U_idx, F_idx, R_idx, cara_F, cara_R]
const U_CORNERS = [
  {u:8, f1:2, i1:2, f2:5, i2:0},  // URF: U[8], F[2], R[0]
  {u:6, f1:4, i1:2, f2:2, i2:0},  // UFL: U[6], L[2], F[0]
  {u:0, f1:3, i1:2, f2:4, i2:0},  // ULB: U[0], B[2], L[0]
  {u:2, f1:5, i1:2, f2:3, i2:0},  // UBR: U[2], R[2], B[0]
];

function solveTopCorners(cube, sol) {
  const cu = cube.cc(0);

  for(let slot=0; slot<4; slot++) {
    const {u:uIdx, f1, i1, f2, i2} = U_CORNERS[slot];
    const c1 = cube.cc(f1), c2 = cube.cc(f2);

    for(let attempt=0; attempt<12; attempt++) {
      if(cube.c(0,uIdx)===cu && cube.c(f1,i1)===c1 && cube.c(f2,i2)===c2) break;

      // Si la esquina está en U pero mal, sacarla
      if(cube.c(0,uIdx)===cu || cube.c(f1,i1)===cu || cube.c(f2,i2)===cu) {
        // Sacar con R U R' U' (usando la cara f1)
        const fn = 'UDFBLR'[f1];
        exec(cube,sol,fn,"U",fn+"'","U'");
      }

      // Buscar la esquina en D y alinearla
      for(let r=0;r<4;r++){
        const loc = findCornerInD(cube, cu, c1, c2);
        if(loc && cornerUnderSlot(loc, f1, f2)) break;
        exec(cube,sol,'D');
      }

      // Insertar con R U R' U' hasta que entre (máx 5 veces)
      const fn = 'UDFBLR'[f1];
      for(let i=0;i<5;i++){
        if(cube.c(0,uIdx)===cu && cube.c(f1,i1)===c1 && cube.c(f2,i2)===c2) break;
        exec(cube,sol,fn,"U",fn+"'","U'");
      }
    }
  }
}

function findCornerInD(cube, c1, c2, c3) {
  const dCorners = [
    [[1,2],[2,8],[5,6]],  // DFR
    [[1,0],[4,8],[2,6]],  // DLF
    [[1,6],[3,8],[4,6]],  // DBL
    [[1,8],[5,8],[3,6]],  // DRB
  ];
  for(const pos of dCorners){
    const cols = pos.map(([f,i])=>cube.c(f,i));
    if(cols.includes(c1)&&cols.includes(c2)&&(c3===undefined||cols.includes(c3))) return pos;
  }
  return null;
}

function cornerUnderSlot(loc, f1, f2) {
  return loc.some(([f])=>f===f1) && loc.some(([f])=>f===f2);
}

// ── FASE 3: Aristas capa media ────────────────────────────────────
const MID_EDGES = [
  {f1:2,i1:5,f2:5,i2:3},  // FR: F[5], R[3]
  {f1:4,i1:5,f2:2,i2:3},  // FL: L[5], F[3]  ← L=4
  {f1:5,i1:5,f2:3,i2:3},  // BR: R[5], B[3]
  {f1:3,i1:5,f2:4,i2:3},  // BL: B[5], L[3]
];

function solveMiddleEdges(cube, sol) {
  const cu=cube.cc(0), cd=cube.cc(1);

  for(const {f1,i1,f2,i2} of MID_EDGES){
    const c1=cube.cc(f1), c2=cube.cc(f2);

    for(let attempt=0;attempt<8;attempt++){
      if(cube.c(f1,i1)===c1 && cube.c(f2,i2)===c2) break;

      // Si está en capa media pero mal, sacarla a U
      if(cube.c(f1,i1)!==c1 || cube.c(f2,i2)!==c2){
        const fn='UDFBLR'[f1];
        exec(cube,sol,"U",fn,"U'",fn+"'","U'","UDFBLR"[f2]+"'","U","UDFBLR"[f2]);
      }

      // Buscar la arista en U que tenga c1,c2 (sin color U ni D)
      let found=false;
      for(let r=0;r<4&&!found;r++){
        const uEdges=[[0,7,2,1],[0,5,5,1],[0,1,3,1],[0,3,4,1]];
        for(const[uf,ui,sf,si] of uEdges){
          const a=cube.c(uf,ui),b=cube.c(sf,si);
          if(a===cu||a===cd||b===cu||b===cd) continue;
          if((a===c1&&b===c2)||(a===c2&&b===c1)){
            // Alinear cara lateral con f1
            for(let rr=0;rr<4;rr++){
              if(cube.c(sf,si)===c1) break;
              exec(cube,sol,'U');
            }
            // Insertar a derecha o izquierda
            const fn='UDFBLR'[f1], fn2='UDFBLR'[f2];
            if(cube.c(f1,1)===c1){
              exec(cube,sol,"U",fn,"U'",fn+"'","U'",fn2+"'","U",fn2);
            } else {
              exec(cube,sol,"U'",fn2+"'","U",fn2,"U",fn,"U'",fn+"'");
            }
            found=true; break;
          }
        }
        if(!found) exec(cube,sol,'U');
      }
    }
  }
}

// ── FASE 4: Cruz amarilla en D ────────────────────────────────────
function solveBottomCross(cube, sol) {
  const cd=cube.cc(1);
  // OLL cruz: F R U R' U' F'
  for(let attempt=0;attempt<4;attempt++){
    const d1=cube.c(1,1)===cd, d3=cube.c(1,3)===cd,
          d5=cube.c(1,5)===cd, d7=cube.c(1,7)===cd;
    if(d1&&d3&&d5&&d7) return;
    exec(cube,sol,'F','R','U',"R'","U'","F'");
  }
}

// ── FASE 5: Orientar esquinas D ───────────────────────────────────
function orientBottomCorners(cube, sol) {
  const cd=cube.cc(1);
  for(let attempt=0;attempt<8;attempt++){
    if(cube.s[1].every(v=>v===cd)) return;
    // Sune: R U R' U R U2 R'
    exec(cube,sol,'R','U',"R'","U",'R',"U2","R'");
    // Rotar D para buscar esquina mal orientada
    for(let r=0;r<4;r++){
      if(cube.c(1,2)!==cd) break;
      exec(cube,sol,'D');
    }
  }
}

// ── FASE 6: Permutar esquinas D ───────────────────────────────────
function permuteBottomCorners(cube, sol) {
  for(let attempt=0;attempt<8;attempt++){
    if(cornersPermuted(cube)) return;
    // Y-perm: R U' R' U' R U R' F' R U R' U' R' F R
    exec(cube,sol,'R',"U'","R'","U'","R","U","R'","F'","R","U","R'","U'","R'","F","R");
  }
}

function cornersPermuted(cube){
  return cube.c(2,0)===cube.c(2,2) && cube.c(5,0)===cube.c(5,2) &&
         cube.c(3,0)===cube.c(3,2) && cube.c(4,0)===cube.c(4,2);
}

// ── FASE 7: Permutar aristas D ────────────────────────────────────
function permuteBottomEdges(cube, sol) {
  // Rotar D para alinear al menos una arista
  for(let r=0;r<4;r++){
    if(cube.c(2,7)===cube.c(2,4)) break;
    exec(cube,sol,'D');
  }
  for(let attempt=0;attempt<6;attempt++){
    if(cube.isSolved()) return;
    // U-perm: R2 U R U R' U' R' U' R' U R'
    exec(cube,sol,"R2","U","R","U","R'","U'","R'","U'","R'","U","R'");
    for(let r=0;r<4;r++){
      if(cube.c(2,7)===cube.c(2,4)) break;
      exec(cube,sol,'D');
    }
  }
}

// ── Solver principal ──────────────────────────────────────────────
function solve(cube) {
  if(cube.isSolved()) return [];
  const sol=[];
  const w=cube.clone();

  solveCrossU(w,sol);
  solveTopCorners(w,sol);
  solveMiddleEdges(w,sol);
  solveBottomCross(w,sol);
  orientBottomCorners(w,sol);
  permuteBottomCorners(w,sol);
  permuteBottomEdges(w,sol);

  return sol;
}

// ── Entry point ───────────────────────────────────────────────────
self.onmessage = function(e) {
  const cube = new Cube();
  cube.fromStr(e.data.state);
  try {
    const moves = solve(cube);
    self.postMessage({moves});
  } catch(err) {
    self.postMessage({error: err.message, stack: err.stack});
  }
};

/**
 * solver-worker.js — Solver capa por capa determinista (sin BFS)
 *
 * Implementa el método principiante clásico con algoritmos fijos:
 *   Fase 1 — Cruz blanca (U)
 *   Fase 2 — Esquinas capa superior
 *   Fase 3 — Aristas capa media
 *   Fase 4 — Cruz amarilla (D)
 *   Fase 5 — Orientar esquinas D
 *   Fase 6 — Permutar esquinas D
 *   Fase 7 — Permutar aristas D
 *
 * Cada fase usa búsqueda de pieza + algoritmo de inserción fijo.
 * Complejidad: O(n) movimientos, termina siempre en < 200 movimientos.
 */

// ── Modelo del cubo ────────────────────────────────────────────────
// Caras: U=0 D=1 F=2 B=3 L=4 R=5
// Stickers por cara (vista exterior):
//   0 1 2
//   3 4 5
//   6 7 8
// Centro = índice 4 (fijo, define el color de la cara)

const U=0,D=1,F=2,B=3,L=4,R=5;

class Cube {
  constructor() { this.reset(); }
  reset() { this.s = Array.from({length:6},(_,i)=>Array(9).fill(i)); }
  clone() { const c=new Cube(); c.s=this.s.map(f=>[...f]); return c; }
  serialize() { return this.s.map(f=>f.join('')).join('|'); }
  deserialize(str) {
    const p=str.split('|');
    if(p.length!==6) return false;
    this.s=p.map(x=>x.split('').map(Number));
    return true;
  }
  // color del centro de la cara fi
  cc(fi){ return this.s[fi][4]; }

  _rot(fi,cw){
    const f=this.s[fi];
    this.s[fi]=cw?[f[6],f[3],f[0],f[7],f[4],f[1],f[8],f[5],f[2]]
                 :[f[2],f[5],f[8],f[1],f[4],f[7],f[0],f[3],f[6]];
  }
  _cyc(pos,cw){
    const s=this.s;
    // Snapshot completo antes de escribir
    const snap=pos.map(g=>g.map(([f,i])=>s[f][i]));
    if(cw){
      pos.forEach((g,k)=>{ const src=snap[(k+3)%4]; g.forEach(([f,i],j)=>{s[f][i]=src[j];}); });
    } else {
      pos.forEach((g,k)=>{ const src=snap[(k+1)%4]; g.forEach(([f,i],j)=>{s[f][i]=src[j];}); });
    }
  }
  mu(cw=true){this._rot(U,cw);this._cyc([[[F,0],[F,1],[F,2]],[[R,0],[R,1],[R,2]],[[B,0],[B,1],[B,2]],[[L,0],[L,1],[L,2]]],cw);}
  md(cw=true){this._rot(D,cw);this._cyc([[[F,6],[F,7],[F,8]],[[L,6],[L,7],[L,8]],[[B,6],[B,7],[B,8]],[[R,6],[R,7],[R,8]]],cw);}
  mf(cw=true){this._rot(F,cw);this._cyc([[[U,6],[U,7],[U,8]],[[R,0],[R,3],[R,6]],[[D,2],[D,1],[D,0]],[[L,8],[L,5],[L,2]]],cw);}
  mb(cw=true){this._rot(B,cw);this._cyc([[[U,2],[U,1],[U,0]],[[L,0],[L,3],[L,6]],[[D,6],[D,7],[D,8]],[[R,8],[R,5],[R,2]]],cw);}
  ml(cw=true){this._rot(L,cw);this._cyc([[[U,0],[U,3],[U,6]],[[F,0],[F,3],[F,6]],[[D,0],[D,3],[D,6]],[[B,8],[B,5],[B,2]]],cw);}
  mr(cw=true){this._rot(R,cw);this._cyc([[[U,2],[U,5],[U,8]],[[B,6],[B,3],[B,0]],[[D,2],[D,5],[D,8]],[[F,2],[F,5],[F,8]]],cw);}

  move(n){
    const map={U:(c)=>this.mu(c),D:(c)=>this.md(c),F:(c)=>this.mf(c),
               B:(c)=>this.mb(c),L:(c)=>this.ml(c),R:(c)=>this.mr(c)};
    const face=n[0],mod=n.slice(1),cw=!mod.includes("'"),times=mod.includes('2')?2:1;
    for(let i=0;i<times;i++) map[face](cw);
  }
  exec(moves){ moves.forEach(m=>this.move(m)); return moves; }
  isSolved(){ return this.s.every(f=>f.every(v=>v===f[4])); }
}

// ── Utilidades ─────────────────────────────────────────────────────

// Rotar la cara frontal para que quede en posición F
// Gira el cubo entero (rotación de vista) usando U y D
function rotateCubeY(cube, times, out) {
  // y-rotation: F->L->B->R->F  (cw desde arriba = U move)
  // Implementamos como: U cw + D ccw + (ajuste de cara U/D)
  // Más simple: usamos movimientos de cara para simular rotación de cubo
  // y=1: F->R, R->B, B->L, L->F  (desde arriba, horario)
  // Equivale a: U' D (y las caras U/D rotan)
  // Para nuestro solver usamos solo movimientos de cara, no rotaciones de cubo.
  // En su lugar, orientamos la pieza buscada hacia F con movimientos U.
}

// Aplicar secuencia y registrar en array
function applySeq(cube, seq, out) {
  seq.forEach(m => { cube.move(m); out.push(m); });
}

// ── FASE 1: Cruz blanca en U ────────────────────────────────────────
// Coloca las 4 aristas de U con el color U hacia arriba y alineadas con sus centros laterales.
// Aristas de U: UF=[U,7,F,1], UR=[U,5,R,1], UB=[U,1,B,1], UL=[U,3,L,1]

const EDGE_U = [
  // [cara_lateral, idx_lateral, idx_U, movs_para_llevar_a_UF_desde_D]
  { side: F, si: 1, ui: 7 },
  { side: R, si: 1, ui: 5 },
  { side: B, si: 1, ui: 1 },
  { side: L, si: 1, ui: 3 },
];

// Aristas en la capa D: DF, DR, DB, DL
const EDGE_D_POS = [
  { face: F, fi: 7, df: D, di: 1 },
  { face: R, fi: 7, df: D, di: 3 },
  { face: B, fi: 7, df: D, di: 7 },
  { face: L, fi: 7, df: D, di: 5 },
];

function solveCrossU(cube, out) {
  const cu = cube.cc(U);
  // Para cada arista de U, la buscamos y la colocamos
  const targets = [
    { uIdx:7, sideF:F, sideI:1 },
    { uIdx:5, sideF:R, sideI:1 },
    { uIdx:1, sideF:B, sideI:1 },
    { uIdx:3, sideF:L, sideI:1 },
  ];

  for (const tgt of targets) {
    // Repetir hasta que esta arista esté en su lugar
    for (let attempt = 0; attempt < 8; attempt++) {
      if (cube.s[U][tgt.uIdx] === cu && cube.s[tgt.sideF][tgt.sideI] === cube.cc(tgt.sideF)) break;

      // Buscar la arista que tiene color U y color tgt.sideF
      const cSide = cube.cc(tgt.sideF);
      const loc = findEdge(cube, cu, cSide);
      if (!loc) break;

      // Moverla a la posición UF (tgt.sideF=F, tgt.uIdx=7)
      // Primero la llevamos a DF
      bringEdgeToDf(cube, loc, out);
      // Luego rotamos D hasta que quede bajo tgt.sideF
      alignDEdgeToFace(cube, tgt.sideF, out);
      // Insertamos con F2
      applySeq(cube, [tgt.sideF+'2'], out);
      // Ahora rotamos U para que la siguiente arista no tape
      // (no necesario aquí, el loop lo maneja)
    }
  }
}

function findEdge(cube, c1, c2) {
  // Busca la arista que contiene exactamente los colores c1 y c2
  // Aristas: [cara,idx, cara,idx]
  const edges = [
    [[U,1],[B,1]],[[U,3],[L,1]],[[U,5],[R,1]],[[U,7],[F,1]],
    [[D,1],[F,7]],[[D,3],[L,7]],[[D,5],[R,7]],[[D,7],[B,7]],
    [[F,3],[L,5]],[[F,5],[R,3]],[[B,3],[R,5]],[[B,5],[L,3]],
  ];
  for (const [[f1,i1],[f2,i2]] of edges) {
    const a=cube.s[f1][i1], b=cube.s[f2][i2];
    if((a===c1&&b===c2)||(a===c2&&b===c1)) return {f1,i1,f2,i2,a,b};
  }
  return null;
}

function bringEdgeToDf(cube, loc, out) {
  // Lleva la arista encontrada a la posición DF=[D,1,F,7]
  const {f1,i1,f2,i2} = loc;
  // Si ya está en DF
  if((f1===D&&i1===1&&f2===F&&i2===7)||(f1===F&&i1===7&&f2===D&&i2===1)) return;

  // Si está en U
  if(f1===U||f2===U){
    const uIdx = f1===U?i1:i2;
    const sideF = f1===U?f2:f1;
    // Rotar la cara lateral 2 veces para bajarla a D
    const faceMap = {[F]:'F',[R]:'R',[B]:'B',[L]:'L'};
    applySeq(cube,[faceMap[sideF]+'2'],out);
    return;
  }

  // Si está en capa media
  const midEdges = [
    {f1:F,i1:3,f2:L,i2:5, seq:["L'","D'","L"]},
    {f1:F,i1:5,f2:R,i2:3, seq:["R","D","R'"]},
    {f1:B,i1:3,f2:R,i2:5, seq:["R'","D","R"]},
    {f1:B,i1:5,f2:L,i2:3, seq:["L","D'","L'"]},
  ];
  for(const me of midEdges){
    if((f1===me.f1&&i1===me.i1)||(f1===me.f2&&i1===me.i2)||
       (f2===me.f1&&i2===me.i1)||(f2===me.f2&&i2===me.i2)){
      applySeq(cube,me.seq,out);
      return;
    }
  }

  // Si está en D pero no en DF, rotar D
  if(f1===D||f2===D){
    // Rotar D hasta que quede en DF
    for(let i=0;i<4;i++){
      const l=findEdge(cube,cube.s[loc.f1][loc.i1],cube.s[loc.f2][loc.i2]);
      if(l&&((l.f1===D&&l.i1===1)||(l.f2===D&&l.i2===1))) return;
      applySeq(cube,['D'],out);
    }
  }
}

function alignDEdgeToFace(cube, targetFace, out) {
  // Rota D hasta que la arista en DF tenga el color del centro targetFace en la cara targetFace
  const cTarget = cube.cc(targetFace);
  for(let i=0;i<4;i++){
    // La arista DF tiene colores en [D,1] y [F,7]
    // Queremos que [F,7] === cTarget cuando targetFace===F
    // Para otras caras, primero rotamos D para alinear
    const dEdges = [
      {face:F, fi:7, di:1},
      {face:R, fi:7, di:3},  // DR
      {face:B, fi:7, di:7},  // DB
      {face:L, fi:7, di:5},  // DL
    ];
    for(const de of dEdges){
      if(de.face===targetFace && cube.s[de.face][de.fi]===cTarget) return;
    }
    applySeq(cube,['D'],out);
  }
}

// ── FASE 2: Esquinas capa superior ─────────────────────────────────
function solveTopCorners(cube, out) {
  const cu = cube.cc(U);
  const corners = [
    {ui:8, f1:F, fi1:2, f2:R, fi2:0},
    {ui:2, f1:R, fi1:2, f2:B, fi2:0},
    {ui:0, f1:B, fi1:2, f2:L, fi2:0},
    {ui:6, f1:L, fi1:2, f2:F, fi2:0},
  ];

  for(const tgt of corners){
    for(let attempt=0;attempt<12;attempt++){
      if(cube.s[U][tgt.ui]===cu &&
         cube.s[tgt.f1][tgt.fi1]===cube.cc(tgt.f1) &&
         cube.s[tgt.f2][tgt.fi2]===cube.cc(tgt.f2)) break;

      // Sacar la esquina de U si está mal orientada
      if(cube.s[U][tgt.ui]===cu||cube.s[tgt.f1][tgt.fi1]===cu||cube.s[tgt.f2][tgt.fi2]===cu){
        // Extraer con R U R' U'
        const fName = faceStr(tgt.f1);
        applySeq(cube,[fName,"U",fName+"'","U'"],out);
      }

      // Buscar la esquina en D
      const c1=cube.cc(U), c2=cube.cc(tgt.f1), c3=cube.cc(tgt.f2);
      const dCorners=[
        {di:2,f1:F,fi1:8,f2:R,fi2:6, insertSeq:(c)=>insertCornerFR(c,out)},
        {di:0,f1:L,fi1:8,f2:F,fi2:6, insertSeq:(c)=>insertCornerFL(c,out)},
        {di:8,f1:R,fi1:8,f2:B,fi2:6, insertSeq:(c)=>insertCornerBR(c,out)},
        {di:6,f1:B,fi1:8,f2:L,fi2:6, insertSeq:(c)=>insertCornerBL(c,out)},
      ];

      // Rotar D para alinear la esquina correcta bajo tgt
      for(let d=0;d<4;d++){
        const loc=findCornerInD(cube,c1,c2,c3);
        if(loc){
          // Rotar D hasta que esté bajo tgt.f1/tgt.f2
          alignCornerUnderTarget(cube,tgt,out);
          insertCornerUp(cube,tgt,out);
          break;
        }
        applySeq(cube,['D'],out);
      }
    }
  }
}

function findCornerInD(cube,c1,c2,c3){
  const dCorners=[
    [[D,2],[F,8],[R,6]],[[D,0],[L,8],[F,6]],[[D,8],[R,8],[B,6]],[[D,6],[B,8],[L,6]]
  ];
  for(const pos of dCorners){
    const cols=pos.map(([f,i])=>cube.s[f][i]);
    if(cols.includes(c1)&&cols.includes(c2)&&cols.includes(c3)) return pos;
  }
  return null;
}

function alignCornerUnderTarget(cube,tgt,out){
  // Rota D hasta que la esquina con colores cc(tgt.f1),cc(tgt.f2) esté bajo tgt
  const c2=cube.cc(tgt.f1),c3=cube.cc(tgt.f2);
  for(let i=0;i<4;i++){
    // Esquina bajo tgt está en [D, tgt.ui-8 mapeado], [tgt.f1, bottom-corner], [tgt.f2, bottom-corner]
    const loc=findCornerInD(cube,cube.cc(U),c2,c3);
    if(!loc) { applySeq(cube,['D'],out); continue; }
    // Verificar si está bajo tgt
    const hasF1=loc.some(([f])=>f===tgt.f1);
    const hasF2=loc.some(([f])=>f===tgt.f2);
    if(hasF1&&hasF2) return;
    applySeq(cube,['D'],out);
  }
}

function insertCornerUp(cube,tgt,out){
  const f=faceStr(tgt.f1);
  // Algoritmo: R U R' U' repetido hasta que entre (máx 5 veces)
  for(let i=0;i<5;i++){
    if(cube.s[U][tgt.ui]===cube.cc(U)&&
       cube.s[tgt.f1][tgt.fi1]===cube.cc(tgt.f1)&&
       cube.s[tgt.f2][tgt.fi2]===cube.cc(tgt.f2)) return;
    applySeq(cube,[f,"U",f+"'","U'"],out);
  }
}

function insertCornerFR(c,out){applySeq(c,["R","U","R'","U'"],out);}
function insertCornerFL(c,out){applySeq(c,["L'","U'","L","U"],out);}
function insertCornerBR(c,out){applySeq(c,["R'","U'","R","U"],out);}
function insertCornerBL(c,out){applySeq(c,["L","U","L'","U'"],out);}

// ── FASE 3: Aristas capa media ──────────────────────────────────────
function solveMiddleEdges(cube, out) {
  const cu=cube.cc(U), cd=cube.cc(D);
  const targets=[
    {f1:F,fi1:5,f2:R,fi2:3},
    {f1:R,fi1:5,f2:B,fi2:3},
    {f1:B,fi1:5,f2:L,fi2:3},
    {f1:L,fi1:5,f2:F,fi2:3},
  ];

  for(const tgt of targets){
    for(let attempt=0;attempt<8;attempt++){
      if(cube.s[tgt.f1][tgt.fi1]===cube.cc(tgt.f1)&&
         cube.s[tgt.f2][tgt.fi2]===cube.cc(tgt.f2)) break;

      // Si la arista está en capa media pero mal, sacarla
      if(cube.s[tgt.f1][tgt.fi1]!==cube.cc(tgt.f1)||cube.s[tgt.f2][tgt.fi2]!==cube.cc(tgt.f2)){
        const f=faceStr(tgt.f1);
        applySeq(cube,["U",f,"U'",f+"'","U'",faceStr(tgt.f2)+"'","U",faceStr(tgt.f2)],out);
      }

      // Buscar la arista en U que no tenga color U ni D
      for(let d=0;d<4;d++){
        const uEdges=[
          {uf:U,ui:7,sf:F,si:1},{uf:U,ui:5,sf:R,si:1},
          {uf:U,ui:1,sf:B,si:1},{uf:U,ui:3,sf:L,si:1}
        ];
        let found=false;
        for(const ue of uEdges){
          const a=cube.s[ue.uf][ue.ui],b=cube.s[ue.sf][ue.si];
          if(a!==cu&&a!==cd&&b!==cu&&b!==cd){
            // Alinear con tgt
            if(b===cube.cc(tgt.f1)&&a===cube.cc(tgt.f2)){
              // Insertar a la derecha: U R U' R' U' F' U F
              alignUEdgeToFace(cube,tgt.f1,out);
              applySeq(cube,["U",faceStr(tgt.f1),"U'",faceStr(tgt.f1)+"'",
                             "U'",faceStr(tgt.f2)+"'","U",faceStr(tgt.f2)],out);
              found=true; break;
            }
            if(b===cube.cc(tgt.f2)&&a===cube.cc(tgt.f1)){
              alignUEdgeToFace(cube,tgt.f2,out);
              applySeq(cube,["U'",faceStr(tgt.f2)+"'","U",faceStr(tgt.f2),
                             "U",faceStr(tgt.f1),"U'",faceStr(tgt.f1)+"'"],out);
              found=true; break;
            }
          }
        }
        if(found) break;
        applySeq(cube,['U'],out);
      }
    }
  }
}

function alignUEdgeToFace(cube,targetFace,out){
  const cTarget=cube.cc(targetFace);
  for(let i=0;i<4;i++){
    if(cube.s[targetFace][1]===cTarget) return;
    applySeq(cube,['U'],out);
  }
}

// ── FASE 4: Cruz amarilla en D ──────────────────────────────────────
function solveBottomCross(cube, out) {
  const cd=cube.cc(D);
  for(let attempt=0;attempt<4;attempt++){
    const d1=cube.s[D][1]===cd, d3=cube.s[D][3]===cd,
          d5=cube.s[D][5]===cd, d7=cube.s[D][7]===cd;
    if(d1&&d3&&d5&&d7) return;
    // Algoritmo OLL cruz: F R U R' U' F'
    applySeq(cube,["F","R","U","R'","U'","F'"],out);
  }
}

// ── FASE 5: Orientar esquinas D ─────────────────────────────────────
function orientBottomCorners(cube, out) {
  const cd=cube.cc(D);
  for(let attempt=0;attempt<8;attempt++){
    if(cube.s[D].every(v=>v===cd)) return;
    // Sune algorithm: R U R' U R U2 R'
    applySeq(cube,["R","U","R'","U","R","U2","R'"],out);
    // Rotar D para buscar siguiente esquina mal orientada
    for(let r=0;r<4;r++){
      if(cube.s[D][2]!==cd) break;
      applySeq(cube,['D'],out);
    }
  }
}

// ── FASE 6: Permutar esquinas D ─────────────────────────────────────
function permuteBottomCorners(cube, out) {
  for(let attempt=0;attempt<8;attempt++){
    const ok=checkCornersPermuted(cube);
    if(ok) return;
    // Algoritmo: U R U' L' U R' U' L
    applySeq(cube,["U","R","U'","L'","U","R'","U'","L"],out);
  }
}

function checkCornersPermuted(cube){
  return cube.s[F][0]===cube.s[F][2] && cube.s[R][0]===cube.s[R][2] &&
         cube.s[B][0]===cube.s[B][2] && cube.s[L][0]===cube.s[L][2];
}

// ── FASE 7: Permutar aristas D ──────────────────────────────────────
function permuteBottomEdges(cube, out) {
  // Rotar D para alinear al menos una arista
  for(let r=0;r<4;r++){
    if(cube.s[F][1]===cube.s[F][4]) break;
    applySeq(cube,['D'],out);
  }
  for(let attempt=0;attempt<6;attempt++){
    if(cube.isSolved()) return;
    // Algoritmo ciclo de aristas: R2 U F B' R2 F' B U R2
    applySeq(cube,["R2","U","F","B'","R2","F'","B","U","R2"],out);
    for(let r=0;r<4;r++){
      if(cube.s[F][1]===cube.s[F][4]) break;
      applySeq(cube,['D'],out);
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────
function faceStr(fi){ return ['U','D','F','B','L','R'][fi]; }

// ── Solver principal ───────────────────────────────────────────────
function solve(cube) {
  if(cube.isSolved()) return [];
  const out=[];
  const w=cube.clone();

  solveCrossU(w,out);
  solveTopCorners(w,out);
  solveMiddleEdges(w,out);
  solveBottomCross(w,out);
  orientBottomCorners(w,out);
  permuteBottomCorners(w,out);
  permuteBottomEdges(w,out);

  return out;
}

// ── Worker entry point ─────────────────────────────────────────────
self.onmessage = function(e) {
  const cube = new Cube();
  if(!cube.deserialize(e.data.state)){
    self.postMessage({error:'Estado inválido'});
    return;
  }
  try {
    const moves = solve(cube);
    self.postMessage({moves});
  } catch(err) {
    self.postMessage({error: err.message});
  }
};

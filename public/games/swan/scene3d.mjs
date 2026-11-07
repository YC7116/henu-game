import * as T from './vendor/three.module.mjs'
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.85,flatShading:true,...extra})
function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function box(p,x,y,z,w,h,d,color){return mesh(p,new T.BoxGeometry(w,h,d),mat(color),x,y,z)}
function ellipsoid(p,x,y,z,sx,sy,sz,color){const m=mesh(p,new T.SphereGeometry(1,12,8),mat(color),x,y,z);m.scale.set(sx,sy,sz);return m}
export function createSwan(){
 const g=new T.Group();g.name='black-swan';
 ellipsoid(g,-.12,.40,0,1.03,.48,.56,0x171e27)
 const tail=mesh(g,new T.ConeGeometry(.35,.9,5),mat(0x111920),-1.06,.51,0);tail.rotation.z=1.15
 for(const side of [-1,1]){
  const wing=new T.Group();wing.name='wing';wing.position.set(-.24,.59,side*.32);g.add(wing)
  for(let i=0;i<8;i++){const f=ellipsoid(wing,-.52+i*.14,.07+Math.sin(i/8*Math.PI)*.13,side*.10,.30,.14,.14,i%2?0x26313d:0x35404c);f.rotation.z=-.38+i*.045;f.rotation.y=side*.25}
  ellipsoid(g,-.2,.72,side*.30,.64,.20,.24,0x222d37)
 }
 const path=new T.CatmullRomCurve3([new T.Vector3(.58,.40,0),new T.Vector3(.83,.81,0),new T.Vector3(.61,1.17,0),new T.Vector3(.62,1.56,0),new T.Vector3(.94,1.78,0),new T.Vector3(1.14,1.62,0)])
 mesh(g,new T.TubeGeometry(path,22,.115,7,false),mat(0x1b2430))
 ellipsoid(g,1.16,1.61,0,.22,.18,.15,0x18212b)
 const beak=mesh(g,new T.ConeGeometry(.095,.38,5),mat(0xb73735),1.43,1.58,0);beak.rotation.z=-Math.PI/2;beak.scale.z=.7
 box(g,1.59,1.58,0,.06,.055,.08,0xf1d5b1)
 for(const side of [-1,1]){ellipsoid(g,1.24,1.68,side*.128,.029,.029,.018,0xcf7350);ellipsoid(g,1.25,1.69,side*.14,.014,.014,.009,0x080d11)}
 g.rotation.y=-.23;return g
}
export function buildWorld(){
 const scene=new T.Scene();scene.background=new T.Color(0xb6d8df);scene.fog=new T.Fog(0xc4ddd2,24,60)
 scene.add(new T.HemisphereLight(0xdcefff,0x63714a,2.5));const sun=new T.DirectionalLight(0xffe3ad,3);sun.position.set(-8,16,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;sun.shadow.normalBias=.04;scene.add(sun)
 const water=mesh(scene,new T.PlaneGeometry(100,100,60,60),mat(0x559c95,{metalness:.24,roughness:.3,transparent:true,opacity:.88,depthWrite:false}),0,-.02,0);water.rotation.x=-Math.PI/2;water.castShadow=false
 box(scene,0,-.1,-11,65,1,10,0x78935b);box(scene,0,.1,-6.5,65,.35,1.4,0xc3b793)
 for(let i=0;i<65;i++)box(scene,-32+i,.35,-5.9,.94,.35,.45,i%2?0xc7bda5:0xb5ad96)
 for(let i=0;i<9;i++){let x=-25+i*6.1;const h=2.9+(i%3)*.6;box(scene,x,h/2+.35,-14,4.9,h,3.8,i%2?0xb57c59:0xe2d7b4);box(scene,x,h+.45,-14,5.2,.28,4.1,0x6b7a73);for(let row=0;row<3;row++)for(let col=0;col<6;col++)box(scene,x-1.9+col*.76,.95+row*.8,-12.07,.42,.5,.035,0x526e78)}
 function tree(x,z,i){box(scene,x,1.1,z,.22,2.2,.25,0x766145);for(let j=0;j<4;j++){const crown=mesh(scene,new T.IcosahedronGeometry(1.1,1),mat([0x608254,0x73954b,0x8ca454,0x527950][(i+j)%4]),x+Math.sin(j*2)*.55,2.2+(j%2)*.6,z+Math.cos(j*2)*.5);crown.scale.y=.85}}
 for(let i=0;i<25;i++)tree(-27+i*2.3,-8.3-(i%3),i)
 box(scene,-7,-.1,5,5,1,8,0x819568);box(scene,7,-.1,5,5,1,8,0x819568)
 for(const side of [-1,1]){for(let i=0;i<8;i++){const x=side*(5.1+(i%3)*.4);box(scene,x,.12,2+i*.6,.8,.4,.5,0x9eaa91);for(let k=0;k<3;k++)box(scene,x+Math.sin(k*3+i)*.25,.45+k*.2,2+i*.6,.06,.8,.06,0x6b8851)}tree(side*6.4,3.4,side===1?2:1)}
 const swan=createSwan();scene.add(swan)
 const reflection=createSwan();reflection.scale.y=-.5;reflection.position.y=-.05;reflection.traverse(o=>{if(o.isMesh){o.material=new T.MeshBasicMaterial({color:0x173f40,transparent:true,opacity:.17,depthWrite:false});o.castShadow=false}});scene.add(reflection)
 const target=createSwan();target.traverse(o=>{if(o.isMesh){o.material=new T.MeshBasicMaterial({color:0xfff3bd,transparent:true,opacity:.18,depthWrite:false});o.castShadow=false;o.receiveShadow=false}});scene.add(target)
 const rings=[];for(let i=0;i<5;i++){const ring=mesh(scene,new T.RingGeometry(.8, .825,48),new T.MeshBasicMaterial({color:0xc8e8ce,transparent:true,opacity:.32,side:T.DoubleSide,depthWrite:false}),0,.025,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;ring.receiveShadow=false;rings.push(ring)}
 const sparkles=[];for(let i=0;i<110;i++){const m=mesh(scene,new T.PlaneGeometry(.12+(i%4)*.09,.025),new T.MeshBasicMaterial({color:i%2?0x9bd1bb:0x75b7aa,transparent:true,opacity:.5,side:T.DoubleSide}),((i*7.31)%26)-13,.03,((i*3.77)%18)-5);m.rotation.x=-Math.PI/2;m.castShadow=false;sparkles.push(m)}
 const camera=new T.PerspectiveCamera(43,640/360,.1,100);camera.position.set(0,4.5,12);camera.lookAt(0,.6,0);camera.updateMatrixWorld()
 return {scene,camera,swan,reflection,target,rings,sparkles,water}
}
export function createScene(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false});renderer.setPixelRatio(1);renderer.setSize(640,360,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15
 const world=buildWorld();const {scene,camera,swan,reflection,target,rings,sparkles,water}=world
 const projected=new T.Vector3(1,0,0).project(camera);const pixelsPerUnit=projected.x*320
 function draw(time,x,active,preview=false){const sec=time/1000;swan.visible=active||preview;reflection.visible=swan.visible;target.visible=!preview;swan.position.x=preview?0:(x-320)/pixelsPerUnit;reflection.position.x=swan.position.x;swan.position.y=Math.sin(sec*2)*.018;swan.rotation.z=Math.sin(sec*1.6)*.012
  if(preview){swan.rotation.y=-.23+Math.sin(sec*.45)*.6}else swan.rotation.y=-.23;reflection.rotation.copy(swan.rotation)
  rings.forEach((r,i)=>{const p=(sec*.45+i/5)%1;r.visible=swan.visible;r.position.x=swan.position.x-.5;r.scale.set(1+p*2,.4+p,1);r.material.opacity=(1-p)*.22})
  sparkles.forEach((s,i)=>s.material.opacity=.18+.28*Math.max(0,Math.sin(sec+i*.7)))
  const pos=water.geometry.attributes.position;for(let i=0;i<pos.count;i++){pos.setZ(i,Math.sin(pos.getX(i)*.7+sec)*Math.cos(pos.getY(i)*.6+sec*.8)*.045)}pos.needsUpdate=true;water.geometry.computeVertexNormals();renderer.render(scene,camera)
 }
 return {draw,world,renderer,pixelsPerUnit}
}

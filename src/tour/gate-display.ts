import T from '../three-vendor'
// @ts-ignore -- local Three.js r160 loader.
import { GLTFLoader } from '../vendor/GLTFLoader.js'
import { asset } from '../asset-path'
export const GATE_DISPLAY_URL=asset('/gate-viewer/index.html')
export const BUILD_STAGES=['铺设基座与庭院','立起门柱与墙体','安装木门与匾额','合拢飞檐与屋瓦']
export function createGateDisplay(x:number,y:number,z:number){
 const root=new T.Group();root.position.set(x,y,z)
 const stone=new T.MeshStandardMaterial({color:'#e1dac6',roughness:.65}),metal=new T.MeshStandardMaterial({color:'#8b7445',metalness:.5,roughness:.4})
 const add=(w:number,h:number,d:number,yy:number,m:any)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.y=yy;o.castShadow=true;o.receiveShadow=true;root.add(o)}
 add(3.2,.16,2.6,.8,stone);add(2.9,.1,2.3,.68,metal);add(2.4,.55,1.8,.35,stone)
 let status:'loading'|'ready'|'building'|'complete'|'error'='loading',elapsed=0,dead=false
 let normalized:any=null,stages:any[]=[],loadId=0
 const dispose=(o:any)=>o?.traverse((n:any)=>{if(n.isMesh){n.geometry?.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material]){for(const k of ['map','normalMap','roughnessMap','metalnessMap'])m?.[k]?.dispose();m?.dispose()}}})
 const load=async()=>{const id=++loadId;status='loading';try{
  const gltf=await new GLTFLoader().loadAsync(asset('/assets/models/henu-south-gate-assembly.glb'))
  if(dead||id!==loadId){dispose(gltf.scene);return}
  const model=gltf.scene;const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());const scale=2.6/size.x
  normalized=new T.Group();normalized.scale.setScalar(scale);normalized.position.set(-center.x*scale,.9-box.min.y*scale,-center.z*scale);normalized.add(model);root.add(normalized)
  model.traverse((o:any)=>{if(Number.isInteger(o.userData?.assemblyStage))stages[o.userData.assemblyStage]=o;if(o.isMesh){o.castShadow=true;o.receiveShadow=true}})
  if(stages.filter(Boolean).length!==4)throw new Error('Assembly groups missing')
  status='ready';stages.forEach(o=>{o.visible=false;o.position.y=0;o.scale.setScalar(1)})
 }catch{if(!dead){if(normalized){root.remove(normalized);dispose(normalized);normalized=null}stages=[];status='error'}}}
 load()
 return {root,near:(px:number,pz:number,feet:number)=>Math.hypot(px-x,pz-z)<3.8&&Math.abs(feet-y)<1.4,
  start(){if(status!=='ready'&&status!=='complete')return;elapsed=0;status='building';stages.forEach(o=>o.visible=false)},
  reset(){elapsed=0;stages.forEach(o=>{o.visible=false;o.position.y=0;o.scale.setScalar(1)});if(status==='complete'||status==='building')status='ready'},
  retry:load,
  state:()=>({status,progress:status==='complete'?1:status==='building'?Math.min(1,elapsed/9):0,stage:Math.min(3,Math.floor(elapsed/2.25))}),
  tick(dt:number){if(status!=='building')return;elapsed+=Math.max(0,Math.min(.1,dt));stages.forEach((o,i)=>{const t=Math.max(0,Math.min(1,(elapsed-i*2.25)/1.8));o.visible=elapsed>=i*2.25;const smooth=t*t*(3-2*t);o.position.y=(1-smooth)*2;o.scale.setScalar(.65+.35*smooth)});if(elapsed>=9){status='complete';stages.forEach(o=>{o.visible=true;o.position.y=0;o.scale.setScalar(1)});try{localStorage.setItem('henu-south-gate-built','1')}catch{}}},
  dispose(){dead=true;loadId++;dispose(root)}
 }
}

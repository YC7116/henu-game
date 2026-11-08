import assert from 'node:assert/strict'
import {createRequire}from'node:module'
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild')
await build({stdin:{contents:"export {default as T} from './src/three-vendor';export * from './src/tour/gate-display'",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:'artifacts/empty-gate-test.mjs',plugins:[{name:'model-fixture',setup(b){b.onLoad({filter:/vendor[\\/]GLTFLoader\.js$/},()=>({contents:'export class GLTFLoader{async loadAsync(){return {scene:globalThis.__gateFixture()}}}',loader:'js'}))}}]})
const {T,createGateDisplay}=await import('../artifacts/empty-gate-test.mjs')
let fixture,reads=0,writes=0
// An existing completion record must not pre-populate the physical table.
globalThis.localStorage={getItem(){reads++;return'1'},setItem(){writes++}}
globalThis.__gateFixture=()=>{fixture=new T.Group();for(let i=0;i<4;i++){const group=new T.Group();group.userData.assemblyStage=i;group.add(new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial()));fixture.add(group)}return fixture}
const d=createGateDisplay(1,21,20.4);await new Promise(r=>setTimeout(r,0))
assert.equal(reads,0);assert.equal(d.state().status,'ready');assert.ok(fixture.children.every(o=>!o.visible));assert.equal(d.state().progress,0)
d.tick(30);assert.equal(d.state().status,'ready');assert.ok(fixture.children.every(o=>!o.visible))
d.start();d.tick(.1);assert.equal(d.state().status,'building');assert.ok(fixture.children[0].visible);assert.ok(!fixture.children[3].visible)
for(let i=0;i<100;i++)d.tick(.1)
assert.equal(d.state().status,'complete');assert.ok(fixture.children.every(o=>o.visible));assert.equal(writes,1)
d.reset();assert.equal(d.state().status,'ready');assert.equal(d.state().progress,0);assert.ok(fixture.children.every(o=>!o.visible))
d.start();d.tick(.1);d.reset();assert.equal(d.state().status,'ready');assert.ok(fixture.children.every(o=>!o.visible));d.dispose()
console.log('PASS: saved completion ignored; empty initial table; no automatic build; click starts stages; completion displays model; leaving resets completed and partial builds. Model loading mocked; browser visual QA separate.')

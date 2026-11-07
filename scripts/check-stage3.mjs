import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
const {build}=createRequire(require.resolve('vite'))('esbuild')
await fs.mkdir('artifacts',{recursive:true})
await build({stdin:{contents:"export * from './src/world'; export * from './src/game-renderer'; export {default as spriteFrames} from './src/sprite-frames.json';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:'artifacts/stage3-check-bundle.mjs'})
const world=await import('../artifacts/stage3-check-bundle.mjs')
const {WORLD,spawn,initialPlayer,blocked,movePlayer,interactions,nearestInteraction,cameraAt,fromPercent,spriteFrames,walkRoute,routeStops,roadDistance,initialDemo,stepRouteDemo}=world
assert.equal(blocked(spawn),false)
assert.equal(blocked(fromPercent(53,44)),true,'library must block movement')
assert.equal(blocked(fromPercent(55,62)),true,'water must block movement')
assert.equal(blocked({x:-10,y:-10}),true)
for(const [direction,input] of [['left',{x:-1,y:0}],['right',{x:1,y:0}],['up',{x:0,y:-1}],['down',{x:0,y:1}]])assert.equal(movePlayer(initialPlayer(),input,1/60).direction,direction)
const straight=movePlayer(initialPlayer(),{x:1,y:0},1/60)
const diagonal=movePlayer(initialPlayer(),{x:1,y:1},1/60)
assert.ok(Math.abs(Math.hypot(straight.x-spawn.x,straight.y-spawn.y)-Math.hypot(diagonal.x-spawn.x,diagonal.y-spawn.y))<.00001,'diagonal speed must match straight speed')
let atWall={...initialPlayer(),...walkRoute[12]}
for(let i=0;i<600;i++)atWall=movePlayer(atWall,{x:0,y:-1},1/60)
assert.ok(!blocked(atWall)&&atWall.y>fromPercent(53,44).y,'cannot tunnel through library')
// Validate the requested journey in order, with the same controller used in
// the browser. Independent reachability over arbitrary grass is insufficient.
assert.deepEqual(routeStops.map(s=>s.id),['gate','library','teaching','stadium','lake','architecture'])
const routes=[]
for(const fps of [30,60,144]){
  let player=initialPlayer(),demo=initialDemo(),ticks=0,previousVisited=player.visited
  const reached=['gate']
  while(!demo.done){
    const result=stepRouteDemo(player,demo,1/fps)
    assert.ok(Math.hypot(result.player.x-player.x,result.player.y-player.y)<=WORLD.speed/fps+.001,'demo may not teleport')
    player=result.player;demo=result.demo;ticks++
    assert.equal(blocked(player),false,'every actual walking step must stay in the paved corridor')
    assert.ok(roadDistance(player)<.01,'automatic walking stays on the road centre')
    if(player.visited!==previousVisited){reached.push(routeStops[player.visited-1].id);previousVisited=player.visited}
    if(ticks>fps*180)throw Error(`Route stalled at waypoint ${demo.index}`)
  }
  assert.deepEqual(reached,routeStops.map(s=>s.id))
  assert.equal(player.visited,6)
  assert.ok(Math.hypot(player.x-walkRoute.at(-1).x,player.y-walkRoute.at(-1).y)<.1)
  routes.push({fps,order:reached,simulatedSeconds:Math.round(ticks/fps*10)/10})
}
// All stop photos and the NPC remain reachable along this same road network.
for(const item of interactions){assert.equal(blocked(item),false);assert.equal(nearestInteraction(item)?.id,item.id)}
// Manual steering can cover the same route in reverse, including every bend.
let manual={...initialPlayer(),...walkRoute.at(-1)}
for(const target of [...walkRoute].reverse()){
  let ticks=0
  while(Math.hypot(manual.x-target.x,manual.y-target.y)>.1){
    const delta={x:target.x-manual.x,y:target.y-manual.y}
    manual=movePlayer(manual,delta,Math.min(1/60,Math.hypot(delta.x,delta.y)/WORLD.speed))
    assert.equal(blocked(manual),false)
    if(++ticks>600)throw Error('Reverse manual route blocked')
  }
}
assert.ok(Math.hypot(manual.x-spawn.x,manual.y-spawn.y)<.1)
// Attempt leaving the corridor over grass, and continue pushing against its
// edge to check that diagonal stepping cannot leak across it.
for(const input of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1},{x:1,y:1}]){
  let player={...initialPlayer(),...walkRoute[40]}
  for(let i=0;i<600;i++){player=movePlayer(player,input,1/60);assert.equal(blocked(player),false)}
}
for(const character of ['boy','girl']){
  const sheet=spriteFrames[character]
  assert.equal(sheet.frames.length,16)
  assert.equal(sheet.frameWidth,256);assert.equal(sheet.frameHeight,384)
  assert.ok(sheet.transparentFraction>.5)
  for(const frame of sheet.frames){assert.ok(frame.width>0&&frame.height>0);assert.ok(frame.x>=0&&frame.y>=0&&frame.x+frame.width<=sheet.sheetWidth&&frame.y+frame.height<=sheet.sheetHeight)}
}
for(const position of [spawn,{x:10,y:10},{x:WORLD.width-10,y:WORLD.height-10}]){const camera=cameraAt(position,1280,640,1.2);assert.ok(camera.x>=0&&camera.y>=0&&camera.x+1280/1.2<=WORLD.width+.001&&camera.y+640/1.2<=WORLD.height+.001)}
const rendererRuntime=process.env.CAMPUS_CANVAS_MODULE
let renderChecked=false
if(rendererRuntime){
  const {createCanvas,loadImage,GlobalFonts}=require(rendererRuntime)
  if(process.env.CAMPUS_FONT_PATH)GlobalFonts.registerFromPath(process.env.CAMPUS_FONT_PATH,'CampusChinese')
  const [campus,corrected,boy,girl,npc]=await Promise.all(['public/assets/scenes/campus.png','public/assets/scenes/campus-v0.1.1.png','public/assets/sprites-v0.3.0/boy.png','public/assets/sprites-v0.3.0/girl.png','public/assets/characters/zhuxiaozhi.png'].map(file=>loadImage(file)))
  for(const character of ['boy','girl']){const canvas=createCanvas(1280,640),ctx=canvas.getContext('2d'),player=initialPlayer();world.renderGame(ctx,{campus,corrected,boy,girl,npc},player,character,cameraAt(player,1280,640,1.2),1.2,1280,640,false,0);await fs.writeFile(`artifacts/stage3-render-${character}.png`,canvas.toBuffer('image/png'))}
  const overview=createCanvas(1672,941),overviewCtx=overview.getContext('2d');overviewCtx.scale(.5,.5);world.renderCampus(overviewCtx,{campus,corrected,boy,girl,npc});world.renderRoadGuide(overviewCtx);await fs.writeFile('artifacts/stage3-route-overview.png',overview.toBuffer('image/png'))
  const sheet=createCanvas(1280,1080),sheetCtx=sheet.getContext('2d')
  for(const [i,stop] of routeStops.entries()){
    const frame=createCanvas(640,360),ctx=frame.getContext('2d'),player={...initialPlayer(),...walkRoute[stop.index],visited:i+1}
    world.renderGame(ctx,{campus,corrected,boy,girl,npc},player,'boy',cameraAt(player,640,360,1.2),1.2,640,360,false,0)
    ctx.fillStyle='#fcf8e9ee';ctx.fillRect(12,12,230,35);ctx.fillStyle='#355b46';ctx.font='16px CampusChinese, sans-serif';ctx.fillText(`${i+1} / 6 · ${stop.number} ${stop.name}`,24,35)
    sheetCtx.drawImage(frame,i%2*640,Math.floor(i/2)*360)
  }
  await fs.writeFile('artifacts/stage3-route-stops.png',sheet.toBuffer('image/png'))
  renderChecked=true
}
await fs.writeFile('artifacts/stage3-validation.json',JSON.stringify({passed:true,routes,roadWaypoints:walkRoute.length,roadBoundaryChecked:true,sprites:{characters:2,directions:4,framesPerDirection:4,sourceCellSize:[256,384]},rendererChecked:renderChecked,browserQA:'Not completed: CUA connection timeout. Physics simulations and native canvas rendering are not browser key-input tests.'},null,2))
console.log('PASS: normalized movement; four directions; road boundaries; six stops in order at 30/60/144 fps; reverse manual walking; no teleportation; camera bounds; 32 sprite frames. Renderer:',renderChecked)
console.log(routes)

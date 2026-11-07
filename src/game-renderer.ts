import spriteFrames from './sprite-frames.json'
import type { Character } from './content'
import { WORLD, interactions, nearestInteraction, walkRoute, routeStops, type PlayerState, type Point } from './world'

export type GameImages = { campus: CanvasImageSource; corrected: CanvasImageSource; boy: CanvasImageSource; girl: CanvasImageSource; npc: CanvasImageSource }
export function renderCampus(ctx: CanvasRenderingContext2D, images: GameImages) {
  ctx.drawImage(images.campus,0,0,WORLD.width,WORLD.height)
  for(const [x,y,w,h] of [[32.5,24.5,7.5,9.5],[1.2,45.7,8.8,12.3]])ctx.drawImage(images.corrected,x/100*1672,y/100*941,w/100*1672,h/100*941,x/100*WORLD.width,y/100*WORLD.height,w/100*WORLD.width,h/100*WORLD.height)
}
function shadow(ctx: CanvasRenderingContext2D,x: number,y: number,width: number) {ctx.fillStyle='#203c354c';ctx.beginPath();ctx.ellipse(x,y+2,width,4,0,0,Math.PI*2);ctx.fill()}
export function drawPlayer(ctx: CanvasRenderingContext2D, image: CanvasImageSource, player: PlayerState, character: Character, moving: boolean) {
  const sheet=spriteFrames[character]
  const row=sheet.directions.indexOf(player.direction)
  const column=moving?Math.floor(player.distance/17)%4:1
  const frame=sheet.frames[row*4+column]
  const w=frame.width*sheet.scale,h=frame.height*sheet.scale
  shadow(ctx,player.x,player.y,11)
  ctx.drawImage(image,frame.x,frame.y,frame.width,frame.height,Math.round(player.x-w/2),Math.round(player.y-h),w,h)
}
export function renderRoadGuide(ctx: CanvasRenderingContext2D) {
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round'
  ctx.beginPath();walkRoute.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y))
  ctx.strokeStyle='#355b46b0';ctx.lineWidth=7;ctx.stroke()
  ctx.strokeStyle='#fff0b8';ctx.lineWidth=3;ctx.setLineDash([5,11]);ctx.stroke();ctx.setLineDash([])
  for(const stop of routeStops){const p=walkRoute[stop.index];ctx.fillStyle='#355b46';ctx.strokeStyle='#fff2c7';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,15,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff2c7';ctx.fillText(stop.number,p.x,p.y)}
  ctx.restore()
}
export function renderGame(ctx: CanvasRenderingContext2D,images: GameImages,player: PlayerState,character: Character,camera: Point,zoom: number,width: number,height: number,moving: boolean,time: number,showGuide=true) {
  ctx.clearRect(0,0,width,height)
  ctx.fillStyle='#a3b583';ctx.fillRect(0,0,width,height)
  ctx.save();ctx.scale(zoom,zoom);ctx.translate(-camera.x,-camera.y);ctx.imageSmoothingEnabled=false
  renderCampus(ctx,images)
  if(showGuide)renderRoadGuide(ctx)
  const nearest=nearestInteraction(player)
  for(const item of interactions){if(item.id==='npc')continue;const close=nearest?.id===item.id;ctx.globalAlpha=close?1:.75;ctx.fillStyle=close?'#fff2b4':'#f4e3ac';ctx.strokeStyle='#526e46';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(item.x,item.y,close?9+Math.sin(time*3)*1.2:6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.globalAlpha=1;}
  const npc=interactions.find(item=>item.id==='npc')!
  const drawNPC=()=>{shadow(ctx,npc.x,npc.y,13);ctx.drawImage(images.npc,npc.x-21,npc.y-60,42,60);ctx.font='11px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#f8f1d9';ctx.strokeText('筑小智',npc.x,npc.y-68);ctx.fillStyle='#35553d';ctx.fillText('筑小智',npc.x,npc.y-68)}
  if(player.y<npc.y){drawPlayer(ctx,images[character],player,character,moving);drawNPC()}else{drawNPC();drawPlayer(ctx,images[character],player,character,moving)}
  ctx.restore()
}

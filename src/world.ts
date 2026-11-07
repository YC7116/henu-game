import type { PlaceId } from './content'
import { roadPoints, routeStops } from './walking-route'
export { roadPoints, routeStops } from './walking-route'

export type Point = { x: number; y: number }
export type Direction = 'down' | 'left' | 'right' | 'up'
export type PlayerState = Point & { direction: Direction; distance: number; visited: number }
export const WORLD = { width: 3344, height: 1882, speed: 165, radius: 7 }
export const fromPercent = (x: number, y: number): Point => ({x:x / 100 * WORLD.width,y:y / 100 * WORLD.height})
export const walkRoute = roadPoints.map(([x,y])=>fromPercent(x,y))
export const spawn = walkRoute[0]
export const initialPlayer = (): PlayerState => ({...spawn,direction:'down',distance:0,visited:1})
const polygon = (points: number[][]) => points.map(([x,y]) => fromPercent(x,y))
// Conservative silhouettes derived from the existing oblique campus artwork, not a surveyed plan.
export const boundary = polygon([[0,53],[36,22],[62,0],[100,37],[100,72],[74,100],[12,93],[0,78]])
export const buildings = [
  [[47,41],[53,36],[59,41],[59,46],[53,51],[47,47]],
  [[32,37],[36,35],[40,39],[40,44],[37,46],[32,42]],
  [[43,28],[49,24],[54,29],[54,34],[49,37],[43,33]],
  [[54,29],[58,27],[61,31],[60,35],[57,36],[54,33]],
  [[60,40],[64,38],[68,42],[68,47],[64,49],[60,46]],
  [[63,20],[68,18],[73,22],[72,27],[67,28],[63,25]],
  [[69,15],[76,16],[83,20],[83,25],[78,27],[70,23]],
  [[61,7],[65,5],[68,8],[68,13],[65,15],[61,12]],
  [[57,16],[61,15],[63,18],[62,21],[58,22],[57,19]],
  [[53,21],[57,19],[60,23],[59,27],[55,28],[53,25]],
  [[80,29],[85,26],[91,31],[91,37],[87,40],[80,35]],
  [[91,32],[95,33],[100,39],[100,45],[95,43],[91,39]],
  [[94,42],[98,40],[100,43],[100,51],[97,52],[94,48]],
  [[74,39],[78,37],[82,41],[82,47],[78,51],[74,46]],
  [[81,44],[85,42],[90,47],[89,51],[85,54],[81,50]],
  [[89,46],[93,43],[97,48],[97,53],[92,57],[89,52]],
  [[57,51],[62,47],[68,51],[71,56],[68,61],[62,63],[56,58]],
  [[66,54],[69,52],[72,54],[73,59],[70,62],[66,60]],
  [[67,68],[72,65],[75,68],[75,74],[71,78],[67,74]],
  [[78,55],[85,51],[90,54],[89,57],[83,59],[79,62]],
  [[29,54],[34,51],[40,55],[40,60],[36,62],[29,58]],
  [[37,55],[41,54],[45,59],[45,64],[41,66],[37,61]],
  [[34,63],[38,61],[45,66],[45,71],[41,74],[34,69]],
  [[43,64],[46,62],[49,65],[49,69],[47,71],[43,68]],
  [[12,54],[16,50],[21,54],[21,58],[17,61],[12,58]],
  [[18,46],[21,43],[25,46],[25,50],[22,53],[18,50]],
  [[19,58],[24,55],[29,59],[29,64],[25,67],[19,63]],
  [[8,64],[13,62],[20,68],[20,73],[16,76],[8,70]],
  [[4,70],[8,67],[14,72],[14,77],[10,80],[4,75]],
  [[15,75],[19,72],[26,78],[26,83],[22,86],[15,81]],
  [[20,66],[24,64],[29,69],[29,73],[26,76],[20,71]],
  [[26,76],[30,73],[35,77],[35,82],[31,85],[26,81]],
  [[31,72],[35,70],[40,73],[40,77],[37,79],[31,76]],
  [[28,68],[31,66],[34,69],[34,73],[31,75],[28,72]],
  [[84,82],[89,78],[94,82],[94,89],[89,93],[84,88]],
  [[75,89],[79,85],[84,89],[84,94],[80,97],[75,94]],
].map(polygon)
export const water = [
  [[31,53],[34,50.5],[38,49.2],[41,49.6],[44,51],[47,52],[49,54],[51,57],[52,60],[51,62],[49.3,64],[49.5,66],[48,67],[46.8,64.5],[48,62],[49.5,60],[49,57],[47,55],[43,53.5],[39,52.5],[35,53.2],[32,55]],
  [[73,35],[76,33.5],[79,34],[82,35.5],[84,36],[87,35.8],[88,38],[86,40.5],[83.5,41],[81,39],[78,38],[76,38],[74,39.5],[72,38]],
  [[51,60],[53,58.5],[56,58.5],[59,60],[61,62],[64,62],[65,65],[68,65],[70,67],[69,69],[66,69],[64,67],[61,67],[59,65],[56,65.5],[54,66.5],[52,65],[50.8,63]],
].map(polygon)
export function pointInPolygon(point: Point, shape: Point[]) {
  let inside = false
  for(let i=0,j=shape.length-1;i<shape.length;j=i++) {
    const a=shape[i],b=shape[j]
    if((a.y>point.y)!==(b.y>point.y) && point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) inside=!inside
  }
  return inside
}
function segmentDistance(p: Point,a: Point,b: Point) {
  const dx=b.x-a.x,dy=b.y-a.y
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)))
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)
}
function nearEdge(point: Point, shape: Point[], radius: number) { return shape.some((p,i)=>segmentDistance(point,p,shape[(i+1)%shape.length])<radius) }
export function blocked(point: Point,radius=WORLD.radius) {
  // This review build uses a continuous, narrowly traced paved corridor.
  // Broad oblique roof silhouettes previously cut across visible footpaths.
  // The corridor replaces those approximate silhouettes as the movement mask;
  // its edges stop the feet before grass, facades and banks, including corners.
  return roadDistance(point)>Math.max(0,19-radius)
}
export function roadDistance(point: Point) {return Math.min(...walkRoute.slice(1).map((p,i)=>segmentDistance(point,walkRoute[i],p)))}
export function visitStops(player: PlayerState): PlayerState {
  const next=routeStops[player.visited]
  return next&&Math.hypot(player.x-walkRoute[next.index].x,player.y-walkRoute[next.index].y)<28 ? {...player,visited:player.visited+1} : player
}
export function movePlayer(player: PlayerState,input: Point,dt: number): PlayerState {
  const length=Math.hypot(input.x,input.y)
  if(!length) return player
  const direction: Direction = Math.abs(input.x)>Math.abs(input.y) ? (input.x<0?'left':'right') : input.y<0?'up':'down'
  const dx=input.x/length*WORLD.speed*Math.min(.05,Math.max(0,dt)),dy=input.y/length*WORLD.speed*Math.min(.05,Math.max(0,dt))
  // Small axis-separated steps avoid tunnelling and allow sliding along walls.
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3))
  let {x,y}=player
  for(let i=0;i<steps;i++){if(!blocked({x:x+dx/steps,y}))x+=dx/steps;if(!blocked({x,y:y+dy/steps}))y+=dy/steps}
  return visitStops({...player,x,y,direction,distance:player.distance+Math.hypot(x-player.x,y-player.y)})
}
export type RouteDemo = { index: number; wait: number; done: boolean }
export const initialDemo = (): RouteDemo => ({index:1,wait:1,done:false})
export function stepRouteDemo(player: PlayerState,demo: RouteDemo,dt: number): {player:PlayerState;demo:RouteDemo} {
  if(demo.done)return {player,demo}
  if(demo.wait>0)return {player,demo:{...demo,wait:Math.max(0,demo.wait-dt)}}
  const target=walkRoute[demo.index],delta={x:target.x-player.x,y:target.y-player.y}
  const distance=Math.hypot(delta.x,delta.y)
  const next=movePlayer(player,delta,Math.min(dt,distance/WORLD.speed))
  if(Math.hypot(next.x-target.x,next.y-target.y)>.00001)return {player:next,demo}
  const last=demo.index===walkRoute.length-1
  return {player:visitStops(next),demo:{index:last?demo.index:demo.index+1,wait:routeStops.some(stop=>stop.index===demo.index)?1.8:0,done:last}}
}
export type Interaction = Point & { id: PlaceId | 'npc'; title: string; radius: number }
export const interactions: Interaction[] = [
  ...routeStops.map(stop=>({id:stop.id,title:stop.name,...walkRoute[stop.index],radius:65})),
  {id:'npc',title:'筑小智',...walkRoute[2],radius:55},
]
export function nearestInteraction(point: Point) { return interactions.filter(item=>Math.hypot(item.x-point.x,item.y-point.y)<=item.radius).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0] ?? null }
export function cameraAt(player: Point,width: number,height: number,zoom: number): Point {
  return {x:Math.max(0,Math.min(WORLD.width-width/zoom,player.x-width/zoom/2)),y:Math.max(0,Math.min(WORLD.height-height/zoom,player.y-height/zoom/2))}
}

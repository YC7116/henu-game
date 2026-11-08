import type { PlaceId } from './content'
import type { PlayerState } from './world'
export type TaskProgress = Partial<Record<PlaceId, boolean>>
// Only this browser tab's journey counts. Legacy test rewards never seed tasks.
const KEY='henu-journey-tasks-v2'
const POSITION='henu-journey-position-v2'
export function readTaskProgress():TaskProgress{
 try{
   const raw=JSON.parse(sessionStorage.getItem(KEY)||'{}')
   const result:TaskProgress={}
   for(const id of ['gate','library','teaching','stadium','lake','architecture'] as PlaceId[])if(raw?.[id]===true)result[id]=true
   return result
 }catch{return {}}
}
export function completeTask(previous:TaskProgress,id:PlaceId):TaskProgress{
 if(previous[id])return previous
 const next={...previous,[id]:true}
 try{sessionStorage.setItem(KEY,JSON.stringify(next))}catch{/* Session memory still works. */}
 return next
}
export function resetJourney():TaskProgress{
 try{sessionStorage.setItem(KEY,'{}');sessionStorage.removeItem(POSITION)}catch{/* Keep in-memory reset usable. */}
 // These are activity reward records, not personal settings or best race times.
 for(const key of ['henu-library-module','henu-lake-module','henu-stadium-fragments','henu-south-gate-built']){
   try{localStorage.removeItem(key)}catch{/* Optional compatibility cleanup. */}
 }
 return {}
}
export function saveJourneyPosition(player:PlayerState){try{sessionStorage.setItem(POSITION,JSON.stringify(player))}catch{/* Optional position recovery. */}}
export function readJourneyPosition(fallback:PlayerState):PlayerState{
 try{
   const value=JSON.parse(sessionStorage.getItem(POSITION)||'null')
   if(value&&Number.isFinite(value.x)&&Number.isFinite(value.y)&&Number.isFinite(value.distance)&&value.distance>=0&&Number.isInteger(value.visited)&&value.visited>=1&&value.visited<=6&&['up','down','left','right'].includes(value.direction))return value
 }catch{/* Start at west gate if storage is unavailable. */}
 return fallback
}

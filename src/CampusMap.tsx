import CampusArtwork from './CampusArtwork'
import RouteGuide from './RouteGuide'
import { places, type PlaceId } from './content'
import { WORLD, type Point } from './world'

export default function CampusMap({onEnter,onPlace,introductory,onReturn,player}:{onEnter:()=>void;onPlace:(id:PlaceId)=>void;introductory:boolean;onReturn?:()=>void;player?:Point}) {
  return <section className="campus-screen continuous-map scene-enter" aria-label="校园全景">
    <div className="campus-map">
      <CampusArtwork className="campus-map-image" label="金明校区全景，六处地标及道路、水系、绿地"/>
      <RouteGuide/>
      {places.map(place=><button key={place.id} className="map-pin" style={{left:`${place.x}%`,top:`${place.y}%`}} onClick={()=>onPlace(place.id)} aria-label={`查看${place.number}${place.name}`}><span>{place.number}</span><b>{place.name}</b></button>)}
      {player&&<div className="player-map-dot" style={{left:`${player.x/WORLD.width*100}%`,top:`${player.y/WORLD.height*100}%`}} aria-label="你的位置"><i/><span>你在这里</span></div>}
    </div>
    <div className="map-heading"><span className="eyebrow">JINMING · CAMPUS WALK</span><h2>{introductory?'从西门，走进金明。':'金明 · 步行路线'}</h2><p>西大门 → 图书馆 → 综合教学楼<br/>体育场 → 校园水系 → 建筑工程学院</p></div>
    <div className="map-explore-action"><button className="button button-primary" onClick={onReturn||onEnter}>{onReturn?'返回原位置继续探索':'进入校园路线试玩'} →</button><span>WASD / 方向键移动 · E / 空格交互 · M 全景</span></div>
  </section>
}

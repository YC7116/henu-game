import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import CampusArtwork from './CampusArtwork'
import RouteGuide from './RouteGuide'
import { type Character, type PlaceId } from './content'
import { cameraAt, initialPlayer, initialDemo, stepRouteDemo, movePlayer, nearestInteraction, routeStops, WORLD, type RouteDemo, type Interaction, type PlayerState } from './world'
import { renderGame, type GameImages } from './game-renderer'

export default function ExploreGame({character,playerStore,paused,onInteract,onMap}:{character:Character;playerStore:MutableRefObject<PlayerState>;paused:boolean;onInteract:(id:PlaceId|'npc')=>void;onMap:()=>void}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  const keys=useRef(new Set<string>())
  const interact=useRef(onInteract)
  const suspended=useRef(paused)
  const demo=useRef<RouteDemo|null>(null)
  const guide=useRef(true)
  const [demonstrating,setDemonstrating]=useState(false)
  const [showGuide,setShowGuide]=useState(true)
  const [nearby,setNearby]=useState<Interaction|null>(null)
  const [position,setPosition]=useState({...playerStore.current})
  const [ready,setReady]=useState(false)
  const [failed,setFailed]=useState(false)
  useEffect(()=>{interact.current=onInteract},[onInteract])
  useEffect(()=>{suspended.current=paused;keys.current.clear();if(!paused)canvas.current?.focus({preventScroll:true})},[paused])
  useEffect(()=>{
    const element=canvas.current!
    const ctx=element.getContext('2d')
    if(!ctx){setFailed(true);return}
    let cancelled=false,frame=0,last=0,uiTime=0
    let width=element.clientWidth,height=element.clientHeight
    let camera=cameraAt(playerStore.current,width,height,1.2)
    const resize=()=>{width=element.clientWidth;height=element.clientHeight;const dpr=Math.min(window.devicePixelRatio||1,2);element.width=Math.round(width*dpr);element.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);camera=cameraAt(playerStore.current,width,height,width<600?1:1.2)}
    const observer=new ResizeObserver(resize);observer.observe(element);resize()
    const clear=()=>keys.current.clear()
    const down=(event:KeyboardEvent)=>{
      if(suspended.current || document.hidden || event.metaKey||event.ctrlKey||event.altKey || (event.target as HTMLElement)?.closest('input,textarea,select,dialog,[contenteditable="true"]'))return
      const key=event.key.toLowerCase()
      if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){event.preventDefault();demo.current=null;setDemonstrating(false);keys.current.add(key)}
      if((key==='e'||key===' ')&&!event.repeat){if(key===' '&&(event.target as HTMLElement)?.closest('button'))return;event.preventDefault();const target=nearestInteraction(playerStore.current);if(target)interact.current(target.id)}
    }
    const up=(event:KeyboardEvent)=>keys.current.delete(event.key.toLowerCase())
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear)
    const load=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src})
    Promise.all(['/assets/scenes/campus.png','/assets/scenes/campus-v0.1.1.png','/assets/sprites-v0.3.0/boy.png','/assets/sprites-v0.3.0/girl.png','/assets/characters/zhuxiaozhi.png'].map(load)).then(([campus,corrected,boy,girl,npc])=>{
      if(cancelled)return
      const images:GameImages={campus,corrected,boy,girl,npc}
      setReady(true);element.focus({preventScroll:true})
      const tick=(timestamp:number)=>{
        if(cancelled)return
        const dt=last?Math.min((timestamp-last)/1000,.05):0;last=timestamp
        const pressed=keys.current
        const x=Number(pressed.has('d')||pressed.has('arrowright'))-Number(pressed.has('a')||pressed.has('arrowleft'))
        const y=Number(pressed.has('s')||pressed.has('arrowdown'))-Number(pressed.has('w')||pressed.has('arrowup'))
        const previous=playerStore.current
        let next=previous
        if(!suspended.current&&!document.hidden){
          if(demo.current){const result=stepRouteDemo(previous,demo.current,dt);next=result.player;demo.current=result.demo;if(result.demo.done){demo.current=null;setDemonstrating(false)}}
          else next=movePlayer(previous,{x,y},dt)
        }
        playerStore.current=next
        const zoom=width<600?1:1.2,target=cameraAt(next,width,height,zoom)
        const follow=1-Math.exp(-dt*10);camera={x:camera.x+(target.x-camera.x)*follow,y:camera.y+(target.y-camera.y)*follow}
        renderGame(ctx,images,next,character,camera,zoom,width,height,next.distance!==previous.distance,timestamp/1000,guide.current)
        if(timestamp-uiTime>140){setPosition({...next});setNearby(nearestInteraction(next));uiTime=timestamp}
        frame=requestAnimationFrame(tick)
      }
      frame=requestAnimationFrame(tick)
    }).catch(()=>{if(!cancelled)setFailed(true)})
    return()=>{cancelled=true;cancelAnimationFrame(frame);observer.disconnect();keys.current.clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear)}
  },[character,playerStore])
  function reset(){playerStore.current=initialPlayer();demo.current=null;setDemonstrating(false);keys.current.clear();canvas.current?.focus({preventScroll:true})}
  function startDemo(){reset();demo.current=initialDemo();setDemonstrating(true)}
  const destination=routeStops[position.visited]
  return <section className="explore-game" aria-label="校园步行路线试玩">
    <canvas ref={canvas} className="explore-canvas" tabIndex={0} aria-label="WASD或方向键移动，靠近金色交互点后按E或空格，M查看校园全景"/>
    {!ready&&!failed&&<div className="game-loading" role="status">正在展开校园……</div>}
    {failed&&<div className="game-loading" role="alert">图片加载失败。<button onClick={()=>window.location.reload()}>重新载入</button></div>}
    <div className="explore-help"><span>{destination?`下一站 · ${destination.name}`:'已走完全程 · 建筑工程学院'}</span><small>{demonstrating?'正在沿路演示 · 方向键可随时接管':'WASD / 方向键沿路移动 · E / 空格交互'}</small><div className="walk-progress" aria-label={`已到达${position.visited}处地标，共6处`}>{routeStops.map((stop,i)=><i key={stop.id} className={i<position.visited?'visited':i===position.visited?'next':''} title={stop.name}>{stop.number}</i>)}</div></div>
    <div className="route-actions"><button disabled={!ready||paused} onClick={demonstrating?()=>{demo.current=null;setDemonstrating(false)}:startDemo}>{demonstrating?'暂停演示，自己走':'从西门演示全程'}</button><button aria-pressed={showGuide} onClick={()=>{guide.current=!guide.current;setShowGuide(guide.current)}}>{showGuide?'隐藏路线':'显示路线'}</button></div>
    <button className="explore-minimap" onClick={onMap} aria-label="查看校园全景与当前位置"><CampusArtwork/><RouteGuide/><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><circle cx={position.x/WORLD.width*100} cy={position.y/WORLD.height*100} r="1.5"/></svg><span>校园全景 · M</span></button>
    {nearby&&!paused&&<button className="interaction-prompt" onClick={()=>interact.current(nearby.id)}><kbd>E</kbd><span>{nearby.id==='npc'?'与筑小智交谈':`查看${nearby.title}`}</span><small>或按空格</small></button>}
    {!nearby&&!paused&&ready&&<div className="explore-tip">{demonstrating?'沿路行走中 · 每处地标稍作停留，可按 E 查看':'沿虚线走到下一站，也可点击“从西门演示全程”'}</div>}
    <button className="reset-walk" disabled={paused} onClick={reset}>回到西门</button>
    <div className="touch-controls" aria-label="屏幕方向控制">{[['arrowup','↑'],['arrowleft','←'],['arrowdown','↓'],['arrowright','→']].map(([key,label])=><button key={key} aria-label={`向${label}移动`} onPointerDown={e=>{e.preventDefault();demo.current=null;setDemonstrating(false);e.currentTarget.setPointerCapture(e.pointerId);keys.current.add(key)}} onPointerUp={()=>keys.current.delete(key)} onPointerCancel={()=>keys.current.delete(key)} onLostPointerCapture={()=>keys.current.delete(key)}>{label}</button>)}</div>
  </section>
}

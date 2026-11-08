import { useEffect, useRef, useState, lazy, Suspense, type ReactNode } from 'react'
import CampusArtwork from './CampusArtwork'
import PhotoViewer from './PhotoViewer'
import { readTaskProgress, completeTask, resetJourney, readJourneyPosition, saveJourneyPosition } from './task-progress'
import CampusMap from './CampusMap'
import ExploreGame from './ExploreGame'
import LibraryMission from './LibraryMission'
import SwanMission from './SwanMission'
import RoomScene, { emptyProgress, type RoomProgress } from './rooms/RoomScene'
import { teachingRooms } from './rooms/teachingBuilding'
import type { RoomConfig, RoomEntrance } from './rooms/types'
import { initialPlayer, type PlayerState } from './world'
import { campusImage, libraryImage, places, sampleDialogue, repeatGateDialogue, lakeDialogue, repeatLakeDialogue, type Character, type PlaceId } from './content'

const FirstPersonTour=lazy(()=>import('./tour/FirstPersonTour'))
const StadiumRun=lazy(()=>import('./tour/StadiumRun'))

type View = 'home' | 'characters' | 'campus' | 'dialogue' | 'play' | 'library' | 'swan' | 'room'
type DialogueKind = 'gate' | 'lake'
const dialogueFor = (kind: DialogueKind, repeat: boolean) => kind === 'lake' ? (repeat ? repeatLakeDialogue : lakeDialogue) : (repeat ? repeatGateDialogue : sampleDialogue)

const ROOMS: Record<string, RoomConfig> = Object.fromEntries(teachingRooms.map(room => [room.id, room]))
const ENTRY_ROOM = teachingRooms[0].id
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    leaf: <><path d="M20 4C9 2 3 8 5 15c1 5 8 6 11 2 3-4 4-13 4-13Z"/><path d="m4 21 11-11M9 16v-5m0 5h5"/></>,
    map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16M15 5v16"/></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    book: <><path d="M12 5C9 2 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15"/></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
    check: <path d="m5 12 5 5L20 7"/>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
    back: <path d="M20 12H4m6-6-6 6 6 6"/>,
    chat: <><path d="M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0Z"/><path d="M7 10h10m-10 4h6"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.leaf}</svg>
}
function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close() }, [])
  return <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="modal-heading"><div><span className="eyebrow">STAGE 03 · CAMPUS EXPLORATION</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭"><Icon name="close"/></button></div>
    {children}
  </dialog>
}
const characterNames: Record<Character, string> = { boy: '男大学生', girl: '女大学生' }

export default function App() {
  const [tasks,setTasks]=useState(readTaskProgress)
  function markTask(id:PlaceId){setTasks(previous=>completeTask(previous,id))}
  const [photoOpen,setPhotoOpen]=useState(false)
  const [isFullscreen,setIsFullscreen]=useState(false)
  const [tour,setTour]=useState<'entry'|'stadium'|null>(null)
  const [view, setView] = useState<View>('home')
  const [swanReturn, setSwanReturn] = useState<'play' | 'campus'>('play')
  const libraryComplete=!!tasks.library
  const playerStore = useRef<PlayerState>(readJourneyPosition(initialPlayer()))
  const [mapReturn, setMapReturn] = useState<View>('home')
  const [dialogueReturn, setDialogueReturn] = useState<View>('campus')
  const [introductory, setIntroductory] = useState(false)
  const [character, setCharacter] = useState<Character>('boy')
  const [dialogueIndex, setDialogueIndex] = useState(0)
  const [dialogueDone, setDialogueDone] = useState(false)
  const gateMet=!!tasks.gate
  const [gateRepeat,setGateRepeat] = useState(false)
  const [dialogueKind, setDialogueKind] = useState<DialogueKind>('gate')
  const lakeComplete=!!tasks.lake
  const [place, setPlace] = useState<PlaceId | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [showNotes, setShowNotes] = useState(false)
  const [toast, setToast] = useState('')
  const [roomId, setRoomId] = useState(ENTRY_ROOM)
  const [roomEntrance, setRoomEntrance] = useState<RoomEntrance | undefined>()
  function goRoom(id: string, entrance?: RoomEntrance) {
    setRoomEntrance(entrance)
    setRoomId(id)
  }
  const [roomProgress, setRoomProgress] = useState<Record<string, RoomProgress>>({})
  const [roomReturn, setRoomReturn] = useState<View>('play')
  const stage = useRef<HTMLElement>(null)
  const currentPlace = places.find(p => p.id === place)
  const currentPhoto = currentPlace?.photos?.[photoIndex] ?? currentPlace?.photos?.[0]
  const currentCrop = currentPhoto ? currentPhoto.crop : currentPlace?.crop
  function startSwan() { setSwanReturn((view === 'dialogue' ? dialogueReturn : view) === 'campus' ? 'campus' : 'play'); go('swan') }
  function exitSwan() { go(swanReturn); openPlace('lake') }
  function openPlace(id: PlaceId) { setPhotoIndex(0); setPlace(id) }
  function go(next: View) { setTour(null); setPlace(null); setIntroductory(false); setView(next) }
  function openMap() { setMapReturn(view === 'campus' ? mapReturn : view); go('campus') }
  function closeMap() { go(mapReturn) }
  function startJourney() { setTasks(resetJourney());setRoomProgress({});setRoomId(ENTRY_ROOM);setDialogueIndex(0);setDialogueDone(false);setGateRepeat(false);setTour(null);setPhotoOpen(false);setMapReturn('characters');playerStore.current=initialPlayer();saveJourneyPosition(playerStore.current);setPlace(null);setIntroductory(true);setView('campus') }
  useEffect(()=>{
    const save=()=>saveJourneyPosition(playerStore.current)
    const timer=window.setInterval(save,1000)
    window.addEventListener('pagehide',save)
    return()=>{window.clearInterval(timer);window.removeEventListener('pagehide',save);save()}
  },[])
  function startExploring() { go('play') }
  function enterRoom() {
    setRoomReturn(view === 'play' ? 'play' : 'campus')
    goRoom(ENTRY_ROOM, { fromRoom: 'campus' })
    setPlace(null)
    setView('room')
  }
  function leaveRoom() {
    setPlace(null)
    setView(roomReturn)
  }
  function interactWith(id: PlaceId | 'npc') { if (id === 'npc') startDialogue(gateMet); else openPlace(id) }

  function startDialogue(repeat = false, kind: DialogueKind = 'gate') { setDialogueKind(kind); setGateRepeat(repeat); if (view !== 'dialogue') setDialogueReturn(view === 'play' ? 'play' : 'campus'); setDialogueIndex(0); setDialogueDone(false); go('dialogue') }
  function previousDialogue(){if(dialogueDone)setDialogueDone(false);else setDialogueIndex(i=>Math.max(0,i-1))}
  function advanceDialogue() {
    if (dialogueDone) return
    if (dialogueIndex < dialogueFor(dialogueKind, gateRepeat).length - 1) setDialogueIndex(i => i + 1)
    else { setDialogueDone(true); if (!gateRepeat) { if (dialogueKind === 'gate') {markTask('gate')}; /* Lake reward is granted by the photography result dialogue. */ } }
  }
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (tour) return
      if (document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
      const target = event.target as HTMLElement
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      if (view === 'swan') { if(event.key === 'Escape') exitSwan(); return }
      if (view === 'library') { if(event.key === 'Escape') go('play'); return }
      if (view === 'room') return
      if (event.key.toLowerCase() === 'm') { event.preventDefault(); view === 'campus' ? closeMap() : openMap() }
      if (event.key === 'Escape') { if (place) setPlace(null); else if (view === 'campus') closeMap(); else if (view === 'play') openMap(); else if (view === 'dialogue') go(dialogueReturn); else go('home') }
      if(view==='dialogue'&&event.key==='ArrowLeft'){event.preventDefault();previousDialogue();return}
      if(view==='dialogue'&&event.key==='ArrowRight'){event.preventDefault();if(!dialogueDone&&dialogueIndex<dialogueLines.length-1)setDialogueIndex(i=>i+1);return}
      if (view === 'dialogue' && ['e', 'E', ' '].includes(event.key)) {
        event.preventDefault(); if(dialogueDone&&event.key===' ')go(dialogueReturn);else advanceDialogue()
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [view, place, dialogueIndex, dialogueDone, mapReturn, dialogueReturn, swanReturn, tour])
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 3000); return () => clearTimeout(id) }, [toast])
  useEffect(()=>{const changed=()=>setIsFullscreen(document.fullscreenElement===stage.current);document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed)},[])
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.current?.requestFullscreen() }
    catch { setToast('当前浏览器暂不支持全屏，请放大窗口预览。') }
  }
  const dialogueLines = dialogueFor(dialogueKind, gateRepeat)
  const activeDialogue = dialogueLines[dialogueIndex]
  return <div className="app">
    <header className="site-header">
      <button className="brand" onClick={() => go('home')} aria-label="回到游戏首页"><span className="brand-mark"><img src="/favicon.svg" alt=""/></span><span>河大寻迹<small>JINMING ADVENTURE</small></span></button>
      <nav aria-label="原型场景导航">
        {([['home', '序章'], ['campus', '校园一览'], ['play', '路线试玩'], ['characters', '角色手册'], ['dialogue', '遇见筑小智']] as [View, string][]).map(([id, label]) => <button key={id} aria-current={view === id ? 'page' : undefined} onClick={() => id === 'dialogue' ? startDialogue() : id === 'campus' ? openMap() : id === 'play' ? startExploring() : go(id)} className={view === id ? 'nav-active' : ''}>{label}</button>)}
      </nav>
      <button className="phase-badge" onClick={() => setShowNotes(true)}><span className="status-dot"/>阶段 3 · 路线试玩<Icon name="info" size={15}/></button>
    </header>

    <main className={`game-shell view-${view}`} ref={stage} data-fullscreen={isFullscreen}>
      <div className="scene-image" key={view} style={{ backgroundImage: view === 'dialogue' ? `url('${dialogueKind === 'lake' ? '/assets/scenes/swan-lakeside.png' : '/assets/landmarks-v0.1.2/university-name.png'}')` : undefined }}>
        {view !== 'dialogue' && <CampusArtwork className="campus-backdrop"/>}
      </div>
      <div className="scene-shade"/>
      <div className="ambient" aria-hidden="true">{Array.from({length: 7}, (_, i) => <i key={i} style={{left: `${12 + i * 13}%`, animationDelay: `${-i * 2.2}s`}}/>)}</div>
      <div className="scene-topbar">
        <div className="location-chip"><Icon name="pin" size={17}/><span>{view === 'dialogue' ? (dialogueKind === 'lake' ? '金明校区 · 校园水系' : '金明校区 · 西大门') : view === 'play' ? '金明校区 · 沿路寻迹' : '河南大学 · 金明校区'}<small>{view === 'dialogue' ? (dialogueKind === 'lake' ? '水岸边的对话' : '与筑小智初遇') : '一段校园里的温柔冒险'}</small></span></div>
        <div className="scene-tools"><span className="weather"><Icon name="sun" size={19}/><span>晴日<small>视觉样张</small></span></span><button className="scene-tool" onClick={() => view === 'campus' ? closeMap() : openMap()} aria-label="查看校园全景" title="校园全景 (M)"><Icon name="map"/></button><button className="scene-tool fullscreen" onClick={fullscreen} aria-label="切换全屏" title="全屏预览"><Icon name="expand"/></button></div>
      </div>

      {view === 'home' && <section className="home-content scene-enter" aria-labelledby="game-title">
        <div className="home-kicker"><span/> HENAN UNIVERSITY · JINMING <span/></div>
        <p className="title-prelude">在熟悉的校园，发现未读的故事</p>
        <h1 id="game-title">河大寻迹<span>金明秘境</span></h1>
        <div className="title-divider"><span/><Icon name="leaf" size={21}/><span/></div>
        <p className="home-subtitle">风吹过树梢，故事藏在转角。<br/>和筑小智一起，重新认识这片校园。</p>
        <button className="button button-primary start-button" onClick={() => go('characters')}><span className="tiny-spark">✦</span>开启寻迹<Icon name="arrow" size={20}/></button>
        <button className="button button-quiet" onClick={openMap}><Icon name="map" size={17}/>先逛逛校园</button>
        <p className="home-caption">温馨校园 · 轻度神秘 · 像素探索</p>
      </section>}

      {view === 'characters' && <section className="character-screen scene-enter">
        <div className="section-heading"><span className="eyebrow">YOUR STORY BEGINS HERE</span><h2>你好，河大同学。</h2><p>选一个熟悉的身影，带着好奇心出发。</p></div>
        <div className="character-options">
          {(['boy', 'girl'] as Character[]).map((id, i) => <button className={`character-card ${character === id ? 'selected' : ''}`} onClick={() => setCharacter(id)} key={id} aria-pressed={character === id}>
            <span className="character-number">0{i + 1}<small>HENU STUDENT</small></span><span className="selection-indicator">{character === id && <Icon name="check" size={16}/>}</span>
            <div className="character-art"><span className="character-halo"/><img src={`/assets/characters/${id}.png`} alt={`${characterNames[id]}：蓝色外套、背包、${id === 'girl' ? '棕色马尾' : '棕色短发'}`}/><span className="character-ground"/></div>
            <h3>{characterNames[id]}</h3><p>{id === 'boy' ? '蓝白外套 · 轻装出发' : '清爽马尾 · 背上好奇心'}</p><span className="character-selected-label">{character === id ? '已选择 · 就是你了' : '点击选择'}</span>
          </button>)}
        </div>
        <div className="character-actions"><button className="button button-primary" onClick={startJourney}>选择这个形象<Icon name="arrow" size={19}/></button><span>探索时使用四方向行走形象 · 可随时返回更换角色</span></div>
      </section>}

      {view === 'campus' && <CampusMap onEnter={startExploring} onPlace={openPlace} introductory={introductory} player={mapReturn === 'play' ? playerStore.current : undefined} onReturn={mapReturn === 'play' && !introductory ? closeMap : undefined}/>}
      {view === 'play' && <ExploreGame onRestart={startJourney} completed={tasks} character={character} playerStore={playerStore} paused={!!place || showNotes || !!tour} onInteract={interactWith} onMap={openMap}/>}
      {view === 'room' && <RoomScene key={roomId} room={ROOMS[roomId]} character={character} progress={roomProgress[roomId] ?? emptyProgress} teacherTaskCompleted={!!roomProgress['classroom-303']?.flags.quizPassed} entrance={roomEntrance} onProgress={next => {setRoomProgress(prev => ({ ...prev, [roomId]: next }));if(roomId==='classroom-202'&&next.done)markTask('teaching')}} onGoRoom={goRoom} onExit={leaveRoom}/>}

      {view === 'swan' && <SwanMission remainingTasks={places.filter(p=>['library','teaching','stadium'].includes(p.id)&&!tasks[p.id]).map(p=>p.name)} character={character} completed={lakeComplete} onComplete={()=>{markTask('lake');try{localStorage.setItem('henu-lake-module','1')}catch{/* Keep session progress. */}}} onExit={exitSwan}/>}

      {view === 'library' && <LibraryMission character={character} completed={libraryComplete} onComplete={()=>{markTask('library');try{localStorage.setItem('henu-library-module','1')}catch{/* Current session remains available. */}}} onExit={()=>go('play')}/>}

      {view === 'dialogue' && <section className={`dialogue-screen scene-enter ${dialogueKind === 'lake' ? 'water-dialogue' : ''}`} aria-label={dialogueKind === 'lake' ? '校园水系偶遇筑小智' : '西大门初遇筑小智'}>
        <div className="dialogue-label"><span className="status-dot"/>{dialogueKind === 'lake' ? '水岸偶遇' : '西门初遇'}<small>{dialogueKind === 'lake' ? '校园水系 · 筑小智' : '校园探索 · 筑小智'}</small></div>
        <div className="scene-actors"><div className="actor player-actor"><span className="actor-name">你 · {characterNames[character]}</span><img src={`/assets/characters/${character}.png`} alt="所选择的玩家形象"/></div><div className="actor npc-actor"><span className="greeting-bubble">{dialogueKind === 'lake' ? '水边见！' : '校园里见！'}</span><img src="/assets/characters/zhuxiaozhi.png" alt="筑小智，持蓝色发光建筑模型的校园知识守护者"/></div></div>
        <div className="dialogue-box" aria-live="polite">
          <div className="dialogue-portrait"><img src={`/assets/characters/${activeDialogue.speaker === '你' ? character : 'zhuxiaozhi'}.png`} alt=""/></div>
          <div className="dialogue-copy"><div className="speaker-line"><h3>{dialogueDone ? '新的目标'  : activeDialogue.speaker}</h3><span>{dialogueDone ? '校园探索'  : activeDialogue.tag}</span><small>{dialogueDone ? 'FIN' : `${dialogueIndex + 1} / ${dialogueLines.length}`}</small></div>
            <p>{dialogueDone ? (dialogueKind === 'lake' ? '轮廓重合时按下快门。五轮中成功至少四次，即可完成挑战。' : '前往图书馆，寻找第一块建筑碎片的线索。') : activeDialogue.text}</p>
            <div className="dialogue-actions"><button disabled={!dialogueDone&&dialogueIndex===0} onClick={previousDialogue}>← 上一句</button>{dialogueDone&&<span><kbd>空格</kbd> 返回校园</span>}{dialogueDone ? (dialogueKind === 'lake'
              ? <><button onClick={startSwan}>举起手机，拍摄黑天鹅<Icon name="arrow" size={15}/></button><button onClick={() => startDialogue(false, 'lake')}>重看对话 ↺</button><button onClick={() => go(dialogueReturn)}>返回校园<Icon name="map" size={15}/></button></>
              : <><button onClick={() => go(dialogueReturn)}>返回校园<Icon name="map" size={15}/></button><button onClick={()=>startDialogue(false)}>重看对话 ↺</button></>) : <><span><kbd>E</kbd> / <kbd>空格</kbd> 继续</span><button onClick={advanceDialogue}>{dialogueIndex === dialogueLines.length - 1 ? '结束对话' : '继续对话'}<Icon name="arrow" size={17}/></button></>}</div>
          </div>
        </div>
      </section>}

      {currentPlace && (view === 'campus' || view === 'play') && <aside className="place-panel" aria-label={`${currentPlace.name}视觉展示`}>
        <button className="icon-button panel-close" onClick={() => setPlace(null)} aria-label="关闭建筑展示"><Icon name="close"/></button><button type="button" aria-label="放大查看地标图片" onClick={()=>setPhotoOpen(true)} className={`place-art ${currentCrop ? 'place-art-cropped' : currentPhoto ? 'place-art-landmark' : ''}`} style={currentPhoto ? {aspectRatio:`${currentPhoto.width} / ${currentPhoto.height}`} : undefined}>
          {currentCrop ? <CampusArtwork label={`${currentPlace.name}局部放大`} style={{width:`${currentCrop.zoom * 100}%`,left:'50%',top:'50%',transform:`translate(-${currentCrop.x}%, -${currentCrop.y}%)`}}/> : currentPhoto ? <img key={currentPhoto.src} src={currentPhoto.src} alt={currentPhoto.title}/> : currentPlace.image === campusImage ? <CampusArtwork label={`${currentPlace.name}像素效果草稿`}/> : <img src={currentPlace.image} alt={`${currentPlace.name}像素效果草稿`}/>}
        <span className="photo-enlarge-hint">点击放大 ⛶</span></button>
        {currentPlace.photos && currentPlace.photos.length > 1 && <div className="landmark-gallery" aria-label={`${currentPlace.name}图片切换`}>
          {currentPlace.photos.map((photo, index) => <button key={photo.src} aria-pressed={photoIndex === index} onClick={() => setPhotoIndex(index)}>{photo.title}</button>)}
          <span aria-live="polite">{photoIndex + 1} / {currentPlace.photos.length}</span>
        </div>}
        <div className="place-content"><span className="eyebrow">LANDMARK {currentPlace.number} · CONCEPT ART</span><h2>{currentPlace.name}</h2><p>{currentPlace.description}</p><div className="draft-note"><span>{currentPhoto ? '校园地标 · 像素近景' : '校园局部 · 视觉草稿'}</span><p>{currentPlace.note}</p></div>{currentPlace.id === 'lake' && <button className="button button-primary" onClick={() => startDialogue(lakeComplete, 'lake')}>与筑小智交谈 · 黑天鹅抓拍<Icon name="chat" size={17}/></button>}{currentPlace.id === 'library' && <button className="button button-primary" onClick={()=>go('library')}>进入图书馆<Icon name="arrow" size={17}/></button>}{currentPlace.id === 'architecture' && <button className="button button-primary" onClick={()=>setTour('entry')}>进入建工院探索<Icon name="arrow" size={17}/></button>}{currentPlace.id === 'stadium' && <button className="button button-primary" onClick={()=>setTour('stadium')}>进入体育场 · 赛跑活动<Icon name="arrow" size={17}/></button>}{currentPlace.id === 'teaching' && <button className="button button-primary" onClick={enterRoom}>进入综合教学楼<Icon name="arrow" size={17}/></button>}</div>
      </aside>}
      {photoOpen&&currentPlace&&<PhotoViewer place={currentPlace} index={photoIndex} onIndex={setPhotoIndex} onClose={()=>setPhotoOpen(false)}/>}
      {tour && <section className="activity-host" aria-label={tour==='stadium'?'体育场赛跑活动':'建筑工程学院探索'}>
        <button className="activity-fullscreen" onClick={fullscreen} title="切换全屏">{isFullscreen?'退出全屏 ⛶':'全屏显示 ⛶'}</button>
        <Suspense fallback={<div className="tour-boot" role="status">正在展开三维场景……</div>}>
          {tour==='stadium'?<StadiumRun completed={!!tasks.stadium} onComplete={()=>markTask('stadium')} character={character} onClose={()=>setTour(null)}/>:<FirstPersonTour onComplete={()=>markTask('architecture')} character={character} view="entry" onClose={()=>setTour(null)}/>}
        </Suspense>
      </section>}
      <div className="scene-bottomline"><span><i/>原创像素视觉草稿</span><span>HENU · JINMING CAMPUS</span></div>
    </main>

    <footer className="site-footer"><div><span className="footer-leaf"><Icon name="leaf" size={16}/></span><span>把校园，慢慢读成故事。</span><span className="footer-separator"/><small>v0.8.12 · 校园整合试玩</small></div><div className="footer-controls"><span><kbd>M</kbd> 校园全景</span><span><kbd>Esc</kbd> 返回</span></div></footer>

    {showNotes && <Modal title="这一次，先看见金明。" onClose={() => setShowNotes(false)}><p className="modal-intro">这是《河大寻迹：金明秘境》的第三阶段角色与探索交互试玩。按照你的路线图，先开放西大门、图书馆、综合教学楼、体育场、水系至建工学院的连续道路路线。</p><div className="scope-grid"><div><h3>现在可以体验</h3><p>男女主角四方向行走、沿路自动演示与手动接管、镜头跟随、道路边界阻挡、六处地标与筑小智互动，以及M键全景定位。</p></div><div><h3>留给后续共同设计</h3><p>建筑内部、正式剧情、任务关卡与存档。本次只做阶段3，完成后暂停等待你试玩验收。</p></div></div><div className="draft-note"><span>关于美术草稿</span><p>场景与人物由 AI 辅助生成，依据你提供的图片进行视觉转译；角色动画已分帧，本轮仅开放已描绘的路线步道，尚需你确认各段走向与贴边手感。院徽、1931 字样与真实建筑细节需要进一步校对。</p></div><button className="button button-primary" onClick={() => setShowNotes(false)}>回到视觉原型<Icon name="arrow" size={17}/></button></Modal>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

import { useEffect, useRef, useState } from 'react'
import FragmentArtwork from './FragmentArtwork'
import type { Character } from './content'
import './swan-mission.css'

const passed = [
  ['你','拍到了！这一张连水面的波纹都留下来了。'],
  ['筑小智','不错，你已经开始留意校园里的小细节了。'],
  ['你','那这次的建筑碎片呢？'],
  ['筑小智','在这里。收好，又离答案近了一点。'],
  ['你','你果然知道它们能拼成什么。'],
  ['筑小智','终于集齐四块碎片了，接下来去建工学院606揭晓答案吧'],
]
const failed = [
  ['你','不是拍早了，就是只拍到一点尾巴……'],
  ['筑小智','别追着它按快门，盯住轮廓，等它游进来。'],
  ['你','找到节奏了，再来一次！'],
]
export default function SwanMission({ character, completed, onComplete, onExit, remainingTasks=[] }: { remainingTasks?:string[]; character: Character; completed: boolean; onComplete: () => void; onExit: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [phase,setPhase]=useState<'game'|'passed'|'failed'|'free'|'reward'>('game')
  const [index,setIndex]=useState(0)
  const [score,setScore]=useState(0)
  const [attempt,setAttempt]=useState(0)
  const claimed=useRef(completed)
  const received=useRef(false)
  const successLines=passed.map((line,i)=>i===passed.length-1&&remainingTasks.length?['筑小智',`这块碎片也收好了。还有${remainingTasks.join('、')}的线索没完成，先去看看，再到建工学院606揭晓答案。`]:line)
  const lines=phase==='failed'?failed:phase==='free'?[['筑小智','碎片已经收好了。这次，就给自己留一张喜欢的照片吧。']]:successLines
  const line=lines[index] ?? lines[0]
  const reward=phase==='reward'
  function retry(){received.current=false;setIndex(0);setAttempt(v=>v+1);setPhase('game')}
  function previous(){if(reward){setPhase('passed');setIndex(passed.length-1)}else setIndex(i=>Math.max(0,i-1))}
  function advance(){if(index<lines.length-1)setIndex(v=>v+1);else if(phase==='passed')setPhase('reward')}
  useEffect(()=>{
    if(phase==='passed' && index>=3 && !claimed.current){claimed.current=true;onComplete()}
  },[phase,index,onComplete])
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      if(event.data?.type==='henu-swan-exit'){onExit();return}
      const data=event.data
      if(data?.type==='henu-swan-result' && !received.current && Number.isInteger(data.score) && data.score>=0 && data.score<=5 && data.rounds===5){
        received.current=true;setScore(data.score);setIndex(0);setPhase(completed?'free':data.score>=4?'passed':'failed')
      }
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [onExit,completed])
  useEffect(()=>{
    if(phase==='game')return
    const key=(event:KeyboardEvent)=>{
      if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||(event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]'))return
      if(event.key==='ArrowLeft'){event.preventDefault();previous();return}
      if(event.key==='ArrowRight'){event.preventDefault();if(!reward)advance();return}
      if(event.key===' '&&(reward||((phase==='failed'||phase==='free')&&index===lines.length-1))){event.preventDefault();onExit();return}
      if(['e','E',' '].includes(event.key) && !reward && (index<lines.length-1 || phase==='passed')){event.preventDefault();advance()}
    }
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)
  },[phase,index,reward,lines.length])
  return <section className={`swan-mission ${phase==='game'?'':'swan-result'}`} aria-label="水系黑天鹅抓拍活动">
    <div className="swan-mission-head"><div><strong>校园水系 · 黑天鹅抓拍</strong><small>{phase==='game'?'轮廓重合时按空格或点击快门 · 五轮成功至少四次':`本次成功 ${score} / 5 次 · ${completed?'建筑碎片已收好':'水岸边的对话'}`}</small></div><button className="button button-primary" onClick={onExit}>返回水系 ↗</button></div>
    {reward&&<FragmentArtwork id="lake"/>}
    {phase==='game'?<iframe key={attempt} ref={frame} src="/games/swan/index.html" title="黑天鹅三维抓拍小游戏" onLoad={() => frame.current?.contentWindow?.focus()}/>:<>
      <div className="scene-actors water-actors"><div className="actor player-actor"><span className="actor-name">你 · 河大学生</span><img src={`/assets/characters/${character}.png`} alt="所选学生形象"/></div><div className="actor npc-actor"><img src="/assets/characters/zhuxiaozhi.png" alt="筑小智"/></div></div>
      <div className="dialogue-box" aria-live="polite"><div className="dialogue-portrait"><img src={`/assets/characters/${!reward&&line[0]==='你'?character:'zhuxiaozhi'}.png`} alt=""/></div><div className="dialogue-copy"><div className="speaker-line"><h3>{reward?'获得建筑碎片':line[0]}</h3><span>{!reward&&line[0]==='你'?'河大学生':'校园知识守护者'}</span><small>{reward?'已收好':`${index+1} / ${lines.length}`}</small></div>
        <p>{reward?<>获得 <strong>建筑碎片 ×1</strong>，已收好。</>:line[1]}</p>
        <div className="dialogue-actions"><button disabled={!reward&&index===0} onClick={previous}>← 上一句</button>{reward?<><span><kbd>空格</kbd> 返回水系</span><button onClick={onExit}>收好碎片，返回水系 →</button></>:index<lines.length-1||phase==='passed'?<><span><kbd>E</kbd> / <kbd>空格</kbd> 继续</span><button onClick={advance}>继续对话 →</button></>:<><button onClick={retry}>再拍一次 ↺</button><button onClick={onExit}>{phase==='failed'?'先看看风景':'继续探索'} →</button></>}</div>
      </div></div>
    </>}
  </section>
}

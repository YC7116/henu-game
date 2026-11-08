import { useEffect, useState } from 'react'
import type { Character } from './content'
import './scene-dialogue.css'
export type SceneLine = readonly [string, string]
/** 与校园初遇相同的双人立绘和逐句对话；仅在结束时执行场景动作。 */
export default function SceneDialogue({character='boy',lines,title,onFinish,onCancel,finishLabel='继续探索',cancelLabel='稍后再来'}:{character?:Character;lines:readonly SceneLine[];title:string;onFinish:()=>void;onCancel?:()=>void;finishLabel?:string;cancelLabel?:string}){
  const [index,setIndex]=useState(0)
  const line=lines[index]
  const last=index===lines.length-1
  function previous(){setIndex(i=>Math.max(0,i-1))}
  function advance(){if(!last)setIndex(i=>i+1)}
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||(event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]'))return
      if(event.key==='ArrowLeft'){event.preventDefault();event.stopImmediatePropagation();previous();return}
      if(event.key==='ArrowRight'){event.preventDefault();event.stopImmediatePropagation();advance();return}
      if(['e','E',' '].includes(event.key)){
        event.preventDefault();event.stopImmediatePropagation();if(last&&event.key===' ')(onCancel??onFinish)();else advance()
      }
      if(event.key==='Escape'&&onCancel){event.preventDefault();event.stopImmediatePropagation();onCancel()}
    }
    window.addEventListener('keydown',key,true)
    return()=>window.removeEventListener('keydown',key,true)
  },[index,last,onCancel,onFinish])
  return <section className="scene-dialogue-overlay" role="dialog" aria-modal="true" aria-label={title}>
    <div className="scene-actors"><div className={`actor player-actor ${line[0]==='你'?'is-speaking':''}`}><span className="actor-name">你 · 河大学生</span><img src={`/assets/characters/${character}.png`} alt="所选学生形象"/></div><div className={`actor npc-actor ${line[0]!=='你'?'is-speaking':''}`}><img src="/assets/characters/zhuxiaozhi.png" alt="筑小智"/></div></div>
    <div className="dialogue-box" aria-live="polite"><div className="dialogue-portrait"><img src={`/assets/characters/${line[0]==='你'?character:'zhuxiaozhi'}.png`} alt=""/></div><div className="dialogue-copy"><div className="speaker-line"><h3>{line[0]}</h3><span>{line[0]==='你'?'河大学生':'校园知识守护者'}</span><small>{index+1} / {lines.length}</small></div><p>{line[1]}</p><div className="dialogue-actions"><button disabled={index===0} onClick={previous}>← 上一句</button>{last?<><span><kbd>空格</kbd> 结束对话</span>{onCancel&&<button onClick={onCancel}>{cancelLabel}</button>}<button onClick={onFinish}>{finishLabel} →</button></>:<><span><kbd>E</kbd> / <kbd>空格</kbd> 继续</span><button onClick={advance}>继续对话 →</button></>}</div></div></div>
  </section>
}

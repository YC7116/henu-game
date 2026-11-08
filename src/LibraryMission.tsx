import { useEffect, useRef, useState } from 'react'
import FragmentArtwork from './FragmentArtwork'
import type { Character } from './content'
import './library-mission.css'

const questions = [
  { title:'河南大学创建于哪一年？', options:['1902 年','1912 年','1922 年'], answer:1, hint:'再想想，校徽上藏着一个年份提示。', fact:'没错，是 1912 年。这个年份也写在河大的校徽上，下次见到可以留意一下。' },
  { title:'河南大学的校训是什么？', options:['明德新民，止于至善','自强不息，厚德载物','博学笃行，求实创新'], answer:0, hint:'提示一下，校训的前四个字是“明德新民”。', fact:'答对了！“明德新民，止于至善”，这八个字陪伴了一代又一代河大学子。' },
]
type Step = 'scene'|'opening-player'|'opening-npc'|'opening-reply'|'question'|'correct'|'bridge-player'|'bridge-npc'|'finish-player'|'finish-npc'|'finish-reply'|'finish-direction'|'reward'|'revisit'
export default function LibraryMission({character,completed,onComplete,onExit}:{character:Character;completed:boolean;onComplete:()=>void;onExit:()=>void}) {
  const [step,setStep]=useState<Step>('scene')
  const [index,setIndex]=useState(0)
  const [hint,setHint]=useState('')
  const granted=useRef(completed)
  const [seen,setSeen]=useState<{key:string;speaker:string;text:string}[]>([])
  const [review,setReview]=useState<number|null>(null)
  const q=questions[index]
  const lines: Partial<Record<Step,{speaker:'你'|'筑小智';text:string;next:Step}>> = {
    'opening-player':{speaker:'你',text:'图书馆到了。这里能找到碎片吗？',next:'opening-npc'},
    'opening-npc':{speaker:'筑小智',text:'先别着急找。来到图书馆，先看看你对河大了解多少。准备好回答两个问题了吗？',next:'opening-reply'},
    'opening-reply':{speaker:'你',text:'来吧，我试试。',next:'question'},
    'bridge-player':{speaker:'你',text:'原来校徽里也藏着线索。下一题是什么？',next:'bridge-npc'},
    'bridge-npc':{speaker:'筑小智',text:'这次考考你对河大校训的了解。',next:'question'},
    'finish-player':{speaker:'你',text:'两题都答对了，碎片在哪里？',next:'finish-npc'},
    'finish-npc':{speaker:'筑小智',text:'别急，看这里。恭喜你，找到第一块建筑碎片！',next:'finish-reply'},
    'finish-reply':{speaker:'你',text:'它看起来只是其中的一小部分。',next:'finish-direction'},
    'finish-direction':{speaker:'筑小智',text:'观察得不错。把它收好，我们去综合教学楼找找下一块吧。',next:'reward'},
  }
  const line=lines[step]
  const historyText=line?.text??(step==='correct'?q.fact:undefined)
  useEffect(()=>{if(historyText){const item={key:`${step}:${index}`,speaker:line?.speaker??'筑小智',text:historyText};setSeen(old=>old.at(-1)?.key===item.key?old:[...old,item])}},[step,index])
  const shownLine=review===null?line:seen[review]
  const speaker=shownLine?.speaker ?? '筑小智'
  function previous(){const next=review===null?seen.length-(historyText?2:1):review-1;if(next>=0)setReview(next)}
  function forward(){if(review!==null){const next=review+1;if(next<seen.length-(historyText?1:0))setReview(next);else setReview(null);return}if(line)advanceLine();else if(step==='correct')afterCorrect()}

  function choose(i:number){if(i===q.answer){setHint('');setStep('correct')}else setHint(q.hint)}
  function advanceLine(){if(!line)return;if(step==='finish-npc'&&!granted.current){granted.current=true;onComplete()};setStep(line.next)}
  function afterCorrect(){if(index===0){setIndex(1);setStep('bridge-player')}else setStep('finish-player')}
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||(event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]'))return
      if(event.key==='ArrowLeft'){event.preventDefault();previous();return}
      if(event.key==='ArrowRight'){event.preventDefault();forward();return}
      if(![' ','e','E'].includes(event.key))return
      if(review!==null||line||step==='correct'){event.preventDefault();forward()}else if(event.key===' '&&(step==='reward'||step==='revisit')){event.preventDefault();onExit()}
    }
    window.addEventListener('keydown',key)
    return()=>window.removeEventListener('keydown',key)
  },[step,index,review,seen])
  return <section className="library-mission" aria-label="图书馆互动任务">
    <div className="library-backdrop" role="img" aria-label="图书馆中庭像素场景"/>
    <div className="library-head"><span>图书馆 · 中庭</span><button onClick={onExit}>返回校园</button></div>
    {step==='scene'&&<button className="library-start button button-primary" onClick={()=>setStep(completed?'revisit':'opening-player')}>开始对话 →</button>}
    {step==='reward'&&review===null&&<FragmentArtwork id="library"/>}
    {step!=='scene'&&<>
      <div className="scene-actors library-actors" aria-label="玩家与筑小智"><div className="actor player-actor"><span className="actor-name">你 · 河大学生</span><img src={`/assets/characters/${character}.png`} alt="你选择的学生形象"/></div><div className="actor npc-actor"><img src="/assets/characters/zhuxiaozhi.png" alt="筑小智"/></div></div>
      <div className="dialogue-box library-dialogue" aria-live="polite"><div className="dialogue-portrait"><img src={`/assets/characters/${speaker==='你'?character:'zhuxiaozhi'}.png`} alt=""/></div><div className="dialogue-copy"><div className="speaker-line"><h3>{speaker}</h3><span>{speaker==='你'?'河大学生':'校园知识守护者'}</span><small>{step==='question'?`${index+1} / 2`:'图书馆'}</small></div>
<div className="dialogue-actions"><button disabled={review===0||(!seen.length)||(review===null&&!!historyText&&seen.length<2)} onClick={previous}>← 上一句</button>{review!==null&&<span>对话回看 · ← / →</span>}</div>
      {shownLine&&<><p>{shownLine.text}</p><div className="dialogue-actions"><span><kbd>E</kbd> / <kbd>空格</kbd> 继续</span><button onClick={forward}>继续对话 →</button></div></>}
      {review===null&&step==='question'&&<><p className="library-question">{index+1} / 2 · {q.title}</p><div className="library-options">{q.options.map((o,i)=><button key={o} onClick={()=>choose(i)}>{String.fromCharCode(65+i)} <span>{o}</span></button>)}</div>{hint&&<p className="library-hint" role="status">{hint}</p>}</>}
      {review===null&&step==='correct'&&<><p>{q.fact}</p><div className="dialogue-actions"><button onClick={afterCorrect}>继续对话 →</button></div></>}
      {review===null&&step==='reward'&&<><p>获得 <strong>建筑碎片 ×1</strong><br/>下一站：综合教学楼</p><div className="dialogue-actions"><span><kbd>空格</kbd> 返回校园</span><button onClick={onExit}>返回校园 →</button></div></>}
      {review===null&&step==='revisit'&&<><p>图书馆的碎片已经收好，接下来去综合教学楼看看吧。</p><div className="dialogue-actions"><button onClick={()=>{setIndex(0);setHint('');setStep('opening-player')}}>重温对话</button><button onClick={onExit}>返回校园 →</button></div></>}
    </div></div></>}
  </section>
}

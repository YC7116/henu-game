import { useEffect, useState } from 'react'
import type { LockBox, Npc } from './types'


/** 楼梯口：选一层走。 */
export function FloorPanel({
  here,
  options,
  onPick,
  onClose,
}: {
  here: string
  options: { label: string; to: string; hint?: string }[]
  onPick: (to: string) => void
  onClose: () => void
}) {
  return (
    <div className="room-panel floor-panel" role="dialog" aria-label="楼梯">
      <header className="rp-head">
        <div className="npc-head">
          <h3>楼梯口</h3>
          <small>当前 · {here}</small>
        </div>
        <button className="rp-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>
      <p className="rp-text">台阶往上和往下都通。去哪一层？</p>
      <div className="floor-list">
        {options.map(option => (
          <button key={option.to} className="floor-item" onClick={() => onPick(option.to)}>
            <span className="floor-name">
              <b>{option.label}</b>
              {option.hint ? <small>{option.hint}</small> : null}
            </span>
            <span className="floor-go">前往 →</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function NotePanel({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  return (
    <div className="room-panel" role="dialog" aria-label={title}>
      <header className="rp-head">
        <h3>{title}</h3>
        <button className="rp-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>
      <p className="rp-text">{text}</p>
      <button className="rp-primary" onClick={onClose}>
        合上
      </button>
    </div>
  )
}

/** 四位数轮，答错不惩罚，可以一直重试。 */
export function CodePanel({
  box,
  hint,
  onOpen,
  onClose,
}: {
  box: LockBox
  hint?: string
  onOpen: () => void
  onClose: () => void
}) {
  const [showHint, setShowHint] = useState(false)
  const [entry, setEntry] = useState('')
  const [status, setStatus] = useState<'idle' | 'ok' | 'bad'>('idle')

  function press(n: string) {
    if (status !== 'idle' || entry.length >= box.digits) return
    const next = entry + n
    setEntry(next)
    if (next.length === box.digits) {
      if (next === box.answer) {
        setStatus('ok')
        window.setTimeout(onOpen, 700)
      } else {
        setStatus('bad')
        window.setTimeout(() => {
          setStatus('idle')
          setEntry('')
        }, 620)
      }
    }
  }

  return (
    <div className="room-panel" role="dialog" aria-label="密码盒">
      <header className="rp-head">
        <h3>密码盒</h3>
        <button className="rp-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>
      <p className="rp-text">{box.prompt}</p>
      {hint && (
        <div className="lock-hint">
          <button className="lock-hint-toggle" aria-expanded={showHint} aria-controls="lock-hint-text" onClick={() => setShowHint(value => !value)}>
            {showHint ? '收起提示' : '查看提示'}
          </button>
          {showHint && <p id="lock-hint-text" className="rp-text lock-hint-text">{hint}</p>}
        </div>
      )}
      <div className={`lock-display${status === 'ok' ? ' is-ok' : ''}${status === 'bad' ? ' is-bad' : ''}`}>
        {Array.from({ length: box.digits }, (_, i) => (
          <span key={i}>{entry[i] ?? ''}</span>
        ))}
      </div>
      <div className="lock-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
          <button key={n} onClick={() => press(n)}>
            {n}
          </button>
        ))}
        <button className="lock-fn" onClick={() => setEntry('')}>
          清除
        </button>
        <button onClick={() => press('0')}>0</button>
      </div>
      <p className="rp-hint">{status === 'ok' ? box.ok : status === 'bad' ? '轮子转了半圈，又弹回原位。' : '输错了不会有惩罚，慢慢试。'}</p>
    </div>
  )
}

/** NPC 对话：逐句推进，最后可以接一个小问答。 */
export function DialoguePanel({
  npc,
  solved,
  onSolved,
  onClose,
}: {
  npc: Npc
  solved: boolean
  onSolved: () => void
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'line' | 'quiz' | 'done'>('line')
  const [entry, setEntry] = useState('')
  const [wrong, setWrong] = useState(false)

  useEffect(() => {
    if (solved) setPhase('done')
  }, [solved])

  const line = npc.lines[Math.min(index, npc.lines.length - 1)]
  const quiz = npc.quiz

  function next() {
    if (index + 1 < npc.lines.length) {
      setIndex(index + 1)
      return
    }
    setPhase(quiz ? 'quiz' : 'done')
  }

  function press(n: string) {
    if (!quiz || phase !== 'quiz' || entry.length >= quiz.digits) return
    const value = entry + n
    setEntry(value)
    if (value.length === quiz.digits) {
      if (value === quiz.answer) {
        onSolved()
        setPhase('done')
      } else {
        setWrong(true)
        window.setTimeout(() => {
          setWrong(false)
          setEntry('')
        }, 700)
      }
    }
  }

  return (
    <div className="room-panel room-panel-wide npc-panel" role="dialog" aria-label={npc.name}>
      <header className="rp-head">
        <div className="npc-head">
          <h3>{npc.name}</h3>
          {npc.tag ? <small>{npc.tag}</small> : null}
        </div>
        <button className="rp-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>

      {phase === 'line' && <p className="npc-line">{line.text}</p>}

      {phase === 'quiz' && quiz && (
        <>
          <p className="npc-line">{quiz.prompt}</p>
          <p className="rp-question">{quiz.question}</p>
          <div className={`lock-display${wrong ? ' is-bad' : ''}`}>
            {Array.from({ length: quiz.digits }, (_, i) => (
              <span key={i}>{entry[i] ?? ''}</span>
            ))}
          </div>
          <div className="lock-keys">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
              <button key={n} onClick={() => press(n)}>
                {n}
              </button>
            ))}
            <button className="lock-fn" onClick={() => setEntry('')}>
              清除
            </button>
            <button onClick={() => press('0')}>0</button>
          </div>
          <p className="rp-hint">{wrong ? quiz.retry : '把算出来的值输进去。'}</p>
        </>
      )}

      {phase === 'done' && (
        <>
          <p className="npc-line">{solved && quiz ? quiz.ok : '（老师点了点头，又低头去改作业。）'}</p>
          <button className="rp-primary" onClick={onClose}>
            离开
          </button>
        </>
      )}

      {phase === 'line' && (
        <button className="rp-primary" onClick={next}>
          {index + 1 < npc.lines.length ? '继续' : quiz ? '回答' : '结束对话'}
        </button>
      )}
    </div>
  )
}

export function AwardPanel({
  name,
  text,
  onClose,
}: {
  name: string
  text: string
  onClose: () => void
}) {
  return (
    <div className="room-panel room-panel-core" role="dialog" aria-label={name}>
      <span className="core-eyebrow">ACQUIRED · 建筑碎片</span>
      <h3>{name}</h3>
      <p className="rp-text">{text}</p>
      <button className="rp-primary" onClick={onClose}>
        带着碎片离开
      </button>
    </div>
  )
}

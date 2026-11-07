import { useEffect, useRef, useState } from 'react'
import type { ExamConfig, Shard } from './types'

export function ExamPanel({
  exam,
  onPass,
  onClose,
}: {
  exam: ExamConfig
  onPass: () => void
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const [hearts, setHearts] = useState(exam.hearts)
  const [choice, setChoice] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const [passed, setPassed] = useState(false)

  const question = exam.questions[index]
  const picked = choice === null ? null : question.options[choice]

  function pick(i: number) {
    if (choice !== null || passed) return
    const option = question.options[i]
    setChoice(i)
    if (!option.ok) {
      const left = hearts - 1
      setHearts(left)
      if (left <= 0) setFailed(true)
    }
  }

  function advance() {
    if (failed) {
      setFailed(false)
      setHearts(exam.hearts)
      setIndex(0)
      setChoice(null)
      return
    }
    if (picked?.ok) {
      if (index + 1 >= exam.questions.length) {
        setPassed(true)
        setChoice(null)
        return
      }
      setIndex(index + 1)
      setChoice(null)
      return
    }
    setChoice(null)
  }

  if (passed) {
    return (
      <div className="room-panel room-panel-core exam-panel" role="dialog" aria-label="通过口试">
        <span className="core-eyebrow">PASSED · ORAL CHECK</span>
        <h3>{exam.title} · 通过</h3>
        <p className="rp-text">{exam.passLine}</p>
        <button className="rp-primary" onClick={onPass}>
          通过闸机
        </button>
      </div>
    )
  }

  return (
    <div className="room-panel room-panel-wide exam-panel" role="dialog" aria-label={exam.title}>
      <header className="rp-head">
        <div className="exam-head">
          <h3>{exam.title}</h3>
          <div className="exam-hearts" aria-label={`还剩 ${hearts} 次机会`}>
            {Array.from({ length: exam.hearts }, (_, i) => (
              <i key={i} className={i < hearts ? '' : 'is-lost'} />
            ))}
            <small>
              {index + 1} / {exam.questions.length}
            </small>
          </div>
        </div>
        <button className="rp-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>

      {index === 0 && choice === null ? <p className="rp-text exam-intro">{exam.intro}</p> : null}

      <div className="exam-stage">
        <div className="exam-speaker">
          <span>Ms. Hale</span>
          <em>voice</em>
        </div>
        <p className="exam-ask">{question.ask}</p>
        {question.hint ? <p className="exam-hint">{question.hint}</p> : null}
      </div>

      <div className="exam-options">
        {question.options.map((option, i) => {
          const state = choice === null ? '' : i === choice ? (option.ok ? ' is-ok' : ' is-bad') : ' is-dim'
          return (
            <button key={option.text} className={`exam-opt${state}`} disabled={choice !== null} onClick={() => pick(i)}>
              <b>{'ABC'[i]}</b>
              <span>{option.text}</span>
            </button>
          )
        })}
      </div>

      {picked ? (
        <div className={`exam-reply${picked.ok ? ' is-ok' : ' is-bad'}`}>
          <span>{failed ? exam.failLine : picked.reply}</span>
        </div>
      ) : null}

      {choice !== null && (
        <div className="exam-actions">
          <button className="rp-primary" onClick={advance}>
            {failed
              ? '从第一句重来'
              : picked?.ok
                ? index + 1 >= exam.questions.length
                  ? '结束口试'
                  : '下一题'
                : '再答一次'}
          </button>
        </div>
      )}
      <p className="rp-hint">答错掉一颗耐心，掉光就得从第一句开始。题面是英文，中文提示写在下面。</p>
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

export function SequencePanel({
  prompt,
  order,
  buttons,
  onSolve,
  onClose,
}: {
  prompt: string
  order: string[]
  buttons: string[]
  onSolve: () => void
  onClose: () => void
}) {
  const [picked, setPicked] = useState<number[]>([])
  const [wrong, setWrong] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function pick(index: number) {
    if (picked.includes(index) || wrong) return
    const next = [...picked, index]
    setPicked(next)
    if (next.some((i, k) => buttons[i] !== order[k])) {
      setWrong(true)
      timers.current.push(
        window.setTimeout(() => {
          setWrong(false)
          setPicked([])
        }, 560),
      )
      return
    }
    if (next.length === order.length) {
      timers.current.push(window.setTimeout(onSolve, 340))
    }
  }

  return (
    <div className="room-panel" role="dialog" aria-label="讲台抽屉的符号锁">
      <header className="rp-head">
        <h3>讲台抽屉 · 符号锁</h3>
        <button className="rp-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>
      <p className="rp-text">{prompt}</p>
      <div className={`seq-track${wrong ? ' is-wrong' : ''}`} aria-live="polite">
        {order.map((_, i) => (
          <span key={i} className={picked[i] !== undefined ? 'is-filled' : ''}>
            {picked[i] !== undefined ? buttons[picked[i]] : '·'}
          </span>
        ))}
      </div>
      <div className="seq-grid">
        {buttons.map((b, i) => (
          <button
            key={b + i}
            className={picked.includes(i) ? 'seq-chip is-used' : 'seq-chip'}
            disabled={picked.includes(i)}
            onClick={() => pick(i)}
          >
            {b}
          </button>
        ))}
      </div>
      <p className="rp-hint">点错会重来。锁只认顺序，不认速度。</p>
    </div>
  )
}

export function AssemblePanel({
  slots,
  shards,
  onComplete,
  onClose,
}: {
  slots: string[]
  shards: Shard[]
  onComplete: () => void
  onClose: () => void
}) {
  const [placed, setPlaced] = useState(0)
  const [shake, setShake] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  const ordered = [...shards].sort((a, b) => a.slot - b.slot)
  const remaining = ordered.filter(s => s.slot >= placed)
  const done = placed === ordered.length

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function place(shard: Shard) {
    if (shard.slot === placed) {
      const next = placed + 1
      setPlaced(next)
      if (next === ordered.length) timers.current.push(window.setTimeout(onComplete, 520))
      return
    }
    setShake(shard.id)
    timers.current.push(window.setTimeout(() => setShake(null), 480))
  }

  return (
    <div className="room-panel room-panel-wide" role="dialog" aria-label="拼装题目">
      <header className="rp-head">
        <h3>拼装题目</h3>
        <button className="rp-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>
      <p className="rp-text">五片碎片能拼出一道定积分。按写出来的顺序放。</p>
      <div className="asm-slots">
        {slots.map((label, i) => {
          const filled = i < placed ? ordered[i].piece : null
          return (
            <div key={label} className={`asm-slot${filled ? ' is-filled' : ''}${i === placed && !done ? ' is-next' : ''}`}>
              <span>{filled ?? label}</span>
            </div>
          )
        })}
      </div>
      {done ? (
        <div className="asm-result">
          <p className="asm-formula">∫₀² (3x² + 2x) dx</p>
          <p className="rp-text">式子复原了。剩下的部分，得你自己算。</p>
          <button className="rp-primary" onClick={onClose}>
            记下这道题
          </button>
        </div>
      ) : (
        <div className="asm-tray">
          {remaining.map(shard => (
            <button
              key={shard.id}
              className={`asm-chip${shake === shard.id ? ' is-shake' : ''}`}
              onClick={() => place(shard)}
            >
              <b>{shard.piece}</b>
              <small>{shard.title}</small>
            </button>
          ))}
        </div>
      )}
      <p className="rp-hint">{done ? '式子已经写在黑板上了。' : `还差 ${ordered.length - placed} 片`}</p>
    </div>
  )
}

export function LockPanel({
  digits,
  answer,
  question,
  hint,
  onOpen,
  onClose,
}: {
  digits: number
  answer: string
  question: string
  hint: string
  onOpen: () => void
  onClose: () => void
}) {
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(0)
  const [status, setStatus] = useState<'idle' | 'ok' | 'bad'>('idle')

  function press(n: string) {
    if (status !== 'idle' || entry.length >= digits) return
    const next = entry + n
    setEntry(next)
    if (next.length === digits) {
      if (next === answer) {
        setStatus('ok')
        window.setTimeout(onOpen, 620)
      } else {
        setStatus('bad')
        window.setTimeout(() => {
          setStatus('idle')
          setEntry('')
          setError(e => e + 1)
        }, 620)
      }
    }
  }

  return (
    <div className="room-panel" role="dialog" aria-label="储物柜密码锁">
      <header className="rp-head">
        <h3>储物柜 · 密码锁</h3>
        <button className="rp-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>
      <p className="rp-question">{question}</p>
      <div className={`lock-display${status === 'ok' ? ' is-ok' : ''}${status === 'bad' ? ' is-bad' : ''}`}>
        {Array.from({ length: digits }, (_, i) => (
          <span key={i}>{entry[i] ?? ''}</span>
        ))}
      </div>
      <div className="lock-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
          <button key={n} onClick={() => press(n)}>
            {n}
          </button>
        ))}
        <button onClick={() => setEntry('')} className="lock-fn">
          清除
        </button>
        <button onClick={() => press('0')}>0</button>
      </div>
      <p className="rp-hint">{status === 'ok' ? '咔哒一声，柜门开了。' : error >= 1 ? `再想想：${hint}` : '锁面刻着：算出来的那个数。'}</p>
    </div>
  )
}

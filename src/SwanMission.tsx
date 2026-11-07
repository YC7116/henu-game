import { useEffect, useRef } from 'react'
import './swan-mission.css'

export default function SwanMission({ onExit }: { onExit: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'henu-swan-exit') onExit()
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [onExit])
  return <section className="swan-mission" aria-label="水系黑天鹅抓拍活动">
    <div className="swan-mission-head"><div><strong>校园水系 · 黑天鹅抓拍</strong><small>轮廓重合时按空格或点击快门 · 共五轮</small></div><button className="button button-primary" onClick={onExit}>返回水系 ↗</button></div>
    <iframe ref={frame} src="/games/swan/index.html" title="黑天鹅三维抓拍小游戏" onLoad={() => frame.current?.contentWindow?.focus()}/>
  </section>
}

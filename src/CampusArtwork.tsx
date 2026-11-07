import type { CSSProperties } from 'react'
import { campusImage } from './content'

// Apply only the two gate corrections; retain the original campus artwork everywhere else.
const gatePatches = [
  { left: 32.5, top: 24.5, width: 7.5, height: 9.5 },
  { left: 1.2, top: 45.7, width: 8.8, height: 12.3 },
]

export default function CampusArtwork({ className = '', style, label }: { className?: string; style?: CSSProperties; label?: string }) {
  return <div className={`campus-artwork ${className}`} style={style} role={label ? 'img' : undefined} aria-label={label} aria-hidden={!label || undefined}>
    <img className="campus-base" src={campusImage} alt=""/>
    {gatePatches.map((patch, index) => <div className="campus-patch" key={index} style={{left:`${patch.left}%`,top:`${patch.top}%`,width:`${patch.width}%`,height:`${patch.height}%`}}>
      <img src="/assets/scenes/campus-v0.1.1.png" alt="" style={{width:`${10000 / patch.width}%`,height:`${10000 / patch.height}%`,left:`${-100 * patch.left / patch.width}%`,top:`${-100 * patch.top / patch.height}%`}}/>
    </div>)}
  </div>
}

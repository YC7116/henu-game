import './fragment-artwork.css'
import { asset } from './asset-path'
export type FragmentId='library'|'teaching'|'stadium'|'lake'
export const fragmentImages:Record<FragmentId,string>={library:asset('/assets/rewards/fragments/p1.png'),teaching:asset('/assets/rewards/fragments/p2.png'),stadium:asset('/assets/rewards/fragments/p3.png'),lake:asset('/assets/rewards/fragments/p4.png')}
export default function FragmentArtwork({id,inline=false}:{id:FragmentId;inline?:boolean}){
 return <figure className={`fragment-artwork ${inline?'fragment-inline':''}`} aria-label="获得建筑碎片"><span className="fragment-aura" aria-hidden="true"/><img src={fragmentImages[id]} alt="本次获得的建筑碎片"/><i className="fragment-spark spark-one" aria-hidden="true">✦</i><i className="fragment-spark spark-two" aria-hidden="true">✧</i><i className="fragment-spark spark-three" aria-hidden="true">✦</i><figcaption>建筑碎片 ×1</figcaption></figure>
}

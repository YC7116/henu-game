import { useEffect, useRef } from 'react'
import CampusArtwork from './CampusArtwork'
import { places } from './content'
import './photo-viewer.css'
type Place = typeof places[number]
export default function PhotoViewer({place,index,onIndex,onClose}:{place:Place;index:number;onIndex:(index:number)=>void;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  const photos=place.photos??[{src:place.image,title:place.name,width:1672,height:941,crop:place.crop}]
  const photo=photos[index]??photos[0]
  useEffect(()=>{const element=dialog.current!;element.showModal();return()=>element.close()},[])
  return <dialog ref={dialog} className="photo-viewer" aria-label={`${place.name}图片放大展示`} onCancel={event=>{event.preventDefault();onClose()}} onClick={event=>{if(event.target===event.currentTarget)onClose()}} onKeyDown={event=>{
    if(event.key==='ArrowRight'){event.preventDefault();onIndex((index+1)%photos.length)}
    if(event.key==='ArrowLeft'){event.preventDefault();onIndex((index+photos.length-1)%photos.length)}
  }}><header><strong>{photo.title}</strong><span>{index+1} / {photos.length}</span><button autoFocus onClick={onClose} aria-label="关闭放大图片">关闭 ×</button></header>
    <div className="photo-viewer-art" style={{aspectRatio:`${photo.width}/${photo.height}`}}>{photo.crop?<CampusArtwork label={photo.title} style={{position:'absolute',width:`${photo.crop.zoom*100}%`,maxWidth:'none',left:'50%',top:'50%',transform:`translate(-${photo.crop.x}%,-${photo.crop.y}%)`}}/>:<img src={photo.src} alt={photo.title}/>}</div>
    {photos.length>1&&<nav aria-label="放大图片切换"><button onClick={()=>onIndex((index+photos.length-1)%photos.length)}>← 上一张</button><button onClick={()=>onIndex((index+1)%photos.length)}>下一张 →</button></nav>}
  </dialog>
}

import {SPEEDS,END_X,TARGET_X,swanX,judge,labelForRound} from './logic.mjs'
import {createScene} from './scene3d.mjs'
const $=id=>document.getElementById(id),canvas=$('game'),overlay=$('overlay'),shutter=$('shutter'),feedback=$('feedback'),flash=$('flash'),roundText=$('roundText'),speedText=$('speedText'),scoreEl=$('score')
let scene3d
try {scene3d=createScene(canvas)} catch(error) {overlay.innerHTML='<div class="overlay-card"><h2>暂时无法开启三维场景</h2><p>请启用浏览器硬件加速，或用支持 WebGL 的浏览器打开。</p></div>';throw error}
let state='intro',round=0,score=0,elapsed=0,last=0,pause=0,frame=0,shots=[]
function scoreUpdate(){scoreEl.innerHTML=`${score} <em>/ 5</em>`}
function render(t){const x=state==='playing'?swanX(elapsed,round):shots.at(-1)?.x??320;scene3d.draw(t,x,state==='playing'||(state==='feedback'&&x<=END_X),state==='intro'||state==='end')}
function intro(){state='intro';round=0;score=0;elapsed=0;shots=[];scoreUpdate();shutter.disabled=true;feedback.textContent='';roundText.textContent='准备拍摄';speedText.textContent='水岸观察中';overlay.hidden=false;overlay.innerHTML=`<div class="overlay-card"><span class="spark">✦</span><h2>准备好了吗？</h2><p>黑天鹅从左向右游过。<br>当它与取景框中的轮廓重合时，按下快门。</p><button class="primary" id="start">举起手机，开始拍摄 <span>→</span></button><small>共 5 轮 · 每轮可拍摄一次</small></div>`;$('start').addEventListener('click',start)}
function start(){round=0;score=0;shots=[];scoreUpdate();overlay.hidden=true;nextRound()}
function nextRound(){state='playing';elapsed=0;pause=0;feedback.textContent='';shutter.disabled=false;roundText.textContent=`第 ${round+1} / 5 次`;speedText.textContent=labelForRound(round)}
function snap(){if(state!=='playing')return;const x=swanX(elapsed,round),result=judge(x);finishShot(x,result,false);flash.classList.remove('active');void flash.offsetWidth;flash.classList.add('active')}
function finishShot(x,result,missed){if(state!=='playing')return;state='feedback';shutter.disabled=true;shots.push({x,...result});if(result.success)score++;scoreUpdate();feedback.textContent=missed?'天鹅游走了 · 继续下一次':result.success?(result.accuracy>=75?'抓拍成功 · 完美瞬间！':'抓拍成功 · 好眼力！'):'差一点 · 再找找节奏';pause=1.6}
function finish(){state='end';feedback.textContent='';shutter.disabled=true;roundText.textContent='拍摄完成';speedText.textContent='本次记录';overlay.hidden=false;overlay.innerHTML=`<div class="overlay-card"><span class="spark">✦</span><h2>一段水岸时光</h2><p>5 次抓拍，成功 ${score} 次。<br>${score>=4?'你捕捉到了湖面上的好时机。':'再试一次，跟上黑天鹅的节奏吧。'}</p><button class="primary" id="restart">再拍一次 <span>↻</span></button><small>玩法与速度均为试玩草案</small></div>`;$('restart').addEventListener('click',start);const exit=document.createElement('button');exit.className='primary exit-lake';exit.textContent='返回水系 →';exit.addEventListener('click',exitToLake);overlay.querySelector('.overlay-card').append(exit)}
function tick(time){const dt=last?Math.min((time-last)/1000,.05):0;last=time;if(!document.hidden){if(state==='playing'){elapsed+=dt;if(swanX(elapsed,round)>END_X)finishShot(END_X+1,{success:false,distance:0,accuracy:0},true)}else if(state==='feedback'){pause-=dt;if(pause<=0){round++;if(round<SPEEDS.length)nextRound();else finish()}}}render(time);frame=requestAnimationFrame(tick)}
shutter.addEventListener('click',snap);window.addEventListener('keydown',e=>{if(e.code==='Space'&&state==='playing'&&!e.repeat){e.preventDefault();snap()}});document.addEventListener('visibilitychange',()=>{last=0});intro();frame=requestAnimationFrame(tick);window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));window.addEventListener('pageshow',e=>{if(e.persisted){last=0;frame=requestAnimationFrame(tick)}})

function exitToLake(){window.parent.postMessage({type:'henu-swan-exit'},window.location.origin)}
window.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();exitToLake()}})

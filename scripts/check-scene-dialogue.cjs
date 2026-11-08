const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createRequire}=require('node:module');const {transformSync}=createRequire(require.resolve('vite'))('esbuild');
let slots=[],cursor=0,pending=[],dirty=false,tree,props,listeners=new Set();
const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),Fragment:'fragment',useState(value){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;dirty=true}]},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})}};
const win={addEventListener:(event,fn)=>listeners.add(fn),removeEventListener:(event,fn)=>listeners.delete(fn)};
function load(file){const code=transformSync("import * as React from 'react';\n"+fs.readFileSync(file,'utf8'),{loader:'tsx',format:'cjs',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).code;const m={exports:{}};vm.runInNewContext(code,{module:m,exports:m.exports,require:name=>name==='react'?react:{},window:win});return m.exports}
const Component=load('src/SceneDialogue.tsx').default,lines=load('src/scene-dialogue-lines.ts');
function nodes(t,result=[]){if(t&&typeof t==='object'&&t.props){result.push(t);for(const c of t.props.children.flat(Infinity))nodes(c,result)}return result}
function text(t=tree){if(t==null||typeof t==='boolean')return '';if(typeof t!=='object')return String(t);return(t.props?.children??[]).flat(Infinity).map(c=>text(c)).join('')}
function render(){dirty=false;cursor=0;pending=[];tree=Component(props);pending.forEach(f=>f())}
function click(label){const b=nodes(tree).find(n=>n.type==='button'&&text(n).includes(label));assert.ok(b,label);b.props.onClick();render()}
function key(key,repeat=false,onButton=false){const e={key,repeat,target:{closest:sel=>onButton&&sel==='button'},preventDefault(){},stopImmediatePropagation(){}};[...listeners].forEach(f=>f(e));render()}
function reset(data){slots.forEach(s=>s?.cleanup?.());slots=[];listeners.clear();props=data;render()}
for(const [name,script] of Object.entries(lines)){
 let finished=0,cancelled=0;
 reset({character:'girl',lines:script,title:name,finishLabel:'完成',cancelLabel:'稍后',onFinish(){finished++},onCancel(){cancelled++}});
 assert.equal(nodes(tree).filter(n=>n.type==='img'&&n.props.alt).length,2);
 assert.ok(nodes(tree).some(n=>n.type==='img'&&n.props.src==='/assets/characters/girl.png'));
 key('e',true);assert.match(text(),new RegExp(script[0][1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(let i=0;i<script.length-1;i++){assert.ok(text().includes(script[i][1]));key(i%2?' ':'e')}
 assert.ok(text().includes(script.at(-1)[1]));assert.equal(finished,0);if(script.length>1){key('ArrowLeft');assert.ok(text().includes(script.at(-2)[1]));key('ArrowRight');assert.ok(text().includes(script.at(-1)[1]))}key('ArrowRight');assert.equal(finished,0);
 key('e');assert.equal(finished,0);click('完成');assert.equal(finished,1);
 reset({...props});key('Escape');assert.equal(cancelled,1);reset({...props});for(let i=1;i<script.length;i++)key('ArrowRight');key(' ',false,true);assert.equal(cancelled,2);assert.equal(finished,1);
 reset({...props,onCancel:undefined});for(let i=1;i<script.length;i++)key('ArrowRight');key(' ');assert.equal(finished,2);
}
console.log('PASS: all 5 scene scripts (including stadium reward and journey ending); student choice and both actors; keyboard/click progression; key repeat ignored; final choice required; cancellation supported. Component logic only.');

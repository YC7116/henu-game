const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createRequire}=require('node:module');const {transformSync}=createRequire(require.resolve('vite'))('esbuild');
const store=new Map(),session=new Map();let writes=0;
const localStorage={getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k),setItem(k,v){store.set(k,v);writes++}};
const sessionStorage={getItem:k=>session.get(k)??null,removeItem:k=>session.delete(k),setItem(k,v){session.set(k,v);writes++}};
function compile(file,extra={}){const code=transformSync("import * as React from 'react';\n"+fs.readFileSync(file,'utf8'),{loader:'tsx',format:'cjs',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).code;const m={exports:{}};vm.runInNewContext(code,{module:m,exports:m.exports,require:name=>name==='react'?react:{},localStorage,sessionStorage,window:win,...extra});return m.exports}
let slots=[],cursor=0,pending=[],tree,listeners=new Set(),props,awards=0,exits=0;
const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),Fragment:'fragment',useRef(value){const i=cursor++;return slots[i]??=({current:value})},useState(value){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})}};
const win={addEventListener:(event,fn)=>listeners.add(fn),removeEventListener:(event,fn)=>listeners.delete(fn)};
const {readTaskProgress,completeTask,resetJourney,readJourneyPosition,saveJourneyPosition}=compile('src/task-progress.ts');
let progress=readTaskProgress();assert.equal(Object.keys(progress).length,0);
for(const id of ['gate','library','teaching','stadium','lake','architecture']){progress=completeTask(progress,id);assert.equal(progress[id],true)}
const count=writes;assert.equal(completeTask(progress,'lake'),progress);assert.equal(writes,count);assert.equal(Object.keys(readTaskProgress()).length,6);
store.clear();session.clear();store.set('henu-library-module','1');store.set('henu-lake-module','1');store.set('henu-stadium-fragments','2');store.set('henu-south-gate-built','1');store.set('henu-task-progress-v1',JSON.stringify({library:true,lake:true,stadium:true,architecture:true}));assert.equal(Object.keys(readTaskProgress()).length,0,'old playtest rewards must not count');
store.set('henu-stadium-sprint-best','12.3');
const position={x:1227,y:612,direction:'down',distance:600,visited:2};saveJourneyPosition(position);assert.equal(readJourneyPosition({}).x,position.x);
progress=completeTask({},'gate');assert.equal(readTaskProgress().gate,true);resetJourney();assert.equal(Object.keys(readTaskProgress()).length,0);assert.equal(readJourneyPosition(position),position);assert.equal(store.get('henu-stadium-sprint-best'),'12.3');assert.equal(store.has('henu-stadium-fragments'),false);
assert.equal(session.has('henu-journey-position-v2'),false);session.set('henu-journey-tasks-v2','invalid');assert.equal(Object.keys(readTaskProgress()).length,0);

const content=compile('src/content.ts'),route=compile('src/walking-route.ts');
for(const stop of route.routeStops)assert.equal(stop.number,content.places.find(p=>p.id===stop.id).number);
assert.equal(content.places.find(p=>p.id==='stadium').number,'04');assert.equal(content.places.find(p=>p.id==='lake').number,'05');
const Component=compile('src/LibraryMission.tsx').default;
function nodes(t,result=[]){if(t&&typeof t==='object'&&t.props){result.push(t);for(const c of t.props.children.flat(Infinity))nodes(c,result)}return result}
function text(t){if(arguments.length===0)t=tree;if(t==null||typeof t==='boolean')return '';if(typeof t!=='object')return String(t);return(t.props?.children??[]).flat(Infinity).map(c=>text(c)).join('')}
function render(){cursor=0;pending=[];tree=Component(props);pending.forEach(f=>f())}
function click(label){const b=nodes(tree).find(n=>n.type==='button'&&text(n).includes(label));assert.ok(b,label);b.props.onClick();render()}
function space(repeat=false){[...listeners].forEach(f=>f({key:' ',repeat,target:{closest:()=>false},preventDefault(){}}));render()}
props={character:'girl',completed:false,onComplete(){awards++},onExit(){exits++}};render();space();assert.ok(text().includes('开始对话'));click('开始对话');space(true);assert.ok(text().includes('图书馆到了'));space();space();space();assert.ok(text().includes('创建于哪一年'));space();assert.ok(text().includes('创建于哪一年'));assert.equal(awards,0);
click('1902');assert.ok(text().includes('再想想'));assert.equal(awards,0);click('1912');space();space();space();assert.ok(text().includes('校训是什么'));click('明德新民');space();space();space();assert.equal(awards,1);space();space();assert.ok(text().includes('建筑碎片 ×1'));assert.ok(nodes(tree).some(n=>n.props.id==='library'));click('上一句');assert.ok(text().includes('去综合教学楼'));click('继续对话');assert.ok(text().includes('建筑碎片 ×1'));assert.equal(awards,1);space();assert.equal(exits,1);
console.log('PASS: persistent and idempotent task completion; old playtest isolation; fresh journey reset; refreshed position recovery; best-time preservation; matching map/route numbering; library Space progression, repeat guard, no auto-answer, wrong answer not completed, reward after both correct answers. Logic tests only.');

const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {createRequire}=require('node:module'),{transformSync}=createRequire(require.resolve('vite'))('esbuild');
// Expose the component's actual exit/claim handlers while skipping the WebGL effect.
let source=fs.readFileSync('src/tour/StadiumRun.tsx','utf8').replace('  const toggleView = () => {','  globalThis.__raceRewardTest={finishedRace,closeRef,receiveReward};\n  const toggleView = () => {');
const code=transformSync("import * as React from 'react';\n"+source,{loader:'tsx',format:'cjs',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).code;
let slots=[],cursor=0,awards=0,exits=0,writes=0,tree;
const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),Fragment:'fragment',useEffect(){},useRef(v){const i=cursor++;return slots[i]??=({current:v})},useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]}};
const context={module:{exports:{}},React:react,exports:{},require:n=>n==='react'?react:{},localStorage:{getItem(){return null},setItem(k,v){assert.equal(k,'henu-stadium-fragments');assert.equal(v,'1');writes++}},document:{pointerLockElement:null}};context.exports=context.module.exports;vm.runInNewContext(code,context);
const Component=context.module.exports.default;
function render(completed=false){cursor=0;tree=Component({character:'girl',completed,onComplete(){awards++},onClose(){exits++}})}
function nodes(t,result=[]){if(t?.props){result.push(t);t.props.children.flat(Infinity).forEach(c=>nodes(c,result))}return result}
render();context.__raceRewardTest.closeRef.current();assert.equal(exits,1);assert.equal(awards,0);assert.equal(writes,0);
slots=[];render();context.__raceRewardTest.finishedRace.current=true;context.__raceRewardTest.closeRef.current();render();assert.equal(exits,1);assert.equal(awards,0);assert.equal(writes,0);
const dialogue=nodes(tree).find(n=>n.props.title==='体育场 · 完赛后的奖励');assert.ok(dialogue);assert.equal(dialogue.props.character,'girl');assert.equal(dialogue.props.onCancel,undefined);
dialogue.props.onFinish();assert.equal(awards,1);assert.equal(writes,1);assert.equal(exits,1);render();assert.ok(nodes(tree).some(n=>n.props.id==='stadium'));const returnButton=nodes(tree).find(n=>n.type==='button'&&n.props.children.flat().some(c=>typeof c==='string'&&c.includes('收好碎片')));assert.ok(returnButton);returnButton.props.onClick();assert.equal(exits,2);dialogue.props.onFinish();assert.equal(awards,1);assert.equal(writes,1);
slots=[];render(true);context.__raceRewardTest.finishedRace.current=true;context.__raceRewardTest.closeRef.current();assert.equal(awards,1);assert.equal(writes,1);
console.log('PASS: early exit has no reward; finished race exit opens dialogue; reward/task callback only on explicit claim; repeated claim and completed revisit never duplicate. WebGL finish is simulated; actual component handlers executed.');

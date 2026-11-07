import fs from 'node:fs'
import ts from 'typescript'
import assert from 'node:assert/strict'
const read = name => fs.readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8')
const source = read('walking-route') + '\n' + read('world').replace(/^import .*walking-route.*$/mg, '').replace(/^export .* from .*walking-route.*$/mg, '')
const js = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 })
const world = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
for (let i=1;i<world.walkRoute.length;i++) {
  const a=world.walkRoute[i-1],b=world.walkRoute[i]
  const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2)
  for(let j=0;j<=n;j++) assert.ok(!world.blocked({x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n}),'Route must remain open')
}
assert.ok(world.blocked({x:0,y:0}),'Off-route movement must be blocked')
let player=world.initialPlayer(),demo=world.initialDemo()
for(let i=0;i<60000&&!demo.done;i++) ({player,demo}=world.stepRouteDemo(player,demo,1/60))
assert.ok(demo.done,'Full guided demo must complete')
assert.equal(player.visited,world.routeStops.length)
console.log(`PASS: guided corridor restored; all ${world.routeStops.length} landmarks reachable; full demo completed.`)

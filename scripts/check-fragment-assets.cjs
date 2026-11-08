const fs=require('node:fs'),assert=require('node:assert/strict'),zlib=require('node:zlib');
for(let n=1;n<=4;n++){
 const b=fs.readFileSync(`public/assets/rewards/fragments/p${n}.png`);assert.equal(b.toString('ascii',1,4),'PNG');
 const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert.equal(b[24],8);assert.equal(b[25],6,'RGBA image required');assert.ok(w>500&&h>500);
 let chunks=[];for(let i=8;i<b.length;){const len=b.readUInt32BE(i);if(b.toString('ascii',i+4,i+8)==='IDAT')chunks.push(b.subarray(i+8,i+8+len));i+=len+12}
 const data=zlib.inflateSync(Buffer.concat(chunks)),stride=w*4;let prev=Buffer.alloc(stride),transparent=0,opaque=0,pos=0;
 function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c}
 for(let y=0;y<h;y++){
  const filter=data[pos++],row=Buffer.from(data.subarray(pos,pos+stride));pos+=stride;
  for(let x=0;x<stride;x++){const a=x>=4?row[x-4]:0,up=prev[x],c=x>=4?prev[x-4]:0;row[x]=(row[x]+(filter===0?0:filter===1?a:filter===2?up:filter===3?Math.floor((a+up)/2):paeth(a,up,c)))&255}
  for(let x=3;x<stride;x+=4){if(row[x]===0)transparent++;if(row[x]>=240)opaque++}prev=row;
 }
 assert.ok(transparent>w*h*.08,'white exterior must be transparent');assert.ok(opaque>w*h*.25,`piece must remain visible: ${opaque/(w*h)}; interlace ${b[28]}`);console.log(`PASS p${n}: ${w}x${h} RGBA; ${(transparent/(w*h)*100).toFixed(1)}% transparent`);
}
const source='../picture/河南大学古韵校门微缩景观.png';
if(fs.existsSync(source)){
 assert.deepEqual(fs.readFileSync('public/assets/rewards/fragments/south-gate-complete.png'),fs.readFileSync(source));
 console.log('PASS: full picture is the original, unchanged asset.');
}else{
 const b=fs.readFileSync('public/assets/rewards/fragments/south-gate-complete.png');
 assert.equal(b.toString('ascii',1,4),'PNG');assert.ok(b.readUInt32BE(16)>500&&b.readUInt32BE(20)>500);
 console.log(`SKIP: original photo not found (${source}); verified south-gate-complete.png is a valid PNG.`);
}

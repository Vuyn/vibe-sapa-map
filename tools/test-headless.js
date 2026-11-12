// Headless sanity test for the built map: runs the page script with DOM stubs in Node 20+.
// Usage: node test-headless.js <index.html>
// Checks: script runs, data unpacks, every place is reachable on foot from the church, the route plans use the
// mountain train and cable car (and go on foot after hours), the walker really makes those trips, the sun stands where it
// should and casts long shadows only when it is low, nobody and no animal stands on water, no trek line runs over a
// lake or reservoir, lakes and reservoirs lie on level ground, the dams are there, a click on the lake goes to the
// nearest shore, and no Vietnamese is garbled.
// There is no Worker in Node, so the land is built on the main thread here. For how it looks, use shot.ps1.
const fs=require('fs');
const html=fs.readFileSync(process.argv[2],'utf8');
const m=html.match(/<script>([\s\S]*)<\/script>/);if(!m){console.log('no script');process.exit(1);}
// double-encoded UTF-8 signatures; a plain "Ã" is a real Vietnamese letter, so require its continuation byte
const moj=(html.match(/Ã[\u0080-¿]|Æ°|á»/g)||[]).length;
const el=()=>new Proxy({style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},dataset:{dir:'0,1'},children:[],hidden:false,value:'9',width:800,height:450,getBoundingClientRect:()=>({width:800,height:450,left:0,top:0}),addEventListener(){},setAttribute(){},setPointerCapture(){},getContext:()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:40}):k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):(()=>{}),set:()=>true}),appendChild(){},querySelector:()=>el()},{get:(t,k)=>k in t?t[k]:undefined,set:(t,k,v)=>{t[k]=v;return true;}});
globalThis.document={createElement:()=>el(),getElementById:()=>el(),querySelectorAll:()=>[],fonts:null,hidden:false};
globalThis.window=globalThis;globalThis.addEventListener=()=>{};globalThis.devicePixelRatio=1;globalThis.requestAnimationFrame=()=>{};
globalThis.localStorage={getItem:()=>null,setItem(){}};
const realSetTimeout=setTimeout;globalThis.setInterval=()=>0;
const sleep=ms=>new Promise(r=>realSetTimeout(r,ms));
const t0=Date.now();
new Function(m[1])();
(async()=>{
 for(let i=0;i<400&&!globalThis.__T;i++)await sleep(50);
 const T=globalThis.__T;if(!T){console.log('FAILED: page script did not finish booting');process.exit(1);}
 console.log('boot ms',Date.now()-t0,'| grid',T.W+'x'+T.H,'| html KB',Math.round(html.length/1024),'| garbled sequences',moj);
 const kinds={};for(let i=0;i<T.kind.length;i++){const k=T.KINDS[T.kind[i]];kinds[k]=(kinds[k]||0)+1;}console.log(JSON.stringify(kinds));
 const amb={};for(const a of T.amb)amb[a.kind]=(amb[a.kind]||0)+1;
 console.log('moving things',JSON.stringify(amb),'| shoppers',T.shoppers.length,'| harvest crew',T.crews.length,'| features',T.FEAT.length,'| street labels',T.STREET_LABELS.length,'| poi tiles',T.poiAt.size);
 console.log('treks',T.TREKS.map(t=>t.id+':'+t.lines.length).join(' '),'| train line',T.TRAIN_LINE.length,'pts | cable',T.CABLE_LINE[0].map(Math.round),'->',T.CABLE_LINE[T.CABLE_LINE.length-1].map(Math.round));
 const by=id=>T.LM.find(l=>l.id===id);let bad=0;const start=T.nearTarget(by('church'));
 for(const l of T.LM){const tg=T.nearTarget(l);const t1=Date.now();const p=T.findPath(start[0],start[1],tg[0],tg[1]);const ew=p?T.estimate(p):null;
  console.log(l.id.padEnd(11),'tile',T.at(l.x,l.y).k.padEnd(8),'elev',String(Math.round(T.at(Math.round(l.x+l.w/2),Math.round(l.y+l.w/2)).e)).padStart(5),'walk',p?String(p.length).padStart(4)+' tiles '+String(Math.round(ew.min)).padStart(4)+' min':'NONE',(Date.now()-t1)+' ms');if(!p)bad++;}
 // the plan shown on the card
 const plan=id=>{const r=T.routeInfo(by(id));return r.parts.map(p=>p.k+' '+Math.round(p.min)).join(' > ')+' = '+Math.round(r.total)+' min';};
 const p1=plan('fansipan');console.log('plan church -> Fansipan:',p1);if(!/trainDown/.test(p1)||!/cableUp/.test(p1))bad++;
 // drive the walker: travel() then tick() until it settles; rides are flagged when seen
 async function go(id){const seen=new Set();T.travel(by(id));let idle=0;for(let i=0;i<80000&&idle<8;i++){T.tick(50);if(T.hero.riding)seen.add(T.hero.riding.sprite);if(!T.hero.moving&&!T.hero.path.length&&!T.hero.riding){idle++;await sleep(330);}else idle=0;}
  const l=by(id),d=Math.hypot(T.hero.x-l.x-l.w/2,T.hero.y-l.y-l.w/2);return{d:Math.round(d),rides:[...seen].join('+')||'none'};}
 const r1=await go('cable');console.log('church -> cable car base: ended',r1.d,'tiles away, rides:',r1.rides);if(r1.d>8||!/train/.test(r1.rides))bad++;
 const r2=await go('fansipan');console.log('cable car base -> Fansipan: ended',r2.d,'tiles away, rides:',r2.rides);if(r2.d>8||!/gondola/.test(r2.rides))bad++;
 const r3=await go('church');console.log('Fansipan -> church: ended',r3.d,'tiles away, rides:',r3.rides);if(r3.d>8||!/gondola/.test(r3.rides)||!/train/.test(r3.rides))bad++;
 // after hours the cable car and the mountain train stand still: the plan to Fansipan is all on foot at 22:00, and
 // uses both rides again at 9:00
 {T.setClock(22,2);const late=T.routeInfo(by('fansipan')).parts.map(p=>p.k).join('>');T.setClock(9,2);const open=T.routeInfo(by('fansipan')).parts.map(p=>p.k).join('>');
  console.log('plan to Fansipan at 22:00:',late,'| at 9:00:',open);if(/train|cable/.test(late)||!/train/.test(open)||!/cable/.test(open))bad++;}
 // the sun: in the south-east on a December morning, about 44 degrees up at noon in December, and shadows that are long
 // early in the day and nearly gone by noon
 {const pct=(h,m)=>{const s=T.sunAt(h,m),d=T.castShadows(Math.sin(s.az),-Math.cos(s.az),Math.tan(s.alt));let n=0;for(let i=0;i<d.length;i++)if(d[i]>6)n++;return 100*n/d.length;};
  const a=T.sunAt(8,12),b=T.sunAt(12,12),early=pct(7.5,9),noon=pct(12,9);
  console.log('sun: December 8:00 bearing',Math.round(a.az*180/Math.PI),'| December noon altitude',Math.round(b.alt*180/Math.PI),'| land in shadow at 7:30',early.toFixed(1)+'%','at noon',noon.toFixed(1)+'%');
  if(!(a.az>1.75&&a.az<2.45)||!(b.alt>0.72&&b.alt<0.82)||!(early>10&&noon<3))bad++;T.lightLayers();}
 // nobody stands or walks on water: sample every walker's whole line, and everyone who stands still
 {let wet=0;const dry=T.dryAt;for(const a of T.amb){if(a.kind==='train')continue;if(a.path){for(const q of a.path)if(!dry(q[0],q[1]))wet++;for(let i=0;i<a.path.length-1;i++)for(let k=1;k<8;k++)if(!dry(a.path[i][0]+(a.path[i+1][0]-a.path[i][0])*k/8,a.path[i][1]+(a.path[i+1][1]-a.path[i][1])*k/8))wet++;}else if(a.px!==undefined&&!dry(a.px/8,a.py/8))wet++;}
  for(const s of T.shoppers)if(!dry(s.x,s.y))wet++;for(const c of T.crews)if(!dry(c.x,c.y))wet++;for(const s of T.stalls)if(!dry(s.x,s.y))wet++;
  console.log('figures on water',wet,'| homestays',T.STAYS.length,[...new Set(T.STAYS.map(s=>s.v))].join(','));if(wet)bad++;}
 // no trek line runs over a lake or reservoir (a tile at least half water); a stream it steps across is fine
 {let wet=0;const pop=v=>{let n=0;while(v){n+=v&1;v>>>=1;}return n;},where=[];
  for(const t of T.TREKS)for(const ln of t.lines)for(let i=0;i<ln.length-1;i++){const a=ln[i],b=ln[i+1],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4));
   for(let k=0;k<=n;k++){const x=Math.floor(a[0]+(b[0]-a[0])*k/n),y=Math.floor(a[1]+(b[1]-a[1])*k/n);if(x<0||y<0||x>=T.W||y>=T.H)continue;const j=y*T.W+x;if(T.KINDS[T.kind[j]]==='water'&&pop(T.wMask[j]||0xFFFF)>=8){wet++;if(where.length<3)where.push(t.id+' '+x+','+y);}}}
  console.log('trek line samples on a lake or reservoir',wet,where.join(' | '));if(wet)bad++;}
 // water lies level: no lake or reservoir tile (half water or more) stands more than 40 m above the lowest ground three
 // tiles around it. This is what catches hillside shadow that the satellite land cover calls water. The small mapped
 // reservoir above Thác Bạc sits on steep ground and accounts for 11 such tiles; before the rule there were several hundred.
 {let high=0;const pop=v=>{let n=0;while(v){n+=v&1;v>>>=1;}return n;},where=[];
  for(let y=0;y<T.H;y++)for(let x=0;x<T.W;x++){const j=y*T.W+x;if(T.KINDS[T.kind[j]]!=='water'||(T.flags[j]&4)||pop(T.wMask[j]||0xFFFF)<8)continue;let m=1e9;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<T.W&&yy<T.H)m=Math.min(m,T.elev[yy*T.W+xx]);}if(T.elev[j]-m>40){high++;if(where.length<4)where.push(x+','+y);}}
  console.log('wide water tiles on a slope',high,where.join(' | '),'| dam tiles',T.damAt?T.damAt.size:0,'| named dams and power plants',T.POWER?T.POWER.map(p=>p.en||'(plant, no name)').join(', '):'none');if(high>20||!T.damAt||!T.damAt.size)bad++;}
 // a click on the lake walks to the nearest shore instead of refusing
 {const lake=by('lake'),lx=lake.x+1,ly=lake.y+1,wk=T.KINDS[T.kind[ly*T.W+lx]],n=T.nearestOpen(lx,ly);console.log('lake tile',wk,'-> nearest reachable',n&&n.join(','),n?T.KINDS[T.kind[n[1]*T.W+n[0]]]:'');if(!n||!T.reach[n[1]*T.W+n[0]]||T.reach[ly*T.W+lx])bad++;
  T.walkTo(lx,ly);const g=T.goal;console.log('walkTo lake: goal',g&&g.join(','),'path',T.hero.path.length);if(!g||!T.hero.path.length)bad++;T.hero.path.length=0;}
 console.log('fog level 7h',Math.round(T.fogLevel(7)),'12h',Math.round(T.fogLevel(12)));
 console.log('BAD',bad);process.exit(bad||moj?1:0);
})();

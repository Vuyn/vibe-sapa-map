// Roads, town streets, rivers, railways, places to stay and small map features, simplified into tile coordinates.
// Lakes are not handled here: parse-osm2.js takes them from the land-cover download, which has their full outlines.
// Usage: node parse-osm.js raw/sapa.json data/osm-out.json [--list]     (--list prints every named place with coordinates)
const fs=require('fs'),path=require('path'),{cleanStreet,cleanShop}=require('./names.js');
const [,,inPath,outPath]=process.argv;const list=process.argv.includes('--list');
const F=JSON.parse(fs.readFileSync(path.join(__dirname,'frame.json'),'utf8'));
let raw=fs.readFileSync(inPath,'utf8');
// a download saved by PowerShell 5.1 without -OutFile is double-encoded; undo that
if(/Ã[\u0080-¿]|Æ°|á»/.test(raw))raw=Buffer.from(raw,'latin1').toString('utf8');
const data=JSON.parse(raw);
const W=F.W,H=F.H,toX=lon=>(lon-F.LON0)/(F.LON1-F.LON0)*W,toY=lat=>(F.LAT1-lat)/(F.LAT1-F.LAT0)*H;
// a node can appear twice (bare inside a way, tagged as a place): never let the bare copy replace the tagged one
const nodes=new Map(),ways=[];for(const el of data.elements){if(el.type==='node'){const o=nodes.get(el.id);if(!o||el.tags||!o.tags)nodes.set(el.id,el);}else if(el.type==='way')ways.push(el);}
const CH=F.town;
function km(a,b){const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLon=(b.lon-a.lon)*Math.PI/180,s=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(s));}
function centroid(w){const ps=w.nodes.map(id=>nodes.get(id)).filter(Boolean);if(!ps.length)return null;return{lat:ps.reduce((s,p)=>s+p.lat,0)/ps.length,lon:ps.reduce((s,p)=>s+p.lon,0)/ps.length};}
// named points
const pts=[];
for(const n of nodes.values()){const t=n.tags;if(!t)continue;const cat=t.place||(t.natural==='peak'?'peak':'')||(t.waterway==='waterfall'?'waterfall':'')||t.tourism||(t.railway==='station'?'station':'')||t.amenity||(t.mountain_pass?'pass':'');if(!cat)continue;pts.push({cat,name:t.name||t['name:en']||'',en:t['name:en']||'',lat:n.lat,lon:n.lon,ele:t.ele||'',km:+km(CH,n).toFixed(2)});}
for(const w of ways){const t=w.tags||{};const cat=t.tourism||(t.railway==='station'?'station':'')||t.amenity||'';if(!cat)continue;const c=centroid(w);if(!c)continue;pts.push({cat,name:t.name||'',en:t['name:en']||'',lat:+c.lat.toFixed(5),lon:+c.lon.toFixed(5),ele:'',km:+km(CH,c).toFixed(2)});}
pts.sort((a,b)=>a.km-b.km);
if(list)for(const p of pts)console.log(p.cat.padEnd(16),String(p.lat).padEnd(10),String(p.lon).padEnd(11),(p.km+'km').padEnd(9),p.name,p.en&&p.en!==p.name?'/ '+p.en:'',p.ele?'ele '+p.ele:'');
// polylines, simplified with Douglas-Peucker in tile units
function dp(points,eps){if(points.length<3)return points;let maxD=0,idx=0;const [ax,ay]=points[0],[bx,by]=points[points.length-1];const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
 for(let i=1;i<points.length-1;i++){const [px,py]=points[i];let t=l2?((px-ax)*dx+(py-ay)*dy)/l2:0;t=Math.max(0,Math.min(1,t));const d=Math.hypot(px-(ax+t*dx),py-(ay+t*dy));if(d>maxD){maxD=d;idx=i;}}
 if(maxD>eps){const l=dp(points.slice(0,idx+1),eps),r=dp(points.slice(idx),eps);return l.slice(0,-1).concat(r);}return[points[0],points[points.length-1]];}
const roads=[],rivers=[],streets=[],rail=[],cable=[];const counts={};
for(const w of ways){const t=w.tags||{};const ps=w.nodes.map(id=>nodes.get(id)).filter(Boolean);if(ps.length<2)continue;
 const line=ps.map(p=>[toX(p.lon),toY(p.lat)]);const len=line.reduce((s,p,i)=>i?s+Math.hypot(p[0]-line[i-1][0],p[1]-line[i-1][1]):0,0);
 const key=t.highway?'highway:'+t.highway:t.waterway?'waterway:'+t.waterway:t.railway?'railway:'+t.railway:t.aerialway?'aerialway:'+t.aerialway:t.natural==='water'?'water':'other';counts[key]=(counts[key]||0)+1;
 if(t.highway){const cls=t.highway,inTown=ps.some(p=>km(CH,p)<CH.radiusKm);
  if(['trunk','primary','secondary','tertiary'].includes(cls))roads.push({cls,name:cleanStreet(t.name),pts:dp(line,0.5)});
  else if(['unclassified','residential'].includes(cls)){if(inTown)streets.push({cls,name:cleanStreet(t.name),pts:dp(line,0.3)});else roads.push({cls,name:cleanStreet(t.name),pts:dp(line,0.8)});}
  else if((cls==='track'||cls==='path')&&len>24)roads.push({cls,name:cleanStreet(t.name),pts:dp(line,1.0)});}
 else if(t.waterway==='river'||t.waterway==='stream'){if(t.waterway==='river'||len>10)rivers.push({cls:t.waterway,name:t.name||'',pts:dp(line,0.5)});}
 else if(t.railway&&t.railway!=='station')rail.push({cls:t.railway,name:t.name||'',pts:dp(line,0.25)});
 else if(t.aerialway&&/cable_car|gondola/.test(t.aerialway))cable.push({cls:t.aerialway,name:t.name||'',pts:dp(line,0.5)});}
const CLS=['trunk','primary','secondary','tertiary','unclassified','residential','track','path','river','stream'];
const r1=v=>Math.round(v*10)/10;
const pack=l=>l.map(w=>({c:CLS.indexOf(w.cls),n:w.name||undefined,p:w.pts.flatMap(p=>[r1(p[0]),r1(p[1])])}));
const lines=l=>l.map(w=>({k:w.cls,n:w.name||undefined,p:w.pts.flatMap(p=>[r1(p[0]),r1(p[1])])}));
const STAY=['hotel','guest_house','hostel','chalet'];
const hotels=pts.filter(p=>STAY.includes(p.cat)).map(p=>[r1(toX(p.lon)),r1(toY(p.lat))]);
// small map features: waterfalls, viewpoints and peaks, with a name and height where OSM has them
const inFrame=p=>p.lon>=F.LON0&&p.lon<=F.LON1&&p.lat>=F.LAT0&&p.lat<=F.LAT1;
const feat=pts.filter(p=>['waterfall','viewpoint','peak'].includes(p.cat)&&inFrame(p)).map(p=>({k:p.cat,n:p.name||undefined,ne:p.en&&p.en!==p.name?p.en:undefined,x:r1(toX(p.lon)),y:r1(toY(p.lat)),e:p.ele?Math.round(parseFloat(p.ele)):undefined}));
// named places to stay outside town: the page marks the ones near a village as homestays
const seenStay=new Set(),stays=pts.filter(p=>STAY.includes(p.cat)&&p.km>CH.radiusKm&&inFrame(p)).map(p=>({n:cleanShop(p.name),x:r1(toX(p.lon)),y:r1(toY(p.lat))})).filter(s=>s.n&&!/^(homestay|home stay|hotel|ta van|tả van)$/i.test(s.n)&&!seenStay.has(s.n)&&seenStay.add(s.n));
const out={roads:pack(roads),streets:pack(streets),rivers:pack(rivers),rail:lines(rail),cable:lines(cable),hotels,stays,feat};
fs.writeFileSync(outPath,JSON.stringify(out));
const sz=s=>JSON.stringify(s).length;
console.log('ways',JSON.stringify(counts));
console.log('roads',roads.length,'streets',streets.length,'rivers',rivers.length,'stays',stays.length,'rail',rail.length,'cable',cable.length,'hotels',hotels.length,'| named points',pts.length);
for(const w of rail.concat(cable))console.log(' ',w.cls,JSON.stringify(w.name),'pts',w.pts.length,'from',w.pts[0].map(r1),'to',w.pts[w.pts.length-1].map(r1));
console.log('bytes roads',sz(out.roads),'streets',sz(out.streets),'rivers',sz(out.rivers),'total',sz(out));

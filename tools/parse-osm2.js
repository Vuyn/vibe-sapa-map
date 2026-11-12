// OpenStreetMap land-cover polygons (rasterised later in the page), lakes with their islands, dams, building centroids and shops in town.
// Usage: node parse-osm2.js raw/sapa2.json data/osm2-out.json [raw/dams.json]
// The dams file defaults to dams.json beside the first input.
const fs=require('fs'),path=require('path'),{cleanShop}=require('./names.js');
const [,,inPath,outPath]=process.argv;
const F=JSON.parse(fs.readFileSync(path.join(__dirname,'frame.json'),'utf8'));
let raw=fs.readFileSync(inPath,'utf8');if(/Ã[\u0080-¿]|Æ°|á»/.test(raw))raw=Buffer.from(raw,'latin1').toString('utf8');
const data=JSON.parse(raw);
const W=F.W,H=F.H,toX=lon=>(lon-F.LON0)/(F.LON1-F.LON0)*W,toY=lat=>(F.LAT1-lat)/(F.LAT1-F.LAT0)*H;
const r1=v=>Math.round(v*10)/10;
function dp(points,eps){if(points.length<3)return points;let maxD=0,idx=0;const [ax,ay]=points[0],[bx,by]=points[points.length-1];const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
 for(let i=1;i<points.length-1;i++){const [px,py]=points[i];let t=l2?((px-ax)*dx+(py-ay)*dy)/l2:0;t=Math.max(0,Math.min(1,t));const d=Math.hypot(px-(ax+t*dx),py-(ay+t*dy));if(d>maxD){maxD=d;idx=i;}}
 if(maxD>eps){const l=dp(points.slice(0,idx+1),eps),r=dp(points.slice(idx),eps);return l.slice(0,-1).concat(r);}return[points[0],points[points.length-1]];}
const COVER={farmland:'farm',orchard:'orchard',forest:'forest',wood:'forest',scrub:'scrub',grassland:'grass',heath:'scrub',meadow:'grass',grass:'grass',residential:'res',farmyard:'res',village_green:'grass',wetland:'wet',bare_rock:'rock',scree:'rock',water:'water',reservoir:'water',cemetery:'grass',industrial:'res',commercial:'res',retail:'res',park:'park',pitch:'park',garden:'park',stadium:'park',construction:'res',quarry:'rock',plant_nursery:'farm',aquaculture:'water',recreation_ground:'park',allotments:'farm'};
const polys=[],counts={},water=[],holes=[];
// water keeps a finer outline than the rest: the page draws it on the 10 m art grid; islands (inner rings) are cut out there
function addRing(geom,cls,inner){if(!geom||geom.length<4)return;const fine=cls==='water';const simp=dp(geom.map(g=>[toX(g.lon),toY(g.lat)]),fine?0.15:0.6);if(simp.length<4)return;const xs=simp.map(p=>p[0]),ys=simp.map(p=>p[1]);if(Math.max(...xs)<0||Math.min(...xs)>W||Math.max(...ys)<0||Math.min(...ys)>H)return;const flat=simp.flatMap(p=>[r1(p[0]),r1(p[1])]);if(fine)(inner?holes:water).push(flat);else polys.push({c:cls,p:flat});counts[inner?'island':cls]=(counts[inner?'island':cls]||0)+1;}
const clsOf=t=>t?COVER[t.landuse||t.natural||t.leisure]||null:null;
for(const el of data.elements){
 if(el.type==='way'&&el.geometry&&el.tags&&(el.tags.landuse||el.tags.natural||el.tags.leisure)){const c=clsOf(el.tags);if(c)addRing(el.geometry,c);}
 else if(el.type==='relation'&&el.members){const c=clsOf(el.tags);if(!c)continue;for(const m of el.members){if(m.type==='way'&&(m.role==='outer'||(m.role==='inner'&&c==='water'))&&m.geometry){const g=m.geometry;if(g.length>3&&Math.abs(g[0].lat-g[g.length-1].lat)<1e-7&&Math.abs(g[0].lon-g[g.length-1].lon)<1e-7)addRing(g,c,m.role==='inner');}}}}
const buildings=[],pois=[],bcount={};
const POI={cafe:'cafe',restaurant:'food',fast_food:'food',bar:'bar',pharmacy:'pharmacy',clinic:'pharmacy',hospital:'hospital',atm:'atm',bank:'atm',fuel:'fuel',school:'school',police:'police',post_office:'post'};
for(const el of data.elements){const t=el.tags;if(!t)continue;const c=el.center||(el.type==='node'?{lat:el.lat,lon:el.lon}:null);if(!c)continue;
 if(t.building){const b=t.building;const kind=/church|cathedral|chapel/.test(b)?'church':/hotel/.test(b)||t.tourism==='hotel'?'hotel':/school|college|university/.test(b)?'school':/hospital/.test(b)?'hospital':/industrial|warehouse/.test(b)?'ind':/apartments|commercial|retail|office|public|civic|government/.test(b)?'big':'house';buildings.push([r1(toX(c.lon)),r1(toY(c.lat)),kind]);bcount[kind]=(bcount[kind]||0)+1;}
 if(t.amenity&&POI[t.amenity])pois.push({k:POI[t.amenity],n:cleanShop(t.name||t['name:en']),x:r1(toX(c.lon)),y:r1(toY(c.lat))});
 else if(t.shop)pois.push({k:'shop',n:cleanShop(t.name||t['name:en']),s:t.shop,x:r1(toX(c.lon)),y:r1(toY(c.lat))});}
// dams: the crest line of each waterway=dam way, with its name where OpenStreetMap has one
const dams=[],damPath=process.argv[4]||path.join(path.dirname(inPath),'dams.json');
if(fs.existsSync(damPath)){let dr=fs.readFileSync(damPath,'utf8');if(/Ã[\u0080-¿]|Æ°|á»/.test(dr))dr=Buffer.from(dr,'latin1').toString('utf8');
 for(const el of JSON.parse(dr).elements){if(el.type!=='way'||!el.geometry||!el.tags||el.tags.waterway!=='dam')continue;const pts=dp(el.geometry.map(g=>[toX(g.lon),toY(g.lat)]),0.15);if(pts.some(p=>p[0]<0||p[1]<0||p[0]>=W||p[1]>=H))continue;const d={p:pts.flatMap(p=>[r1(p[0]),r1(p[1])])};if(el.tags.name)d.n=el.tags.name;dams.push(d);}}
else console.log('no dams file at',damPath,'- run fetch-data.js, or pass its path as the third argument');
fs.writeFileSync(outPath,JSON.stringify({cover:polys,water,holes,dams,buildings,pois}));
console.log('cover polys',polys.length,'water',water.length,'islands',holes.length,'dams',dams.length,JSON.stringify(counts));
console.log('buildings',buildings.length,JSON.stringify(bcount),'| pois',pois.length);

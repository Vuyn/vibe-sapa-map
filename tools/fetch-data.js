// Downloads the raw inputs for the frame in frame.json into ./raw. Files already present are kept; pass --force to refetch.
// Usage: node fetch-data.js [--force]
// Sources: AWS Terrain Tiles (SRTM, Terrarium PNG), OpenStreetMap via Overpass,
//          Esri/Impact Observatory Sentinel-2 10 m land cover, Google Fonts (Press Start 2P).
const fs=require('fs'),path=require('path');
const F=JSON.parse(fs.readFileSync(path.join(__dirname,'frame.json'),'utf8'));
const force=process.argv.includes('--force');
const raw=path.join(__dirname,'raw');for(const d of ['elev12','elev14','fonts'])fs.mkdirSync(path.join(raw,d),{recursive:true});
const lon2x=(lon,z)=>Math.floor((lon+180)/360*2**z);
const lat2y=(lat,z)=>{const r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z);};
async function get(url,file,opts){if(!force&&fs.existsSync(file)&&fs.statSync(file).size>0)return 'cached';const r=await fetch(url,opts);if(!r.ok)throw new Error(r.status+' '+url);fs.writeFileSync(file,Buffer.from(await r.arrayBuffer()));return 'ok';}
async function tiles(z,lon0,lon1,lat0,lat1,dir){let n=0;for(let x=lon2x(lon0,z);x<=lon2x(lon1,z);x++)for(let y=lat2y(lat1,z);y<=lat2y(lat0,z);y++){await get(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,path.join(raw,dir,`${x}_${y}.png`));n++;}console.log(dir,n,'tiles');}
/* Overpass servers are often busy: each query is tried on three mirrors, three rounds, and the parts are merged into one file */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function overpassOne(q,label){for(let round=0;round<3;round++){for(const ep of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter']){
  try{const r=await fetch(ep,{method:'POST',signal:AbortSignal.timeout(200000),headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'pixel-map-builder/1.0','Accept':'application/json'},body:'data='+encodeURIComponent(q)});if(!r.ok)throw new Error('HTTP '+r.status);const txt=Buffer.from(await r.arrayBuffer()).toString('utf8');const j=JSON.parse(txt);if(!j.elements)throw new Error('no elements');if(j.remark&&/timed out|out of memory/i.test(j.remark))throw new Error(j.remark);console.log(' ',label,j.elements.length,'elements from',ep);return j.elements;}catch(e){console.log('  FAIL',label,ep,e.message);}}
  await sleep(15000);}
 throw new Error('all Overpass endpoints failed for '+label);}
async function overpass(parts,file){if(!force&&fs.existsSync(file)&&fs.statSync(file).size>1000){console.log(path.basename(file),'cached');return;}
 /* the same node can arrive twice: bare as part of a way, and tagged as a place. Keep the tagged copy. */
 const seen=new Map(),elements=[];for(const [label,q] of parts){for(const el of await overpassOne(q,label)){const k=el.type+el.id+(el.geometry||el.center?'g':'');const at=seen.get(k);if(at===undefined){seen.set(k,elements.length);elements.push(el);}else if(el.tags&&!elements[at].tags)elements[at]=el;}}
 fs.writeFileSync(file,JSON.stringify({elements}));console.log(path.basename(file),elements.length,'elements');}
(async()=>{
 // elevation: zoom 12 for the whole frame, zoom 14 for the town detail box
 await tiles(12,F.LON0,F.LON1,F.LAT0,F.LAT1,'elev12');
 const d=F.detail,dl0=F.LON0+d.x/F.W*(F.LON1-F.LON0),dl1=F.LON0+(d.x+d.size)/F.W*(F.LON1-F.LON0),da1=F.LAT1-d.y/F.H*(F.LAT1-F.LAT0),da0=F.LAT1-(d.y+d.size)/F.H*(F.LAT1-F.LAT0);
 await tiles(14,dl0,dl1,da0,da1,'elev14');
 // OpenStreetMap
 const bb=[F.LAT0,F.LON0,F.LAT1,F.LON1].join(','),tb=F.town.poiBox.join(',');
 const body=inner=>`[out:json][timeout:120];(${inner});out body;>;out skel qt;`;
 await overpass([
  ['main roads',body(`way["highway"~"^(trunk|primary|secondary|tertiary)$"](${bb});`)],
  ['minor roads',body(`way["highway"~"^(unclassified|residential)$"](${bb});`)],
  ['tracks and paths',body(`way["highway"~"^(track|path)$"](${bb});`)],
  ['water and rail',body(`way["waterway"~"^(river|stream)$"](${bb});way["natural"="water"](${bb});way["railway"~"^(funicular|narrow_gauge|light_rail|monorail|rail)$"](${bb});way["aerialway"](${bb});`)],
  ['places',body(`node["place"~"^(town|village|hamlet)$"](${bb});node["natural"="peak"](${bb});node["waterway"="waterfall"](${bb});node["tourism"~"^(museum|hotel|guest_house|hostel|chalet|attraction|viewpoint)$"](${bb});way["tourism"~"^(museum|hotel|guest_house|hostel|chalet|attraction)$"](${bb});node["railway"="station"](${bb});way["railway"="station"](${bb});node["amenity"~"^(bus_station|marketplace|place_of_worship)$"](${bb});way["amenity"~"^(bus_station|marketplace|place_of_worship)$"](${bb});node["mountain_pass"="yes"](${bb});`)],
 ],path.join(raw,'sapa.json'));
 await overpass([
  ['land cover',`[out:json][timeout:180][maxsize:536870912];(way["landuse"](${bb});way["natural"~"^(wood|scrub|grassland|heath|wetland|bare_rock|scree|water)$"](${bb});rel["landuse"](${bb});rel["natural"~"^(wood|scrub|water)$"](${bb});way["leisure"~"^(park|pitch|garden|stadium)$"](${bb}););out geom;`],
  ['buildings and shops',`[out:json][timeout:180];(way["building"](${tb});node["amenity"~"^(cafe|restaurant|pharmacy|atm|bank|fuel|hospital|school|police|post_office|bar|fast_food|clinic)$"](${tb});way["amenity"~"^(cafe|restaurant|pharmacy|atm|bank|fuel|hospital|school|police|post_office|bar|fast_food|clinic)$"](${tb});node["shop"](${tb});way["shop"](${tb}););out center;`],
 ],path.join(raw,'sapa2.json'));
 // dams, in a file of their own so they can be fetched without redoing the large downloads above
 await overpass([
  ['dams',`[out:json][timeout:90];(way["waterway"="dam"](${bb}););out tags geom;`],
 ],path.join(raw,'dams.json'));
 // Sentinel-2 land cover, rendered in class colours at two pixels per tile
 const lc=`https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer/exportImage?bbox=${F.LON0},${F.LAT0},${F.LON1},${F.LAT1}&bboxSR=4326&imageSR=4326&size=${F.W*2},${F.H*2}&format=png&interpolation=RSP_NearestNeighbor&f=image`;
 console.log('landcover',await get(lc,path.join(raw,'landcover.png'),{headers:{'User-Agent':'pixel-map-builder/1.0'}}));
 // pixel font, latin and latin-ext subsets
 const css=await (await fetch('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'}})).text();
 let manifest='';for(const m of css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{([\s\S]*?)\}/g)){if(!['latin','latin-ext'].includes(m[1]))continue;const url=/url\((https:[^)]+)\)/.exec(m[2])[1],range=/unicode-range: ([^;]+);/.exec(m[2])[1],name=`PressStart2P-400-${m[1]}.woff2`;await get(url,path.join(raw,'fonts',name));manifest+=`${name}\tPress Start 2P\t400\t${range}\n`;}
 fs.writeFileSync(path.join(raw,'fonts','manifest.txt'),manifest);console.log('fonts ok');
})().catch(e=>{console.error('FETCH FAILED:',e.message);process.exit(1);});

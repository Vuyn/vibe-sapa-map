// Assemble the single-file map from template.html, frame.json and ./data.
// Usage: node build.js data template.html ..\index.html
// data must contain: elev.bin, elev.json, detail.bin, lc.bin, osm-out.json, osm2-out.json, fonts/ (manifest.txt + woff2).
// The data goes into the page as one container: [uint32 length][JSON][binary parts], gzipped, then base64 once.
const fs=require('fs'),zlib=require('zlib'),path=require('path');
const [,,dataDir,templatePath,outPath]=process.argv;
const F=JSON.parse(fs.readFileSync(path.join(__dirname,'frame.json'),'utf8'));
const rd=f=>fs.readFileSync(path.join(dataDir,f),'utf8').trim(),bin=f=>fs.readFileSync(path.join(dataDir,f));
const osm=JSON.parse(rd('osm-out.json')),osm2=JSON.parse(rd('osm2-out.json'));
const parts={elev:bin('elev.bin'),detail:bin('detail.bin'),lc:bin('lc.bin')},index={};let off=0;
for(const k of Object.keys(parts)){index[k]=[off,parts[k].length];off+=parts[k].length;}
const meta=Buffer.from(JSON.stringify({parts:index,elev:JSON.parse(rd('elev.json')),osm,cover:osm2.cover,water:osm2.water,holes:osm2.holes,buildings:osm2.buildings,pois:osm2.pois}),'utf8');
const head=Buffer.alloc(4);head.writeUInt32LE(meta.length,0);
const gz=zlib.gzipSync(Buffer.concat([head,meta,...Object.values(parts)]),{level:9}).toString('base64');
// embedded pixel font
let fontCss='';
for(const line of rd('fonts/manifest.txt').split(/\r?\n/)){const [file,fam,weight,range]=line.split('\t');if(!file||!/^PressStart2P/.test(file))continue;
 const b64=fs.readFileSync(path.join(dataDir,'fonts',file)).toString('base64');
 fontCss+=`@font-face{font-family:'${fam}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${range}}\n`;}
let html=fs.readFileSync(templatePath,'utf8');
for(const ph of ['__DATA_GZ__','__FONT_CSS__','__FRAME__','__W__','__H__'])if(!html.includes(ph))throw new Error('template placeholder missing: '+ph);
const frame={W:F.W,H:F.H,LON0:F.LON0,LON1:F.LON1,LAT0:F.LAT0,LAT1:F.LAT1,MPT:F.MPT,detail:F.detail};
html=html.replace('__DATA_GZ__',()=>gz).replace('__FONT_CSS__',()=>fontCss.trim()).replace('__FRAME__',()=>JSON.stringify(frame)).split('__W__').join(String(F.W)).split('__H__').join(String(F.H));
fs.writeFileSync(outPath,html,'utf8');
console.log('frame',F.W+'x'+F.H,'| data gzip+base64',gz.length,'| html bytes',Buffer.byteLength(html,'utf8'));

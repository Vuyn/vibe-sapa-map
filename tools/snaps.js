// Lists the hex colours written in a function of the template and the palette colour each one is snapped to.
// Usage: node snaps.js drawTile [another function ...]
const fs=require('fs'),path=require('path'),t=fs.readFileSync(path.join(__dirname,'template.html'),'utf8');
const pm=t.match(/const PALETTE=\(([\s\S]*?)\)\.split/)[1];const PAL=[...pm.matchAll(/[0-9a-f]{6}/g)].map(m=>m[0]).map(h=>[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]);
const palRGB=(r,g,b)=>{let best=PAL[0],bd=1e12;for(const p of PAL){const rm=(r+p[0])/2,dr=r-p[0],dg=g-p[1],db=b-p[2],d=(2+rm/256)*dr*dr+4*dg*dg+(2+(255-rm)/256)*db*db;if(d<bd){bd=d;best=p;}}return best;};
const hex=p=>'#'+p.map(v=>v.toString(16).padStart(2,'0')).join('');
for(const name of process.argv.slice(2)){const a=t.indexOf('function '+name+'('),b=t.indexOf('\nfunction ',a+10);const body=t.slice(a,b),m=new Map();
 for(const q of body.matchAll(/#[0-9a-fA-F]{6}\b/g)){const h=q[0].toLowerCase();m.set(h,(m.get(h)||0)+1);}
 console.log(name+':',[...m.keys()].map(h=>{const s=hex(palRGB(parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)));return h+(s===h?'':'>'+s);}).join(' '));}

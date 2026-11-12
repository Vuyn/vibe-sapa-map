// Turns the PNGs in ./raw into the grids the page embeds, in ./data. Pure Node, no packages.
//   elev.bin + elev.json  elevation at every elevStep-th tile, 1 m precision, as predictor residuals (low-byte plane, high-byte plane)
//   detail.bin            town box at `factor` samples per tile, 8-bit, metres = 1100 + v*3.5
//   lc.bin                W x H land-cover class per tile: 0 none 1 water 2 trees 3 flooded 4 crops 5 built 6 bare 7 snow 8 cloud 9 rangeland
// Usage: node resample.js
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const F=JSON.parse(fs.readFileSync(path.join(__dirname,'frame.json'),'utf8'));
const raw=path.join(__dirname,'raw'),data=path.join(__dirname,'data');fs.mkdirSync(path.join(data,'fonts'),{recursive:true});
/* minimal PNG reader: 8-bit, colour types 0 grey, 2 RGB, 3 palette, 6 RGBA, non-interlaced -> RGBA */
function readPng(file){const b=fs.readFileSync(file);let p=8,w,h,ct,pal=null,trns=null;const idat=[];
 while(p<b.length){const len=b.readUInt32BE(p),type=b.toString('ascii',p+4,p+8),d=b.subarray(p+8,p+8+len);
  if(type==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);ct=d[9];if(d[8]!==8||d[12]!==0)throw new Error('unsupported PNG '+file);}
  else if(type==='PLTE')pal=d;else if(type==='tRNS')trns=d;else if(type==='IDAT')idat.push(d);else if(type==='IEND')break;p+=12+len;}
 const bpp={0:1,2:3,3:1,6:4}[ct],stride=w*bpp,inf=zlib.inflateSync(Buffer.concat(idat)),px=Buffer.alloc(h*stride);
 for(let y=0;y<h;y++){const f=inf[y*(stride+1)],row=inf.subarray(y*(stride+1)+1,(y+1)*(stride+1)),o=y*stride;
  for(let x=0;x<stride;x++){const a=x>=bpp?px[o+x-bpp]:0,up=y?px[o+x-stride]:0,c=(x>=bpp&&y)?px[o+x-stride-bpp]:0;let v=row[x];
   if(f===1)v+=a;else if(f===2)v+=up;else if(f===3)v+=(a+up)>>1;else if(f===4){const pp=a+up-c,pa=Math.abs(pp-a),pb=Math.abs(pp-up),pc=Math.abs(pp-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?up:c);}px[o+x]=v&255;}}
 const out=Buffer.alloc(w*h*4);for(let i=0;i<w*h;i++){let r,g,bl,al=255;if(ct===2){r=px[i*3];g=px[i*3+1];bl=px[i*3+2];}else if(ct===6){r=px[i*4];g=px[i*4+1];bl=px[i*4+2];al=px[i*4+3];}else if(ct===3){const k=px[i];r=pal[k*3];g=pal[k*3+1];bl=pal[k*3+2];if(trns&&k<trns.length)al=trns[k];}else{r=g=bl=px[i];}out[i*4]=r;out[i*4+1]=g;out[i*4+2]=bl;out[i*4+3]=al;}
 return{w,h,data:out};}
/* Terrarium elevation tiles */
function loadTiles(dir){const m=new Map();for(const f of fs.readdirSync(dir)){if(!f.endsWith('.png'))continue;const img=readPng(path.join(dir,f)),e=new Float32Array(256*256);for(let i=0;i<65536;i++)e[i]=img.data[i*4]*256+img.data[i*4+1]+img.data[i*4+2]/256-32768;m.set(f.replace('.png',''),e);}return m;}
function sampler(tiles,z){const n=2**z;return(lon,lat)=>{const px=(lon+180)/360*n*256,r=lat*Math.PI/180,py=(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n*256;
 const at=(gx,gy)=>{const t=tiles.get(Math.floor(gx/256)+'_'+Math.floor(gy/256));return t?t[(gy&255)*256+(gx&255)]:NaN;};
 const x0=Math.floor(px-0.5),y0=Math.floor(py-0.5),u=px-0.5-x0,v=py-0.5-y0,a=at(x0,y0),b=at(x0+1,y0),c=at(x0,y0+1),d=at(x0+1,y0+1);
 if([a,b,c,d].some(Number.isNaN)){const g=[a,b,c,d].filter(q=>!Number.isNaN(q));if(!g.length)throw new Error('no elevation tile for '+lon+','+lat);return g[0];}
 return(a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;};}
const lonOf=gx=>F.LON0+gx/F.W*(F.LON1-F.LON0),latOf=gy=>F.LAT1-gy/F.H*(F.LAT1-F.LAT0);
// main grid, at every elevStep-th tile: each value is predicted from its left, upper and upper-left neighbours and only the
// small residual is stored (low bytes, then high bytes), which compresses far better than raw heights
{const step=F.elevStep||1,ew=Math.ceil(F.W/step),eh=Math.ceil(F.H/step),s=sampler(loadTiles(path.join(raw,'elev12')),12),n=ew*eh,q=new Int16Array(n),lo=Buffer.alloc(n),hi=Buffer.alloc(n);let min=1e9,max=-1e9;
 const k=step*2,offs=[];for(let a=0;a<k;a++)for(let b=0;b<k;b++)offs.push([(a+.5)/k*step,(b+.5)/k*step]);
 for(let y=0;y<eh;y++)for(let x=0;x<ew;x++){let e=0;for(const [ox,oy] of offs)e+=s(lonOf(x*step+ox),latOf(y*step+oy));e=Math.round(e/offs.length);min=Math.min(min,e);max=Math.max(max,e);q[y*ew+x]=e;}
 for(let y=0;y<eh;y++)for(let x=0;x<ew;x++){const i=y*ew+x,l=x?q[i-1]:0,u=y?q[i-ew]:0,ul=(x&&y)?q[i-ew-1]:0,r=(q[i]-(l+u-ul))&0xffff;lo[i]=r&255;hi[i]=r>>8;}
 fs.writeFileSync(path.join(data,'elev.bin'),Buffer.concat([lo,hi]));fs.writeFileSync(path.join(data,'elev.json'),JSON.stringify({w:ew,h:eh,step}));console.log('elev',ew+'x'+eh,'step',step,'min',min,'max',max);}
// town detail
{const d=F.detail,s=sampler(loadTiles(path.join(raw,'elev14')),14),n=d.size*d.factor,out=Buffer.alloc(n*n);let min=1e9,max=-1e9;
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const e=s(lonOf(d.x+(i+.5)/d.factor),latOf(d.y+(j+.5)/d.factor));min=Math.min(min,e);max=Math.max(max,e);out[j*n+i]=Math.max(0,Math.min(255,Math.round((e-1100)/3.5)));}
 fs.writeFileSync(path.join(data,'detail.bin'),out);console.log('detail',n+'x'+n,'min',Math.round(min),'max',Math.round(max));}
// land cover: nearest class colour per pixel, majority per tile
{const img=readPng(path.join(raw,'landcover.png')),sx=img.w/F.W,sy=img.h/F.H;
 const CL=[[1,0x1A,0x5B,0xAB],[2,0x35,0x82,0x21],[3,0x87,0xD1,0x9E],[4,0xFF,0xDB,0x5C],[5,0xED,0x02,0x2A],[6,0xED,0xE9,0xE4],[7,0xF2,0xFA,0xFF],[8,0xC8,0xC8,0xC8],[9,0xC6,0xAD,0x8D],[9,0xEF,0xCF,0xA8]];
 const cls=i=>{if(img.data[i*4+3]<128)return 0;const r=img.data[i*4],g=img.data[i*4+1],b=img.data[i*4+2];let best=0,bd=1e9;for(const c of CL){const dd=(r-c[1])**2+(g-c[2])**2+(b-c[3])**2;if(dd<bd){bd=dd;best=c[0];}}return best;};
 const out=Buffer.alloc(F.W*F.H),count=new Array(10).fill(0);
 for(let y=0;y<F.H;y++)for(let x=0;x<F.W;x++){const votes=new Array(10).fill(0);for(let py=Math.floor(y*sy);py<Math.floor((y+1)*sy);py++)for(let px=Math.floor(x*sx);px<Math.floor((x+1)*sx);px++)votes[cls(py*img.w+px)]++;let b=0;for(let k=1;k<10;k++)if(votes[k]>votes[b])b=k;out[y*F.W+x]=b;count[b]++;}
 fs.writeFileSync(path.join(data,'lc.bin'),out);console.log('landcover tiles by class',JSON.stringify(count));}
for(const f of fs.readdirSync(path.join(raw,'fonts')))fs.copyFileSync(path.join(raw,'fonts',f),path.join(data,'fonts',f));
console.log('grids and fonts written to',data);

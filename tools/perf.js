// Drives the built map through real actions in headless Edge (zoom, pan, click to walk, month and hour changes) and
// reports, for each, the slowest frames, how many took over 8 and 16 ms, the time spent in input handlers, and the
// functions that used the most time. Use it after any change that could make the page stutter.
// Usage: node --experimental-websocket perf.js <index.html> [hash] [width] [height]
// The clock is set to 8:02 and left running, so the sun moves and the light is worked out again during the run.
// Times are for Edge without a graphics card (software drawing): compare runs with each other, not with a real screen.
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const html=path.resolve(process.argv[2]),hash=process.argv[3]||'#lang=vi',width=+process.argv[4]||1600,height=+process.argv[5]||900;
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p=>fs.existsSync(p));
const port=9300+Math.floor(Math.random()*500),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const gpu=process.env.SAPA_GPU?[]:['--disable-gpu'];
const pr=spawn(edge,['--headless=new',...gpu,'--hide-scrollbars','--no-first-run','--user-data-dir='+path.join(os.tmpdir(),'sapa-check-profile'),'--remote-debugging-port='+port,'--window-size='+width+','+height,'about:blank'],{stdio:'ignore'});
const INJECT=`window.__pf={frames:[],handlers:[]};{const r0=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>r0(ts=>{const t=performance.now();cb(ts);window.__pf.frames.push(performance.now()-t);});
const a0=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(type,fn,o){if(typeof fn!=='function')return a0.call(this,type,fn,o);return a0.call(this,type,function(e){const t=performance.now();const r=fn.call(this,e);const d=performance.now()-t;if(d>0.3)window.__pf.handlers.push([type,d]);return r;},o);};}`;
(async()=>{let ws;try{
 let targets;for(let i=0;i<60&&!targets;i++){await sleep(250);try{targets=await (await fetch('http://127.0.0.1:'+port+'/json')).json();}catch(e){}}
 const page=targets.find(t=>t.type==='page');ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=()=>rej(new Error('socket'));});
 let id=0;const wait=new Map(),errors=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&wait.has(m.id)){wait.get(m.id)(m.result||m);wait.delete(m.id);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text);};
 const send=(method,params)=>new Promise(res=>{const i=++id;wait.set(i,res);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
 const ev=async expr=>{const r=await Promise.race([send('Runtime.evaluate',{expression:expr,returnByValue:true}),sleep(12000).then(()=>{throw new Error('page not answering: '+expr.slice(0,60));})]);return r.result?r.result.value:undefined;};
 await send('Runtime.enable');await send('Page.enable');await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:150});
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:width<700?2:1,mobile:width<700});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:INJECT});
 await send('Page.navigate',{url:'file:///'+html.replace(/\\/g,'/').replace(/ /g,'%20')+hash});
 let ready=false;for(let i=0;i<120&&!ready;i++){await sleep(250);ready=await ev('!!globalThis.__T');}
 await sleep(2000);await ev('globalThis.__T.setClock(+(process_h),2,9);0'.replace('process_h',process.env.SAPA_H||'8.02'));await sleep(1000);
 const box=JSON.parse(await ev('JSON.stringify(document.getElementById("map").getBoundingClientRect())'));
 const cx=box.x+box.width/2,cy=box.y+box.height/2;
 const mouse=(type,x,y,extra)=>send('Input.dispatchMouseEvent',Object.assign({type,x,y,button:type==='mouseMoved'&&!(extra&&extra.buttons)?'none':'left',buttons:type==='mouseReleased'?0:(extra&&extra.buttons)||0,clickCount:1,pointerType:'mouse'},extra||{}));
 const click=async(x,y)=>{await mouse('mouseMoved',x,y);await mouse('mousePressed',x,y,{buttons:1});await mouse('mouseReleased',x,y);};
 const wheel=(dy,x,y)=>send('Input.dispatchMouseEvent',{type:'mouseWheel',x:x||cx,y:y||cy,deltaX:0,deltaY:dy});
 const drag=async(dx,dy,steps)=>{await mouse('mouseMoved',cx,cy);await mouse('mousePressed',cx,cy,{buttons:1});for(let i=1;i<=steps;i++){await mouse('mouseMoved',cx+dx*i/steps,cy+dy*i/steps,{buttons:1});await sleep(16);}await mouse('mouseReleased',cx+dx,cy+dy);};
 const setInput=(idn,v)=>ev(`(()=>{const e=document.getElementById(${JSON.stringify(idn)});e.value=${JSON.stringify(String(v))};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const run=async(name,fn,settle)=>{
  await ev('window.__pf.frames.length=0;window.__pf.handlers.length=0;0');await send('Profiler.start');
  await fn();await sleep(settle||1500);
  const pf=(await send('Profiler.stop')).profile,self=new Map(),dt=pf.timeDeltas,byId=new Map(pf.nodes.map(n=>[n.id,n]));
  pf.samples.forEach((sid,i)=>{const n=byId.get(sid),k=n.callFrame.functionName||'(anon:'+n.callFrame.lineNumber+')';if(k==='(idle)'||k==='(program)')return;self.set(k,(self.get(k)||0)+dt[i]/1000);});
  const r=JSON.parse(await ev('JSON.stringify(window.__pf)')),fr=r.frames.slice().sort((a,b)=>b-a),hm=new Map();
  for(const [t,d] of r.handlers){const o=hm.get(t)||{n:0,max:0,sum:0};o.n++;o.max=Math.max(o.max,d);o.sum+=d;hm.set(t,o);}
  const f1=x=>Math.round(x*10)/10;
  console.log('== '+name+' | frames '+fr.length+' worst '+fr.slice(0,5).map(f1).join(' ')+' | over 8ms '+fr.filter(x=>x>8).length+' over 16ms '+fr.filter(x=>x>16).length+' | median '+f1(fr[fr.length>>1]||0));
  if(hm.size)console.log('   handlers: '+[...hm].map(([t,o])=>t+' n'+o.n+' max '+f1(o.max)+' sum '+f1(o.sum)).join(' | '));
  console.log('   top: '+[...self].sort((a,b)=>b[1]-a[1]).slice(0,9).map(e=>e[0]+' '+f1(e[1])).join(' | '));
 };
 await run('idle 3s (clock running)',async()=>{},3000);
 await run('wheel zoom in x6',async()=>{for(let i=0;i<6;i++){await wheel(-120);await sleep(120);}});
 await run('drag pan',async()=>{await drag(-400,-200,30);});
 await run('click to walk (near)',async()=>{await click(cx+150,cy+60);},2500);
 await run('wheel zoom in x6 more (close-up)',async()=>{for(let i=0;i<6;i++){await wheel(-120);await sleep(120);}},2000);
 await run('drag pan close-up',async()=>{await drag(-500,-250,30);},2000);
 await run('click to walk close-up',async()=>{await click(cx+200,cy+100);},2500);
 await run('wheel zoom out x14',async()=>{for(let i=0;i<14;i++){await wheel(120);await sleep(100);}},2000);
 await run('click to walk far',async()=>{await click(cx+500,cy+250);},2500);
 await run('month change',async()=>{await setInput('month',3);},2000);
 await run('hour change x5',async()=>{for(let i=0;i<5;i++){await setInput('hour',8+i*2.5);await sleep(200);}},1500);
 await run('select place from list',async()=>{await ev(`(()=>{const b=document.querySelector('#list button, #list li, #list [data-id]');if(b)b.click();return !!b;})()`);},2500);
 await run('tab switch',async()=>{await ev(`document.getElementById('tab-settings').click()`);await sleep(300);await ev(`document.getElementById('tab-about').click()`);},1000);
 console.log('page errors',errors.length?[...new Set(errors.map(e=>String(e).split('\n')[0]))].join(' / '):'none');
}catch(e){console.log('FAILED',e.stack);}finally{try{ws&&ws.close();}catch(e){}pr.kill();}})();

// Opens the built map in headless Edge in real time (no virtual clock) and checks that the land is built by the
// background worker, which shot.ps1 cannot test because it forces the main thread.
// Usage: node --experimental-websocket check-worker.js <index.html> [out.png] [width] [height]
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const html=path.resolve(process.argv[2]),out=process.argv[3],width=+process.argv[4]||1900,height=+process.argv[5]||1000;
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find(p=>fs.existsSync(p));
if(!edge){console.log('No Edge or Chrome found');process.exit(1);}
const port=9300+Math.floor(Math.random()*500),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pr=spawn(edge,['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--user-data-dir='+path.join(os.tmpdir(),'sapa-check-profile'),'--remote-debugging-port='+port,'--window-size='+width+','+height,'about:blank'],{stdio:'ignore'});
(async()=>{
 let ws;
 try{
  let targets;for(let i=0;i<60&&!targets;i++){await sleep(250);try{targets=await (await fetch('http://127.0.0.1:'+port+'/json')).json();}catch(e){}}
  const page=targets&&targets.find(t=>t.type==='page');if(!page)throw new Error('browser did not start');
  ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=()=>rej(new Error('socket'));});
  let id=0;const wait=new Map(),errors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&wait.has(m.id)){wait.get(m.id)(m.result||m);wait.delete(m.id);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text);};
  const send=(method,params)=>new Promise(res=>{const i=++id;wait.set(i,res);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
  const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true});return r.result?r.result.value:undefined;};
  await send('Runtime.enable');await send('Page.enable');
  // a browser window cannot be narrower than about 500 px, so phone sizes are emulated
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:width<700?2:1,mobile:width<700});
  // count workers started and the answers they send back: the terrain worker answers once with ok; the light worker,
  // started when the sun first moves, answers with a key each time (counted as light)
  await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.__wk={made:0,ok:0,fail:0};{const W0=window.Worker;window.Worker=function(u,o){const w=new W0(u,o);window.__wk.made++;w.addEventListener("message",e=>{const d=e.data;if(d&&d.ok)window.__wk.ok++;else if(d&&d.key!==undefined)window.__wk.light=(window.__wk.light||0)+1;else window.__wk.fail++;});w.addEventListener("error",()=>{window.__wk.fail++;});return w;};}'});
  const t0=Date.now();await send('Page.navigate',{url:'file:///'+html.replace(/\\/g,'/').replace(/ /g,'%20')+(process.argv[6]||'')});
  let ready=false;for(let i=0;i<120&&!ready;i++){await sleep(250);ready=await ev('!!globalThis.__T');}
  const ms=Date.now()-t0,wk=await ev('JSON.stringify(window.__wk)'),size=await ev('innerWidth+"x"+innerHeight+" scrollWidth "+document.documentElement.scrollWidth');
  await sleep(2500); // let the first chunks paint
  if(out){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out,Buffer.from(shot.data,'base64'));}
  console.log('ready',ready,'after',ms,'ms | workers',wk,'| window',size,'| page errors',errors.length?errors.length+' in all, distinct: '+[...new Set(errors.map(e=>String(e).split('\n').slice(0,2).join(' ').replace(/file:\/\/\S*\//g,'')))].join(' / '):'none'); // an error in the frame loop repeats every frame: say each one once
  const w=JSON.parse(wk||'{}');process.exitCode=ready&&w.made>=1&&w.ok===1&&!w.fail&&!errors.length?0:1;
 }catch(e){console.log('FAILED',e.message);process.exitCode=1;}
 finally{try{ws&&ws.close();}catch(e){}pr.kill();}
})();

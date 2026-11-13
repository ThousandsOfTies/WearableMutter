const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const els=new Map();const el=id=>{if(!els.has(id))els.set(id,{value:'',textContent:'',hidden:false,disabled:false,checked:true,addEventListener(){},click(){}});return els.get(id);};let mode='local';let track;let resumeGate,closeGate,micCalls=0,clockOffset=0;const RealDate=Date;class TestDate extends RealDate{static now(){return RealDate.now()+clockOffset;}}
class AC{constructor(){this.sampleRate=16000;this.currentTime=0;this.state='running';this.destination={};}async resume(){if(resumeGate)await resumeGate;this.state='running';}async close(){this.state='closed';if(closeGate)await closeGate;}createMediaStreamSource(){return {connect(){},disconnect(){}};}createScriptProcessor(){return {connect(){},disconnect(){}};}createGain(){return {gain:{value:0},connect(){},disconnect(){}};}createBuffer(c,n,r){return {duration:n/r,getChannelData:()=>new Float32Array(n)};}createBufferSource(){return {connect(){},start(){},stop(){}};}}
class WS{constructor(){this.readyState=0;this.bufferedAmount=0;this.messages=[];WS.current=this;}send(s){this.messages.push(JSON.parse(s));}close(){this.readyState=3;}}
const ctx={initKeySync(){},console,Date:TestDate,Math,JSON,Number,String,Uint8Array,Float32Array,ArrayBuffer,DataView,Set,Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),setTimeout:()=>1,setInterval:()=>1,clearTimeout(){},clearInterval(){},isSecureContext:true,matchMedia:()=>({matches:false}),AudioContext:AC,WebSocket:WS,localStorage:{getItem(){return null;},setItem(){}},navigator:{userAgent:'test',mediaDevices:{async getUserMedia(){micCalls++;track={readyState:'live',addEventListener(){},stop(){this.readyState='ended';}};return {getAudioTracks:()=>[track],getTracks:()=>[track]};}}},document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>({value:mode}),addEventListener(){},createElement:()=>({click(){}})},window:{AudioContext:AC,addEventListener(){}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/audio-test.js','utf8').replace(/^import[^\n]+\n/, ''),ctx);const evaluate=s=>vm.runInContext(s,ctx);
(async()=>{
 await evaluate('start()');assert.match(el('state').textContent,/録音中/);
 evaluate('run.processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(2048).fill(.1)}})');
 await evaluate('stop()');assert.equal(track.readyState,'ended');assert.equal(el('recording').hidden,false);assert.match(el('recordNote').textContent,/0.1秒/);
 mode='live';el('key').value='';await evaluate('start()');assert.match(el('state').textContent,/APIキー/);
 el('key').value='test-key';el('model').value='gemini-3.8-live';await evaluate('start()');const ws=WS.current;ws.readyState=1;ws.onopen();assert.equal(ws.messages[0].setup.model,'models/gemini-3.8-live');await ws.onmessage({data:JSON.stringify({setupComplete:{}})});
 evaluate('run.processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(2048).fill(.1)}})');assert.equal(ws.messages[1].realtimeInput.audio.mimeType,'audio/pcm;rate=16000');
 await ws.onmessage({data:JSON.stringify({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:Buffer.alloc(480).toString('base64')}}]},inputTranscription:{text:'テスト'}}})});assert.equal(evaluate('run.received'),1);await evaluate('stop()');assert.equal(ws.readyState,3);assert.equal(track.readyState,'ended');assert.ok(!el('logs').textContent.includes('test-key'));
 // Stop during resume must not request the microphone afterward.
 mode='local';let releaseResume;resumeGate=new Promise(resolve=>releaseResume=resolve);
 const before=micCalls,pendingStart=evaluate('start()');await evaluate('stop()');releaseResume();await pendingStart;resumeGate=null;assert.equal(micCalls,before);
 // A delayed old close must not overwrite a new recording's controls.
 await evaluate('start()');let releaseClose;closeGate=new Promise(resolve=>releaseClose=resolve);
 const pendingStop=evaluate('stop()');await evaluate('start()');releaseClose();await pendingStop;closeGate=null;
 assert.equal(el('start').disabled,true);assert.equal(el('stop').disabled,false);assert.match(el('state').textContent,/録音中/);
 // The first overdue frame must stop even when timeout callbacks were suspended.
 clockOffset=181000;evaluate('run.processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(2048).fill(.1)}})');
 await new Promise(setImmediate);assert.equal(evaluate('run'),null);assert.equal(track.readyState,'ended');assert.match(el('state').textContent,/3分/);clockOffset=0;
 // Late server audio must not start playback after the deadline either.
 mode='live';await evaluate('start()');const late=WS.current;late.readyState=1;late.onopen();
 const retired=evaluate('run');clockOffset=181000;
 await late.onmessage({data:JSON.stringify({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:Buffer.alloc(480).toString('base64')}}]}}})});
 await new Promise(setImmediate);assert.equal(retired.received,0);assert.equal(late.readyState,3);assert.equal(track.readyState,'ended');clockOffset=0;
 console.log('PASS: cancellation during resume, overlapping stop/start, overdue audio cutoff');
 console.log('PASS: local capture/playback creation, stop cleanup, missing key, Live setup/PCM send/receive, key redaction');
})().catch(e=>{console.error(e);process.exitCode=1;});

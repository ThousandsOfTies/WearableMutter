import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {SpeechPolicy} from '../dist/speech-policy.js';
function setup(){let track,resumeGate;const states=[],tools=[],transcripts=[];
 class Audio{constructor(){this.sampleRate=48000;this.currentTime=0;this.destination={};}async resume(){await resumeGate;}async close(){}createMediaStreamSource(){return {connect(){},disconnect(){}};}createScriptProcessor(){return {connect(){},disconnect(){}};}createGain(){return {gain:{},connect(){},disconnect(){}};}createBuffer(c,n,r){return {duration:n/r,getChannelData:()=>new Float32Array(n)};}createBufferSource(){return {connect(){},start(){},stop(){}};}}
 class Socket{constructor(){this.readyState=0;this.bufferedAmount=0;this.messages=[];Socket.last=this;}send(s){this.messages.push(JSON.parse(s));}close(){this.readyState=3;}}
 const c=vm.createContext({SpeechPolicy,console,Date,Math,Set,Uint8Array,DataView,Float32Array,JSON,Number,String,Error,Promise,AudioContext:Audio,isSecureContext:true,navigator:{audioSession:{},mediaDevices:{async getUserMedia(){track={stop(){this.stopped=true;},addEventListener(){}};return {getTracks:()=>[track],getAudioTracks:()=>[track]};}}},window:{AudioContext:Audio},WebSocket:Socket,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),states,tools,transcripts});
 vm.runInContext(fs.readFileSync('dist/live.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
 vm.runInContext("var session=new LiveConversation({onState:s=>states.push(s),onTranscript:(role,text)=>transcripts.push({role,text}),onTool:(name,args)=>{tools.push({name,args});return {saved:true,id:'record-one'};}})",c);
 return {c,session:vm.runInContext('session',c),get socket(){return Socket.last;},get track(){return track;},states,tools,transcripts,set resumeGate(v){resumeGate=v;}};
}
test('Live setup, 48kHz -> 16kHz audio, learning tool response, interruption and expiry',async()=>{
 const h=setup();await h.session.start({key:'fake-key',model:'gemini-3.8-live',context:'[{"title":"既習"}]',mode:'practice',minutes:5});const ws=h.socket;ws.readyState=1;ws.onopen();
 assert.match(ws.messages[0].setup.systemInstruction.parts[0].text,/既習/);assert.equal(ws.messages[0].setup.tools[0].functionDeclarations.length,3);
 // Audio must wait for setupComplete.
 const input={inputBuffer:{getChannelData:()=>new Float32Array(2048).fill(.1)}};h.session.processor.onaudioprocess(input);assert.equal(ws.messages.length,1);
 await h.session.message({setupComplete:{}});h.session.processor.onaudioprocess(input);assert.equal(ws.messages[1].realtimeInput.audio.mimeType,'audio/pcm;rate=16000');assert.equal(Buffer.from(ws.messages[1].realtimeInput.audio.data,'base64').length,Math.floor(2048/3)*2);
 h.session.policy.lastVoice=Date.now()-2000;
 await h.session.message({toolCall:{functionCalls:[{id:'permit',name:'request_speech',args:{intent:'direct'}}]}});
 await h.session.message({toolCall:{functionCalls:[{id:'call',name:'remember_learning',args:{kind:'expression',title:'挨拶'}}]}});assert.equal(h.tools.length,0);assert.equal(ws.messages.at(-1).toolResponse.functionResponses[0].response.staged,true);
 await h.session.message({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:Buffer.alloc(480).toString('base64')}}]},outputTranscription:{text:'Good morning'}}});assert.equal(h.session.sources.size,1);
 await h.session.message({serverContent:{turnComplete:true}});assert.equal(h.tools.length,1);
 await h.session.message({serverContent:{interrupted:true}});assert.equal(h.session.sources.size,0);
 h.session.deadline=Date.now()-1;h.session.processor.onaudioprocess(input);await new Promise(setImmediate);assert.equal(h.track.stopped,true);assert.equal(ws.readyState,3);assert.equal(h.session.active,false);assert.equal(h.session.key,'');
});
test('stopping during audio resume prevents microphone access and later connection',async()=>{
 const h=setup();let resume;h.resumeGate=new Promise(resolve=>resume=resolve);const started=h.session.start({key:'fake',model:'gemini-3.8-live',context:'[]',mode:'talk'});await h.session.stop();resume();await started;assert.equal(h.track,undefined);assert.equal(h.socket,undefined);
});
test('cancelled function calls are not recorded and errors do not expose credentials',async()=>{
 const h=setup();await h.session.start({key:'fake-secret',model:'gemini-3.8-live',context:'[]',mode:'talk'});h.socket.readyState=1;
 await h.session.message({toolCallCancellation:{ids:['cancelled']},toolCall:{functionCalls:[{id:'cancelled',name:'remember_learning',args:{}}]}});assert.equal(h.tools.length,0);
 await h.session.message({error:{message:'fake-secret'}});assert.equal(h.states.join('').includes('fake-secret'),false);assert.equal(h.track.stopped,true);
});

const audio=()=>({modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:Buffer.alloc(480).toString('base64')}}]},outputTranscription:{text:'An unsolicited translation'}});
test('ambient audio and memory stay suppressed without permission, but microphone still streams',async()=>{
 const h=setup();await h.session.start({key:'fake',model:'gemini-3.8-live',context:'[]',mode:'ambient'});h.socket.readyState=1;h.socket.onopen();await h.session.message({setupComplete:{}});
 h.session.processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(2048).fill(.1)}});assert.ok(h.socket.messages.at(-1).realtimeInput.audio);
 await h.session.message({toolCall:{functionCalls:[{id:'hidden',name:'remember_learning',args:{kind:'expression',title:'Not heard'}}]}});
 await h.session.message({serverContent:{...audio(),turnComplete:true}});
 assert.equal(h.session.sources.size,0);assert.equal(h.tools.length,0);assert.equal(h.transcripts.filter(x=>x.role==='model').length,0);
 await h.session.stop();
});
test('ambient permit enables one short utterance and the next turn is throttled',async()=>{
 const h=setup();await h.session.start({key:'fake',model:'gemini-3.8-live',context:'[]',mode:'ambient'});h.socket.readyState=1;
 let clock=Date.now()+31000;h.session.policy.now=()=>clock;
 await h.session.message({serverContent:{inputTranscription:{text:'会議で何も決まらなかった'}}});
 await h.session.message({toolCall:{functionCalls:[{id:'yes',name:'request_speech',args:{intent:'ambient',phrase:'Nothing was decided.'}},{id:'memo',name:'remember_learning',args:{kind:'expression',title:'会議',english:'Nothing was decided.'}}]}});
 assert.equal(h.socket.messages.at(-1).toolResponse.functionResponses[0].response.allowed,true);
 await h.session.message({serverContent:{...audio(),turnComplete:true}});assert.equal(h.session.sources.size,1);assert.equal(h.tools.length,1);
 clock+=2000;await h.session.message({serverContent:{inputTranscription:{text:'帰ろう'}}});
 await h.session.message({toolCall:{functionCalls:[{id:'no',name:'request_speech',args:{intent:'ambient',phrase:'Let’s head home.'}}]}});
 assert.equal(h.socket.messages.at(-1).toolResponse.functionResponses[0].response.allowed,false);
 const before=h.transcripts.filter(x=>x.role==='model').length;await h.session.message({serverContent:{...audio(),turnComplete:true}});assert.equal(h.transcripts.filter(x=>x.role==='model').length,before);
 await h.session.stop();
});

test('permission cancellation silences output and a clipped utterance does not become a learned expression',async()=>{
 const h=setup();await h.session.start({key:'fake',model:'gemini-3.8-live',context:'[]',mode:'practice'});h.socket.readyState=1;
 await h.session.message({toolCall:{functionCalls:[{id:'cancel-permit',name:'request_speech',args:{intent:'direct'}}]}});
 await h.session.message({toolCallCancellation:{ids:['cancel-permit']}});await h.session.message({serverContent:audio()});assert.equal(h.session.sources.size,0);
 await h.session.message({toolCall:{functionCalls:[{id:'permit',name:'request_speech',args:{intent:'direct'}},{id:'memo',name:'remember_learning',args:{kind:'expression',title:'long'}}]}});
 h.session.policy.grant.seconds=.001;
 await h.session.message({serverContent:{...audio(),turnComplete:true}});assert.equal(h.tools.length,0);assert.equal(h.session.sources.size,1);
 await h.session.stop();
});

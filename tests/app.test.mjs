import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import * as memory from '../dist/memory.js';
const tick=()=>new Promise(setImmediate);
async function harness({remote=null,failSave=false,cache=null}={}){
 const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{url:'https://wearablemutter.test',runScripts:'outside-only'}),w=dom.window;
 let acct,live;const writes=[];let stored=remote;
 w.structuredClone=structuredClone;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 class Account{
  constructor(onChange){this.onChange=onChange;this.generation=0;this.signedIn=false;this.hasDrive=true;acct=this;}
  async init(){}
  async login(){this.signedIn=true;this.profile={id:'one',email:'one@example.test'};await this.onChange(this.profile);}
  signOut(){this.signedIn=false;this.profile=null;this.generation++;this.onChange(null);}
  async loadSettings(name){if(name===memory.MEMORY_FILE)return stored;return {apiKey:'test-key'};}
  async saveSettings(data,name){if(failSave)throw Error('network');writes.push({data:structuredClone(data),name});if(name===memory.MEMORY_FILE)stored=structuredClone(data);}
 }
 class Live{constructor(callbacks){this.callbacks=callbacks;this.active=false;live=this;}
  async start(options){this.options=options;this.active=true;this.started=Date.now();this.callbacks.onState('聞いています');}
  async stop(){this.active=false;this.callbacks.onState('会話を終えました');this.callbacks.onTurn();}expired(){}async resume(){}
 }
 Object.assign(w,memory,{LiveGoogleAccount:Account,LiveConversation:Live});
 if(cache)w.localStorage.setItem('wm-learning:one',JSON.stringify(cache));
 const source=fs.readFileSync('dist/app.js','utf8').replace(/^import .*;\r?\n/gm,'');w.eval(source);await tick();
 const $=id=>w.document.getElementById(id);
 const click=async id=>{$(id).click();await tick();await tick();};
 await click('login');await tick();
 return {w,dom,$,click,writes,account:acct,get live(){return live;},async save(){await click('save');},close(){w.close();}};
}
test('teach -> local record -> Drive -> next device context; delete and undo',async()=>{
 const h=await harness();try{
 await h.click('start');assert.equal(h.live.active,true);
 h.live.callbacks.onTool('remember_learning',{kind:'expression',title:'朝の挨拶',english:'Good morning',hint:'Good…',result:'introduced'});
 assert.equal(h.$('count').textContent,'1');assert.match(h.$('memory-list').textContent,/Good morning/);
 await h.save();const snapshot=h.writes.find(x=>x.name===memory.MEMORY_FILE).data;assert.equal(snapshot.memories.length,1);
 const cached=JSON.parse(h.w.localStorage.getItem('wm-learning:one'));assert.equal(cached.dirty,false);assert.ok(!JSON.stringify(cached).includes('test-key'));
 const second=await harness({remote:snapshot});try{await second.click('start');assert.match(second.live.options.context,/Good morning/);assert.match(second.live.options.context,/introduced/);}finally{second.close();}
 h.w.document.querySelector('.memory-menu button:last-child').click();await tick();await tick();assert.equal(h.live.active,false);assert.equal(h.$('count').textContent,'0');
 await h.click('undo');assert.equal(h.$('count').textContent,'1');
 }finally{h.close();}
});
test('full reset preserves key; failed save leaves a dirty local copy',async()=>{
 const s=memory.emptyLearning();memory.remember(s,{kind:'preference',title:'短い説明が好き'});
 const h=await harness({remote:s,failSave:true});try{
 await h.click('reset');h.$('confirm-dialog').returnValue='confirm';h.$('confirm-dialog').dispatchEvent(new h.w.Event('close'));await tick();await tick();
 assert.equal(h.$('count').textContent,'0');assert.equal(h.$('key').value,'test-key');
 assert.equal(JSON.parse(h.w.localStorage.getItem('wm-learning:one')).dirty,true);assert.match(h.$('sync-status').textContent,/未保存/);
 }finally{h.close();}
});
test('unsafe memory text is rendered as text, and key-like content is rejected',async()=>{
 const h=await harness();try{await h.click('start');
 h.live.callbacks.onTool('remember_learning',{kind:'expression',title:'<img src=x onerror=alert(1)>',english:'<script>bad()</script>'});
 assert.equal(h.w.document.querySelectorAll('#memory-list img,#memory-list script').length,0);
 assert.throws(()=>h.live.callbacks.onTool('remember_learning',{kind:'preference',title:'test-key'}));
 assert.equal(h.$('count').textContent,'1');
 }finally{h.close();}
});

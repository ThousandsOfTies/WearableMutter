import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LiveGoogleAccount} from '../dist/google-account.js';
import {emptyLearning,remember,MEMORY_FILE,validateLearning} from '../dist/memory.js';
test('Drive creates, loads and overwrites learning separately from API key settings',async()=>{
 const a=new LiveGoogleAccount(()=>{},()=>{});Object.assign(a,{profile:{id:'one'},token:'fake',expiresAt:Date.now()+60000,hasDrive:true});
 const state=emptyLearning();remember(state,{kind:'expression',title:'会議',english:'Nothing was decided.',result:'introduced'});
 const calls=[];let exists=false,stored;
 a.request=async(url,options={})=>{calls.push({url,options});
  if(url.includes('spaces='))return {json:async()=>({files:exists?[{id:'learning-file'}]:[]})};
  if(options.method==='POST'){const body=await options.body.text();assert.match(body,/wearablemutter-learning.json/);assert.match(body,/appDataFolder/);exists=true;stored=structuredClone(state);return {json:async()=>({id:'learning-file'})};}
  if(options.method==='PATCH'){stored=JSON.parse(options.body);return {json:async()=>({})};}
  return {json:async()=>structuredClone(stored)};
 };
 await a.saveSettings(state,MEMORY_FILE,validateLearning);assert.match(decodeURIComponent(calls[0].url),/wearablemutter-learning.json/);assert.ok(!decodeURIComponent(calls[0].url).includes('safari-settings'));
 assert.equal((await a.loadSettings(MEMORY_FILE,validateLearning)).memories[0].english,'Nothing was decided.');
 state.memories=[];await a.saveSettings(state,MEMORY_FILE,validateLearning);assert.deepEqual(stored.memories,[]);
 assert.equal(calls.at(-1).options.method,'PATCH');
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyLearning,remember,validateLearning,restartMemory,searchMemories,memoryContext} from '../dist/memory.js';
test('learning evidence is updated by ID; reset preserves expression but removes practice',()=>{
 const s=emptyLearning(),m=remember(s,{kind:'expression',title:'朝の挨拶',english:'Good morning',hint:'Good…',result:'introduced'});
 remember(s,{id:m.id,kind:'expression',title:m.title,result:'hinted',detail:'Good… で言えた',pronunciation:'morningの強勢'});
 assert.equal(s.memories.length,1);assert.deepEqual(m.evidence.map(e=>e.result),['introduced','hinted']);
 assert.equal(searchMemories(s,'morning')[0].id,m.id);assert.match(memoryContext(s),/hinted/);
 restartMemory(s,m.id);assert.equal(m.english,'Good morning');assert.deepEqual(m.evidence,[]);assert.equal(m.pronunciation,'');
 assert.deepEqual(validateLearning(JSON.parse(JSON.stringify(s))),s);
});
test('malformed tools are rejected without partially changing memory',()=>{
 const s=emptyLearning();assert.throws(()=>remember(s,{kind:'expression',title:'test',result:'mastered'}));assert.equal(s.memories.length,0);
 assert.throws(()=>remember(s,{kind:'expression',title:'test',id:'missing'}));assert.equal(s.memories.length,0);
 assert.throws(()=>validateLearning({app:'other',version:1,memories:[]}));
 const m=remember(s,{kind:'preference',title:'短い説明が好き'});assert.throws(()=>validateLearning({...s,memories:[m,m]}));
});

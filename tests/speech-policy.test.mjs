import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SpeechPolicy} from '../dist/speech-policy.js';
function setup(options={}){let time=100000;const p=new SpeechPolicy({...options,now:()=>time});return {p,advance:ms=>time+=ms};}
const ambient={intent:'ambient',phrase:'Nothing was decided.'};
test('listen initially, require recent speech and a gap; silence does not become a scheduled announcement',()=>{
 const h=setup();h.p.observeText('会議で何も決まらなかった');assert.equal(h.p.request(ambient).allowed,false);
 h.advance(31000);assert.equal(h.p.request(ambient).allowed,false);
 h.p.observeText('そろそろ帰ろう');h.p.observeAudio(.1);assert.equal(h.p.request(ambient).allowed,false);
 h.advance(1600);assert.equal(h.p.request(ambient).allowed,true);
});
test('only played speech consumes the interval; repeated phrases stay suppressed',()=>{
 const h=setup();h.advance(31000);h.p.observeText('会議が終わった');assert.equal(h.p.request(ambient).allowed,true);h.p.finish();
 h.p.observeText('会議が終わった');assert.equal(h.p.request(ambient).allowed,true);h.p.heard();h.p.finish();
 h.advance(60000);h.p.observeText('新しい話');assert.equal(h.p.request({intent:'ambient',phrase:'Let’s head home.'}).allowed,false);
 h.advance(61000);h.p.observeText('会議が終わった');assert.equal(h.p.request(ambient).allowed,false);
 assert.equal(h.p.request({intent:'ambient',phrase:'Let’s head home.'}).allowed,true);
});
test('a quoted explicit question bypasses interval, but a model label alone cannot',()=>{
 const h=setup();h.p.observeText('天気がいいね');assert.equal(h.p.request({intent:'direct',evidence:'天気がいいね'}).allowed,false);
 h.p.observeText('相棒、これ英語でどう言うの');assert.equal(h.p.request({intent:'direct',evidence:'相棒、これ英語でどう言うの'}).allowed,true);
 h.p.heard();h.p.finish();h.p.observeText('別の言い方はある？');assert.equal(h.p.request({intent:'direct',evidence:'別の言い方はある？'}).allowed,true);
});
test('practice is interactive, permits expire, and finish closes the gate',()=>{
 const h=setup({mode:'practice'});assert.equal(h.p.request({intent:'direct'}).allowed,true);h.advance(21000);assert.equal(h.p.canOutput(),false);
 h.p.finish();assert.equal(h.p.canOutput(),false);assert.equal(h.p.request({intent:'direct'}).allowed,true);
});

test('repeating the whispered English can enter a brief practice follow-up',()=>{
 const h=setup();h.advance(31000);h.p.observeText('会議で何も決まらなかった');assert.equal(h.p.request(ambient).allowed,true);h.p.heard();h.p.finish();
 h.advance(2000);h.p.observeText('Nothing was decided');assert.equal(h.p.request({intent:'direct',evidence:'Nothing was decided'}).allowed,true);
});

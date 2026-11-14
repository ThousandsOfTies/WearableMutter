// The model chooses useful moments; the client enforces how often it can speak.
export class SpeechPolicy {
  constructor({mode='ambient',intervalSeconds=120,now=()=>Date.now()}={}) {
    this.mode=mode;this.now=now;this.started=now();
    this.interval=Math.max(60,Math.min(300,Number(intervalSeconds)||120))*1000;
    this.lastSpoken=null;this.lastVoice=null;this.recent=[];this.input='';this.inputAt=0;
    this.followupUntil=0;this.grant=null;
  }
  observeAudio(rms){if(rms>.018)this.lastVoice=this.now();}
  observeText(text){this.input=(this.input+text).slice(-1200);this.inputAt=this.now();}
  request({intent,phrase='',evidence=''}={}) {
    const now=this.now();
    if(this.grant)return {allowed:false,reason:'この応答ではすでに発話を許可しました。追加の発話はせず待ってください。'};
    // A model cannot bypass the interval merely by labelling an ambient remark "direct".
    const direct=intent==='direct'&&now-this.inputAt<20000&&typeof evidence==='string'&&evidence.trim().length>=3&&this.input.includes(evidence)&&
      (/(相棒|英語.{0,15}(どう|何|なん|教え)|どう.{0,8}英語|こういう(?:とき|時).{0,10}(?:どう|何|なん)|どう言(?:う|えば)|何て言|なんて言|発音.{0,10}(教え|練習|どう)|もう一度|もう一回|ゆっくり|答え.{0,5}教え|ヒント|how do (?:you|i) say|say that again)/i.test(evidence)||now<this.followupUntil);
    const interactive=this.mode==='practice'||direct;
    if(!interactive){
      if(intent!=='ambient')return {allowed:false,reason:'直接の質問を確認できません。普段の聞き役に戻ってください。'};
      if(now-this.started<30000)return {allowed:false,reason:'開始後30秒は聞く時間です。次の自然な機会まで黙って待ってください。'};
      if(this.lastSpoken!==null&&now-this.lastSpoken<this.interval)return {allowed:false,reason:'つぶやいたばかりです。次の会話を聞き、まだ発話しないでください。'};
      if(!this.input||now-this.inputAt>20000)return {allowed:false,reason:'直近に聞き取れた発言がありません。古い話題を後から持ち出さず待ってください。'};
      if(this.lastVoice!==null&&now-this.lastVoice<1500)return {allowed:false,reason:'まだ話し声があります。この候補は見送り、次の自然な間まで待ってください。'};
      const normalized=String(phrase).toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
      if(normalized.length<4||String(phrase).length>180)return {allowed:false,reason:'つぶやきは短い英語1文か短いヒントにしてください。'};
      if(this.recent.includes(normalized))return {allowed:false,reason:'同じつぶやきは繰り返さず、今は聞いていてください。'};
      this.grant={kind:'ambient',phrase:normalized,expiresAt:now+15000,seconds:10,heard:false};
    }else this.grant={kind:'direct',expiresAt:now+20000,seconds:60,heard:false};
    return {allowed:true,style:interactive?'質問・練習に短く応答してください。':'英語1文か短いヒントだけ。前置き・説明・質問を足さず、その後は聞き役へ戻ってください。'};
  }
  canOutput(){return !!this.grant&&(this.grant.heard||this.now()<this.grant.expiresAt);}
  heard(){if(!this.grant||this.grant.heard)return;this.grant.heard=true;this.lastSpoken=this.now();this.followupUntil=this.now()+(this.grant.kind==='ambient'?20000:45000);if(this.grant.kind==='ambient'){this.recent.push(this.grant.phrase);this.recent=this.recent.slice(-8);}}
  finish(){this.grant=null;this.input='';}
}

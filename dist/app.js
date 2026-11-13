import {LiveGoogleAccount} from './google-account.js';
import {MEMORY_FILE,emptyLearning,validateLearning,remember,restartMemory,memoryContext,searchMemories,RESULT_LABELS} from './memory.js';
import {LiveConversation} from './live.js';
const $=id=>document.getElementById(id);
const DEFAULT_CLIENT='874050203988-kki46d1he3fj4kmoni3i9ladu84fujn1.apps.googleusercontent.com';
let account,owner=null,learning=emptyLearning(),dirty=false,revision=0,ready=false,mode='talk',live=null,saving=null,saveTimer,elapsedTimer,busy=false,undoTimer,initializing=true;
const bubbles={};let undoAction=null;
function notice(message=''){$('notice').textContent=message;$('notice').hidden=!message;}
function syncStatus(message){$('sync-status').textContent=message;$('sync-talk').textContent=message;}
function cacheKey(){return 'wm-learning:'+owner;}
function persist(){if(!owner)return;try{localStorage.setItem(cacheKey(),JSON.stringify({learning,dirty}));}catch{notice('端末に記録を保存できません。Driveへ保存し、保存完了を確認してください。');}}
function mutated(){revision++;dirty=true;learning.updatedAt=new Date().toISOString();persist();renderMemories();syncStatus('端末に記録しました。Driveへの保存待ちです。');scheduleSave();}
function scheduleSave(){clearTimeout(saveTimer);if(owner&&ready)saveTimer=setTimeout(()=>void saveDrive(),1600);}
function controls(){const signed=account?.signedIn;const active=!!live?.active;
 $('start').disabled=busy||active||initializing;$('start').hidden=active;$('stop').hidden=!active;$('resume').hidden=!active;
 $('login').hidden=!!signed;for(const id of ['switch','logout'])$(id).hidden=!signed;
 for(const id of ['login','switch','logout','apply-client','save','reload'])$(id).disabled=busy||initializing||!!saving||(['save','reload'].includes(id)&&!signed)||(id==='save'&&!ready);
 document.querySelectorAll('[data-mode],#model,#minutes,#key').forEach(el=>el.disabled=active||busy);
 $('connection').textContent=active?'一緒に話しています':ready?'準備できています':signed?'記憶を準備中':'おやすみ中';$('orb').classList.toggle('live',active);
}
function page(name){document.querySelectorAll('.page').forEach(el=>el.hidden=el.id!=='page-'+name);document.querySelectorAll('[data-page]').forEach(el=>{el.classList.toggle('selected',el.dataset.page===name);if(el.dataset.page===name)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});}
document.querySelectorAll('[data-page]').forEach(el=>el.onclick=()=>page(el.dataset.page));
document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{mode=el.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('chosen',b===el));$('talk-help').textContent=mode==='practice'?'「この言い方を練習したい」と話しかけてください。':'「こういうとき何て言うの？」から始めてみてください。';});
function transcript(role,text){if(role==='complete'||role==='interrupted'){for(const k of Object.keys(bubbles))delete bubbles[k];return;}
 if(!bubbles[role]){document.querySelector('#transcript .empty-small')?.remove();const b=document.createElement('div');b.className='bubble '+role;const label=document.createElement('small');label.textContent=role==='user'?'あなた':'相棒';const body=document.createElement('span');b.append(label,body);$('transcript').append(b);bubbles[role]=body;while($('transcript').children.length>80)$('transcript').firstElementChild.remove();}bubbles[role].textContent+=text;$('transcript').scrollTop=$('transcript').scrollHeight;}
async function stopConversation(){if(live)await live.stop();clearInterval(elapsedTimer);controls();}
function tool(name,args){if(!owner||!ready)throw Error('学習記録を準備できていません。');if(name==='search_memory')return {memories:searchMemories(learning,args.query)};if(name!=='remember_learning')throw Error('未対応の操作です。');
 const serialized=JSON.stringify(args);if(($('key').value&&serialized.includes($('key').value))||/AIza[\w-]{15,}/.test(serialized))throw Error('認証情報は記録しません。');
 const memory=remember(learning,args);mutated();return {saved:true,id:memory.id};}
function newLive(){return new LiveConversation({onState:s=>{$('state').textContent=s;controls();if(!live?.active)clearInterval(elapsedTimer);},onTranscript:transcript,onTool:tool,onTurn:()=>{if(dirty)scheduleSave();},onLevel:n=>{$('orb').style.setProperty('--level',n);}});}
$('start').onclick=async()=>{notice();if(!owner||!ready){page('settings');notice('Googleでログインして、記憶を準備してください。');return;}const key=$('key').value.trim(),model=$('model').value.trim();if(!key||!model){page('settings');notice('Gemini APIキーとモデルを入力してください。');return;}
 live=newLive();const pending=live.start({key,model,context:memoryContext(learning),mode,minutes:Number($('minutes').value)});controls();elapsedTimer=setInterval(()=>{if(!live?.active)return;const sec=Math.floor((Date.now()-live.started)/1000);$('elapsed').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')} / ${$('minutes').value}分`;},1000);await pending;controls();};
$('stop').onclick=()=>void stopConversation();$('resume').onclick=()=>{void live?.resume().catch(()=>notice('音声を再開できません。会話を終了して再度開始してください。'));};
document.addEventListener('visibilitychange',()=>{if(live?.active)live.expired();if(document.visibilityState==='visible'&&dirty)scheduleSave();});window.addEventListener('pageshow',()=>{if(live?.active)live.expired();});window.addEventListener('offline',()=>{if(live?.active)void live.stop('通信が切れました。接続を確認して再度開始してください。');});window.addEventListener('online',()=>{if(dirty)scheduleSave();});window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
async function saveDrive(){
 if(saving)return saving;if(!owner||!ready||!account?.signedIn||!account.hasDrive){syncStatus('未保存です。Googleへ再ログインして保存してください。');return false;}
 const active=account,id=owner,version=revision,snapshot=validateLearning(learning),apiKey=$('key').value.trim();
 syncStatus('Driveへ保存しています…');saving=(async()=>{try{await active.saveSettings(snapshot,MEMORY_FILE,validateLearning);if(apiKey)await active.saveSettings({app:'wearablemutter-safari-settings',version:1,apiKey});if(owner!==id||account!==active)return false;if(revision===version){dirty=false;persist();syncStatus('Driveへ保存しました · '+new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}));}else scheduleSave();return true;}catch{if(owner===id){syncStatus('Driveへ未保存です。再ログイン後に「Driveへ保存」で再試行してください。');notice('保存できませんでした。端末の学習記録は残っています。');}return false;}finally{saving=null;controls();}})();controls();return saving;
}
async function restore(force=false){const active=account,id=owner;ready=false;controls();syncStatus('Driveから記憶を読み込んでいます…');try{
 const [remote,settings]=await Promise.all([active.loadSettings(MEMORY_FILE,validateLearning),active.loadSettings()]);if(owner!==id||active!==account)return;
 if(force||!dirty){learning=remote||emptyLearning();dirty=false;revision++;persist();}if(settings)$('key').value=settings.apiKey;
 ready=true;renderMemories();syncStatus(dirty?'この端末に未保存の記録があります。「Driveへ保存」で引き継げます。':'Driveの記憶を読み込みました。');
 }catch{if(owner!==id)return;syncStatus('読み込めませんでした。再ログインして再試行してください。');notice('Driveの読み込みが完了していません。既存の記憶を守るため、会話はまだ開始できません。');}finally{controls();}}
async function changed(profile){const active=account,generation=active.generation,next=profile?.id||null;if(next!==owner){await stopConversation();if(account!==active||generation!==active.generation)return;owner=next;learning=emptyLearning();dirty=false;ready=false;revision++;$('key').value='';$('transcript').replaceChildren();clearTimeout(undoTimer);undoAction=null;$('toast').hidden=true;
 if(owner){try{const cached=JSON.parse(localStorage.getItem(cacheKey())||'null');if(cached){learning=validateLearning(cached.learning);dirty=!!cached.dirty;}}catch{notice('端末の記録を読めませんでした。Driveから読み込みます。');}}}
 $('profile').textContent=profile?`${profile.email||profile.name}`:'未ログイン';renderMemories();controls();if(profile&&account.hasDrive)await restore();else syncStatus(profile?'Driveへのアクセスを許可して再ログインしてください。':'Googleにログインすると、記憶を端末間で引き継げます。');}
async function setup(clientId){initializing=true;ready=false;account=new LiveGoogleAccount(p=>{void changed(p);},()=>notice('Googleに接続できませんでした。再度ログインしてください。'));try{await account.init(clientId);}catch{notice('Googleログインを読み込めませんでした。接続を確認して再試行してください。');}finally{initializing=false;controls();}}
async function action(fn){if(busy)return;busy=true;controls();try{await fn();}catch{notice('処理を完了できませんでした。ログインや通信を確認してください。');}finally{busy=false;controls();}}
$('login').onclick=()=>action(()=>account.login({drive:true}));
async function leaveAccount(){await stopConversation();if(dirty&&ready){const ok=await saveDrive();if(!ok)notice('未保存の学習記録はこの端末に残しました。同じアカウントで再ログインして保存できます。');}}
$('switch').onclick=()=>action(async()=>{await leaveAccount();account.signOut();notice('Googleでログインを押して、切り替え先のアカウントを選んでください。');});$('logout').onclick=()=>action(async()=>{await leaveAccount();account.signOut();});
$('apply-client').onclick=()=>action(async()=>{const value=$('client').value.trim();if(!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(value)){notice('OAuthクライアントIDの形式を確認してください。');return;}await leaveAccount();account.signOut();localStorage.setItem('wm-google-client-id',value);await setup(value);});
$('key').addEventListener('change',()=>{if(owner&&ready)mutated();});
$('save').onclick=()=>action(async()=>{await saveDrive();});
function confirmAction(title,message){$('confirm-title').textContent=title;$('confirm-message').textContent=message;$('confirm-dialog').returnValue='';$('confirm-dialog').showModal();return new Promise(resolve=>$('confirm-dialog').addEventListener('close',()=>resolve($('confirm-dialog').returnValue==='confirm'),{once:true}));}
$('reload').onclick=()=>action(async()=>{if(dirty&&!await confirmAction('Driveから読み直しますか？','この端末の未保存の変更を破棄し、Driveに保存された内容へ戻します。'))return;await stopConversation();clearTimeout(saveTimer);await restore(true);});
function showUndo(message,fn){clearTimeout(undoTimer);undoAction=fn;$('toast-text').textContent=message;$('toast').hidden=false;undoTimer=setTimeout(()=>{$('toast').hidden=true;undoAction=null;},8000);}
$('undo').onclick=()=>action(async()=>{await stopConversation();undoAction?.();undoAction=null;$('toast').hidden=true;clearTimeout(undoTimer);});
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function renderMemories(){const list=$('memory-list');list.replaceChildren();$('count').textContent=learning.memories.length;const query=$('search').value.trim().toLowerCase(),kind=$('filter').value;const items=[...learning.memories].filter(m=>(kind==='all'||kind===m.kind)&&(!query||[m.title,m.english,m.note,m.hint].join(' ').toLowerCase().includes(query))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 if(!items.length){const empty=el('div',undefined,'empty-state');empty.append(el('h2',query?'まだ見つかりませんでした。':'ここから、少しずつ。'),el('p',query?'別の言葉で探してみてください。':'会話で紹介された表現や練習したことが、ここに並びます。'));list.append(empty);return;}
 for(const m of items){const card=el('article',undefined,'memory-card');card.append(el('span',m.kind==='preference'?'ABOUT YOU':'A LITTLE ENGLISH','memory-kind'),el('h2',m.title));if(m.english)card.append(el('div',m.english,'english'));if(m.note)card.append(el('p',m.note));const latest=m.evidence.at(-1);if(latest){card.append(el('p',RESULT_LABELS[latest.result]||'練習の記録'));if(latest.detail)card.append(el('p',latest.detail));}else if(m.kind==='expression')card.append(el('p','これから一緒に練習しましょう。'));if(m.hint){const hint=el('details');hint.append(el('summary','相棒が覚えているヒント'),el('p',m.hint));card.append(hint);}if(m.pronunciation)card.append(el('p','発音の練習：'+m.pronunciation));const date=new Date(m.updatedAt);card.append(el('p','最後に練習：'+(Number.isNaN(date.valueOf())?'記録なし':date.toLocaleDateString('ja-JP')),'date'));
 const menu=el('details',undefined,'memory-menu');menu.append(el('summary','⋯'));menu.firstElementChild.setAttribute('aria-label',m.title+'の操作');const actions=el('div',undefined,'menu-items');if(m.kind==='expression'){const reset=el('button','最初から練習する');reset.onclick=()=>action(async()=>{await stopConversation();const previous=structuredClone(m);restartMemory(learning,m.id);mutated();showUndo('練習の記録をリセットしました',()=>{const i=learning.memories.findIndex(x=>x.id===m.id);if(i>=0)learning.memories[i]=previous;mutated();});});actions.append(reset);}const remove=el('button','この記憶を削除','danger');remove.onclick=()=>action(async()=>{await stopConversation();learning.memories=learning.memories.filter(x=>x.id!==m.id);mutated();showUndo('記憶を削除しました',()=>{learning.memories.push(m);mutated();});});actions.append(remove);menu.append(actions);card.append(menu);list.append(card);}
}
$('search').oninput=renderMemories;$('filter').onchange=renderMemories;
$('reset').onclick=()=>action(async()=>{if(!owner||!ready){notice('先にGoogleでログインし、記憶を読み込んでください。');return;}if(!await confirmAction('学習の記憶をすべて消しますか？','表現・練習結果・好みをすべて削除してDriveへ保存します。元には戻せません。APIキーとログイン設定は残ります。'))return;await stopConversation();learning=emptyLearning();mutated();clearTimeout(undoTimer);undoAction=null;$('toast').hidden=true;await saveDrive();});
let clientId=DEFAULT_CLIENT;try{clientId=localStorage.getItem('wm-google-client-id')||DEFAULT_CLIENT;}catch{}$('client').value=clientId;renderMemories();controls();void setup(clientId);

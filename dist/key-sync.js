import { LiveGoogleAccount } from './google-account.js';

const DEFAULT_CLIENT_ID='874050203988-kki46d1he3fj4kmoni3i9ladu84fujn1.apps.googleusercontent.com';
export function initKeySync({getKey,setKey,beforeAccountChange}) {
 const section=document.createElement('section');
 section.innerHTML=`<h2>APIキーをGoogleアカウントに保存</h2>
 <p>初回はGoogleでログインし、APIキーを入力して「Driveへ保存」。次回はログイン後に自動で読み戻します。</p>
 <p id="google-profile">未ログイン</p><div class="actions"><button id="google-login">Googleでログイン</button><button id="google-switch" hidden>アカウント切替</button><button id="google-out" hidden>ログアウト</button></div>
 <div class="actions" style="margin-top:14px"><button id="google-save" disabled>APIキーをDriveへ保存</button><button id="google-load" disabled>Driveから読込</button></div>
 <p id="google-status" role="status">準備中…</p>
 <p class="note">キーはこのアプリ専用のDrive領域へ保存します（アプリ側の暗号化なし）。既存アプリの設定は変更しません。ログアウトすると入力欄からも消去します。ChatGPTログインとは別です。</p>
 <details><summary>Googleログインの設定・接続エラー</summary><p class="note">WearableMutter専用のOAuthクライアントを設定済みです。テストモードでは登録済みのテストユーザーのみログインできます。403 access_deniedの場合はGoogle Cloud Consoleの「Google Auth Platform → 対象 → テストユーザー」を確認してください。生成元を変更する場合は下記URLを「承認済みのJavaScript生成元」へ登録します。</p>
 <code id="google-origin"></code><p><a href="https://console.cloud.google.com/auth/clients?project=pure-faculty-514606-e1" target="_blank" rel="noopener">Googleのクライアント設定を開く</a></p>
 <label>OAuthクライアントID<input id="google-client" spellcheck="false" autocomplete="off"></label><button id="google-config">クライアントIDを適用</button><p class="note">クライアントIDは公開設定です。APIキーをここへ入力しないでください。</p></details>`;
 document.querySelector('main').insertBefore(section,document.querySelector('main > section:nth-of-type(2)'));
 const $=id=>section.querySelector('#'+id);$('google-origin').textContent=location.origin;
 let clientId=DEFAULT_CLIENT_ID;try{const saved=localStorage.getItem('wm-google-client-id');if(saved&&saved!=='171114049080-c880d878cqorg8ghs5qid5v2vmi1gvuc.apps.googleusercontent.com')clientId=saved;}catch{}
 $('google-client').value=clientId;
 let account,identity=null,busy=false,edit=0,initializing=true;
 document.getElementById('key').addEventListener('input',()=>{edit++;});
 const tell=s=>{$('google-status').textContent=s;};
 function controls(){const signed=account?.signedIn;for(const id of ['google-save','google-load'])$(id).disabled=busy||!signed||!account.hasDrive;for(const id of ['google-login','google-switch','google-out','google-config'])$(id).disabled=busy||initializing;$('google-login').hidden=!!signed;$('google-switch').hidden=!signed;$('google-out').hidden=!signed;}
 async function load(){const active=account,generation=active.generation,revision=edit;const data=await active.loadSettings();if(active!==account||generation!==active.generation||revision!==edit){tell('読込中に設定が変わったため、入力中のキーを残しました。');return;}if(!data){tell('まだ保存されていません。Gemini Liveを選び、APIキーを入力して「Driveへ保存」を押してください。');return;}setKey(data.apiKey);edit++;tell('このGoogleアカウントのAPIキーを復元しました。Gemini Liveを選んで開始できます。');}
 async function changed(profile){if(identity!==(profile?.id||null)){await beforeAccountChange();setKey('');edit++;identity=profile?.id||null;}
 $('google-profile').textContent=profile?`接続中: ${profile.email||profile.name}`:'未ログイン';controls();
 if(profile&&account.hasDrive){try{await load();}catch(e){tell(e.message);}}else if(!profile)tell('Googleでログインすると保存済みのキーを読み戻せます。');else tell('Driveへのアクセスを許可して再接続してください。');}
 async function setup(){initializing=true;controls();account=new LiveGoogleAccount(profile=>{void changed(profile);},tell);try{await account.init(clientId);tell(account.signedIn?'Googleに接続済み':'Googleでログインしてください。');}catch(e){tell(e.message);}finally{initializing=false;controls();}}
 async function action(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){tell(e.message);}finally{busy=false;controls();}}
 $('google-login').onclick=()=>action(async()=>{await beforeAccountChange();setKey('');edit++;tell('Googleの認証画面を確認してください…');await account.login({drive:true});});
 $('google-switch').onclick=()=>action(async()=>{await beforeAccountChange();setKey('');edit++;await account.login({drive:true,selectAccount:true});});
 $('google-out').onclick=()=>action(async()=>{await beforeAccountChange();setKey('');edit++;account.signOut();});
 $('google-save').onclick=()=>action(async()=>{const key=getKey().trim();if(!key)throw Error('先にGemini LiveのAPIキーを入力してください。');await account.saveSettings({app:'wearablemutter-safari-settings',version:1,apiKey:key});tell('APIキーをこのGoogleアカウントのDriveへ保存しました。次回ログイン時に復元します。');});
 $('google-load').onclick=()=>action(load);
 $('google-config').onclick=()=>action(async()=>{const value=$('google-client').value.trim();if(!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(value))throw Error('OAuthクライアントIDの形式を確認してください。');await beforeAccountChange();account?.signOut();clientId=value;try{localStorage.setItem('wm-google-client-id',value);}catch{}await setup();});
 void setup();
}

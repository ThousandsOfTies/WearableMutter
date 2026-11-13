const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={Blob,URLSearchParams,crypto:require('node:crypto').webcrypto,Date,setTimeout,clearTimeout,AbortSignal,sessionStorage:{removeItem(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/google-account.js','utf8').replaceAll('export ',''),context);
const Account=vm.runInContext('LiveGoogleAccount',context);
const make=()=>{const a=new Account(()=>{},()=>{});a.profile={id:'user1'};a.token='fake';a.expiresAt=Date.now()+60000;a.hasDrive=true;return a;};
(async()=>{
 let a=make(),calls=[];a.request=async(url,options={})=>{calls.push({url,options});return {json:async()=>url.includes('spaces=')?{files:[]}:{id:'saved'}};};
 assert.equal(await a.saveSettings({app:'wearablemutter-safari-settings',version:1,apiKey:'example-key'}),'saved');
 assert.match(calls[0].url,/spaces=appDataFolder/);assert.equal(calls[1].options.method,'POST');const body=await calls[1].options.body.text();assert.match(body,/wearablemutter-safari-settings.json/);assert.match(body,/appDataFolder/);
 calls=[];a.request=async(url,options={})=>{calls.push({url,options});return {json:async()=>({files:[{id:'existing'}]})};};await a.saveSettings({app:'wearablemutter-safari-settings',version:1,apiKey:'new-key'});assert.equal(calls[1].options.method,'PATCH');assert.match(calls[1].url,/existing/);
 a=make();a.request=async url=>({json:async()=>url.includes('spaces=')?{files:[{id:'saved'}]}:{app:'wearablemutter-safari-settings',version:1,apiKey:'restored-key'}});assert.equal((await a.loadSettings()).apiKey,'restored-key');
 a=make();a.request=async()=>{a.generation++;return {json:async()=>({files:[{id:'other-account'}]})};};await assert.rejects(a.loadSettings(),/アカウント/);
 a=make();a.request=async url=>({json:async()=>url.includes('spaces=')?{files:[{id:'wrong'}]}:{app:'decontradictor-live-settings',version:1,apiKey:'wrong'}});await assert.rejects(a.loadSettings(),/形式/);
 console.log('PASS: Drive create/update/restore, account-change rejection, separate app namespace');
})().catch(e=>{console.error(e);process.exitCode=1;});

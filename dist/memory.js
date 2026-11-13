export const MEMORY_FILE = 'wearablemutter-learning.json';
export const emptyLearning = () => ({app:'wearablemutter-learning',version:1,updatedAt:null,memories:[]});
const text = (v,n=1500) => typeof v === 'string' ? v.trim().slice(0,n) : '';
export function validateLearning(value) {
  if(value?.app!=='wearablemutter-learning'||value.version!==1||!Array.isArray(value.memories)||value.memories.length>1000) throw Error('学習記録の形式を確認できません。');
  const ids=new Set();
  const memories=value.memories.map(m=>{
    if(!m||typeof m.id!=='string'||ids.has(m.id)||!['expression','preference'].includes(m.kind))throw Error('学習記録の形式を確認できません。');
    ids.add(m.id);
    return {id:text(m.id,100),kind:m.kind,title:text(m.title,200),english:text(m.english,500),note:text(m.note),hint:text(m.hint,500),
      pronunciation:text(m.pronunciation,500),createdAt:text(m.createdAt,50),updatedAt:text(m.updatedAt,50),
      evidence:(Array.isArray(m.evidence)?m.evidence:[]).slice(-30).map(e=>({at:text(e.at,50),result:text(e.result,50),detail:text(e.detail,500)}))};
  });
  return {...emptyLearning(),updatedAt:text(value.updatedAt,50)||null,memories};
}
export function remember(state,args) {
  if(!['expression','preference'].includes(args.kind)||!text(args.title,200))throw Error('記憶の種類と内容が必要です。');
  if(args.result&&!['introduced','repeated','hinted','independent','pronunciation','uncertain'].includes(args.result))throw Error('練習結果の形式が不正です。');
  let m=args.id?state.memories.find(m=>m.id===args.id):null;
  if(args.id&&!m)throw Error('指定された記憶はありません。検索し直してください。');
  const now=new Date().toISOString();
  if(!m){if(state.memories.length>=1000)throw Error('記憶が1000件になりました。記憶画面で整理してください。');m={id:crypto.randomUUID(),kind:args.kind,title:'',english:'',note:'',hint:'',pronunciation:'',createdAt:now,updatedAt:now,evidence:[]};state.memories.push(m);}
  for(const [key,max] of [['title',200],['english',500],['note',1500],['hint',500],['pronunciation',500]])if(typeof args[key]==='string')m[key]=text(args[key],max);
  if(args.result){m.evidence.push({at:now,result:args.result,detail:text(args.detail,500)});m.evidence=m.evidence.slice(-30);}
  m.updatedAt=now;state.updatedAt=now;return m;
}
export function restartMemory(state,id){const m=state.memories.find(m=>m.id===id);if(!m)return;m.evidence=[];m.pronunciation='';m.updatedAt=state.updatedAt=new Date().toISOString();}
export function memoryContext(state){return JSON.stringify([...state.memories].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,60));}
export function searchMemories(state,query){const terms=text(query,200).toLowerCase().split(/\s+/).filter(Boolean);return state.memories.filter(m=>terms.some(t=>JSON.stringify(m).toLowerCase().includes(t))).slice(0,30);}
export const RESULT_LABELS={introduced:'表現を紹介しました',repeated:'お手本のあとに言えました',hinted:'ヒントで思い出せました',independent:'自分で使えました',pronunciation:'発音を練習しました',uncertain:'聞き取りが不確かでした'};

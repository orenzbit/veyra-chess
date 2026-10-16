// Veyra puzzle repo — TS port (src/puzzle-repo.ts).
import type { Motif } from './tactics.js';

export const STORE_KEY = 'veyra_puzzles_v1';
export const MAX_PUZZLES = 1000;
const STEPS = [1,3,7,14,30];

export interface PuzzleStats { shown:number; solved:number; fails:number; nextDue:string; streak:number }
export interface PuzzleRecord {
  id:string; fen:string; solution:string[]; played:string;
  source:{gameId:string;ply:number;date:string;opponent:string;kind:string};
  motif:Motif; severity:number; class:'mistake'|'blunder'; rating:number;
  stats:PuzzleStats; createdAt:string; note?:string;
}
export interface PuzzleStore { version:1; puzzles:Record<string,PuzzleRecord>; order:string[] }

const mem:Record<string,string>={};

function storageGet(key:string):string|null {
  try{
    const value=localStorage.getItem(key);
    if(value!==null) return value;
  }catch(error){
    console.warn('Unable to read puzzle store from localStorage; using fallback storage.',error);
  }
  return Object.prototype.hasOwnProperty.call(mem,key)?mem[key]:null;
}

function storageSet(key:string,value:string):void {
  try{
    localStorage.setItem(key,value);
    return;
  }catch(error){
    console.warn('Unable to write puzzle store to localStorage; using fallback storage.',error);
  }
  mem[key]=value;
}

export function hashPuzzleId(fen:string, solution:string[]):string {
  let a=0x811c9dc5,b=0x811c9dc5;
  const s1=fen+'|'+solution.join(' '), s2=solution.join(' ')+'|'+fen;
  for(let i=0;i<s1.length;i++){a^=s1.charCodeAt(i);a=Math.imul(a,0x01000193)>>>0;}
  for(let i=0;i<s2.length;i++){b^=s2.charCodeAt(i);b=Math.imul(b,0x01000193)>>>0;}
  return a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0');
}
export function freshStats():PuzzleStats {
  return { shown:0,solved:0,fails:0,nextDue:new Date().toISOString(),streak:0 };
}
export function emptyStore():PuzzleStore { return { version:1,puzzles:{},order:[] }; }
export function loadStore():PuzzleStore {
  try{
    const raw=storageGet(STORE_KEY);
    if(!raw) return emptyStore();
    const s=JSON.parse(raw);
    if(!s||s.version!==1||!s.puzzles||typeof s.puzzles!=='object'||Array.isArray(s.puzzles)){
      console.warn('Invalid puzzle store; using an empty store.');
      return emptyStore();
    }
    if(!Array.isArray(s.order)) s.order=Object.keys(s.puzzles);
    return s;
  }catch(error){ console.warn('Unable to load puzzle store; using an empty store.',error); return emptyStore(); }
}
export function saveStore(s:PuzzleStore):void {
  try{ storageSet(STORE_KEY,JSON.stringify(s)); }
  catch(error){ console.warn('Unable to serialize puzzle store.',error); }
}
export function addPuzzle(store:PuzzleStore, rec:PuzzleRecord):'added'|'duplicate'|'evicted' {
  const id=rec.id||hashPuzzleId(rec.fen,rec.solution);
  if(store.puzzles[id]) return 'duplicate';
  store.puzzles[id]={...rec,id};
  store.order.push(id);
  if(store.order.length>MAX_PUZZLES){
    let worst=store.order[0];
    for(const k of store.order){
      if((store.puzzles[k].stats?.nextDue||'')<(store.puzzles[worst].stats?.nextDue||'')) worst=k;
    }
    delete store.puzzles[worst];
    store.order=store.order.filter(k=>k!==worst);
    saveStore(store);
    return 'evicted';
  }
  saveStore(store);
  return 'added';
}
export function getDuePuzzles(store:PuzzleStore, elo:number, limit=20):PuzzleRecord[] {
  const now=new Date().toISOString();
  return store.order.map(id=>store.puzzles[id])
    .filter(p=>p&&(p.stats?.nextDue||'')<=now)
    .sort((a,b)=>Math.abs(a.rating-elo)-Math.abs(b.rating-elo)).slice(0,limit);
}
export function recordAttempt(store:PuzzleStore, id:string, solved:boolean):void {
  const rec=store.puzzles[id];
  if(!rec) return;
  const st=rec.stats||(rec.stats=freshStats());
  st.shown++;
  if(solved){st.solved++;st.streak++;}else{st.fails++;st.streak=0;}
  const days=STEPS[Math.min(st.streak,STEPS.length-1)];
  st.nextDue=new Date(Date.now()+days*864e5).toISOString();
  saveStore(store);
}

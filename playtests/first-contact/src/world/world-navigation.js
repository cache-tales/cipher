/**
 * Standalone First Contact world-navigation POC v0.1.
 * Pure transition rules with optional injected browser-like storage; no accounts/network.
 * Existing First Contact invitation and Cipher legacy keys are never read or changed.
 */
import {AREAS, AREA_IDS, areaFor} from './areas.js';
export const WORLD_SAVE_KEY = 'ct:adventure:first-contact:world-poc:v1';
export const WORLD_SCHEMA_VERSION = 1;
const FLAGS = ['mailboxOpened','envelopeTaken','letterRead','shedDoorOpened'];
const clone = value => structuredClone(value);
const initial = () => ({
  schemaVersion: WORLD_SCHEMA_VERSION,
  adventureId: 'first-contact-world-poc',
  currentArea: 'mailbox',
  knownAreas: ['mailbox'],
  visitedAreas: ['mailbox'],
  evidenceIds: [],
  objects: {mailboxOpened:false,envelopeTaken:false,letterRead:false,shedDoorOpened:false},
  updatedAt: null
});
function validList(list, allowed) {
  return Array.isArray(list) && list.every((id,i)=>allowed.includes(id)&&list.indexOf(id)===i);
}
export function validWorldState(s) {
  if (!s || typeof s!=='object' || Array.isArray(s)) return false;
  if (s.schemaVersion!==WORLD_SCHEMA_VERSION || s.adventureId!=='first-contact-world-poc') return false;
  if (!areaFor(s.currentArea) || !validList(s.knownAreas,AREA_IDS) || !validList(s.visitedAreas,AREA_IDS)) return false;
  if (!s.knownAreas.includes('mailbox') || !s.visitedAreas.includes('mailbox') || !s.visitedAreas.every(x=>s.knownAreas.includes(x))) return false;
  if (!s.knownAreas.includes(s.currentArea) || !s.visitedAreas.includes(s.currentArea)) return false;
  if (!validList(s.evidenceIds,['fc-envelope-observed'])) return false;
  if (!s.objects || FLAGS.some(k=>typeof s.objects[k]!=='boolean') || Object.keys(s.objects).length!==FLAGS.length) return false;
  if (s.objects.envelopeTaken && !s.objects.mailboxOpened) return false;
  if (s.objects.letterRead && !s.objects.envelopeTaken) return false;
  if (s.objects.shedDoorOpened && !s.visitedAreas.includes('shed')) return false;
  if (s.knownAreas.includes('shed') !== s.objects.letterRead) return false;
  if (s.evidenceIds.includes('fc-envelope-observed') !== s.objects.letterRead) return false;
  if (s.updatedAt!==null && (typeof s.updatedAt!=='string'||!Number.isFinite(Date.parse(s.updatedAt)))) return false;
  return true;
}
export function createWorldNavigation({storage,now=()=>new Date().toISOString(),key=WORLD_SAVE_KEY}={}) {
  let state=initial(), warning=null, blocked=false;
  let store=storage;
  try {
    store = storage === undefined ? (typeof localStorage!=='undefined'?localStorage:null) : storage;
    if (!store) warning='Browser storage unavailable. This session may not be saved.';
    const existing=store?.getItem(key);
    if (existing!==null && existing!==undefined) {
      const value=JSON.parse(existing);
      if (!validWorldState(value)) throw new Error('invalid saved world state');
      state=clone(value);
    }
  } catch {
    blocked=true;
    warning='An existing world save could not be safely read. It has not been overwritten. Reset this POC explicitly to start again.';
  }
  const save=next=>{
    state=next;
    try {
      if(!store) throw new Error('no storage');
      store.setItem(key,JSON.stringify(next));
      warning=null;
    } catch {
      warning='Progress is only in memory. Browser storage is unavailable; refresh may lose changes.';
    }
  };
  const commit=next=>{next.updatedAt=now();save(next);return {ok:true,state:clone(state)}};
  const failure=reason=>({ok:false,reason,state:clone(state)});
  const canTravel=(areaId,s=state)=>{
    if (!areaFor(areaId) || !s.knownAreas.includes(areaId)) return false;
    if (areaId==='shed' && !s.objects.letterRead) return false;
    return true;
  };
  function act(action) {
    if(blocked) return failure('save-recovery-required');
    const s=clone(state);
    switch(action){
      case 'open-mailbox':
        if(s.currentArea!=='mailbox' || s.objects.mailboxOpened) return failure('not-available');
        s.objects.mailboxOpened=true; break;
      case 'take-envelope':
        if(s.currentArea!=='mailbox'||!s.objects.mailboxOpened||s.objects.envelopeTaken) return failure('not-available');
        s.objects.envelopeTaken=true; break;
      case 'read-letter':
        if(!s.objects.envelopeTaken) return failure('not-available');
        if(s.objects.letterRead)return {ok:true,unchanged:true,state:clone(state)};
        s.objects.letterRead=true;
        s.knownAreas.push('shed');
        s.evidenceIds.push('fc-envelope-observed');break;
      case 'open-shed-door':
        if(s.currentArea!=='shed'||s.objects.shedDoorOpened)return failure('not-available');
        s.objects.shedDoorOpened=true;break;
      default:return failure('unknown-action');
    }
    return commit(s);
  }
  function travel(to) {
    if(blocked) return failure('save-recovery-required');
    if(!canTravel(to)) return failure('destination-locked');
    if(to===state.currentArea)return {ok:true,unchanged:true,state:clone(state)};
    if(!AREAS[state.currentArea].exits.includes(to))return failure('no-route');
    const s=clone(state);s.currentArea=to;
    if(!s.visitedAreas.includes(to))s.visitedAreas.push(to);
    return commit(s);
  }
  function reset() {
    try { store?.removeItem(key); } catch { return failure('reset-failed'); }
    blocked=false;warning=store?null:'Browser storage unavailable. This session may not be saved.';
    state=initial();return {ok:true,state:clone(state)};
  }
  return {
    getState:()=>clone(state), getWarning:()=>warning, isBlocked:()=>blocked,
    knownLocations:()=>state.knownAreas.map(id=>({...AREAS[id],accessible:canTravel(id)})),
    canTravel,act,travel,reset
  };
}

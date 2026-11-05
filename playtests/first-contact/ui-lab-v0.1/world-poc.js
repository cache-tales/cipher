/**
 * Two-area illustrated First Contact development POC.
 * Uses the owner's exact selected background illustrations and cropped door pixels.
 * World progression remains provided by the existing state service; no new cloud code.
 */
import {createWorldNavigation} from '../src/world/world-navigation.js';
import {AREAS} from '../src/world/areas.js';

const $=id=>document.getElementById(id);
const browserStore=(()=>{try{const st=window.localStorage;const testKey='ct:lab:probe';st.setItem(testKey,'ok');st.removeItem(testKey);return st}catch{return {getItem(){return null},setItem(){throw new Error('local storage disabled')},removeItem(){}}}})();
const world=createWorldNavigation({storage:browserStore,key:'ct:first-contact:interface-lab:v1'});
const uiKey='ct:first-contact:interface-lab:ui:v1';
const scene=$('scene');
const dialog=$('letter-dialog');
let locationsOpen=false;
let observed=null;
let interfaceChoice='cinematic';
try{const saved=localStorage.getItem(uiKey);if(['cinematic','investigator','expedition'].includes(saved))interfaceChoice=saved}catch{}
const UI_SUMMARIES={cinematic:'More room for the mystery; actions appear when needed.',investigator:'Visual story and evidence together, with known places always in reach.',expedition:'Travel-first layout for a world that grows one location at a time.'};
function setInterface(choice){
 if(!Object.hasOwn(UI_SUMMARIES,choice))return;
 interfaceChoice=choice;document.body.dataset.ui=choice;
 for(const b of document.querySelectorAll('[data-ui-choice]'))b.setAttribute('aria-pressed',String(b.dataset.uiChoice===choice));
 $('lab-summary').textContent=UI_SUMMARIES[choice];
 try{localStorage.setItem(uiKey,choice)}catch{}
}
function renderAux(){
 const s=world.getState(),location=AREAS[s.currentArea];
 $('aside-place').textContent='First Contact';
 $('aside-observation').textContent=s.currentArea==='shed'?(s.objects.shedDoorOpened?'Study what lies beyond the doorway.':'Try the shed door.'):(s.objects.letterRead?'Follow the destination in the letter.':s.objects.envelopeTaken?'Examine the letter for its destination.':s.objects.mailboxOpened?'Take the envelope.':'Open the raised mailbox.');
 $('aside-evidence').textContent=s.objects.envelopeTaken? s.objects.letterRead?'Envelope recovered. Old Shed destination recorded.':'Unfamiliar envelope recovered. Letter not yet read.':'Nothing collected yet.';
 for(const container of [$('aside-locations'),$('world-rail')]){
   container.replaceChildren();
   for(const loc of world.knownLocations()){
    const b=document.createElement('button');b.type='button';b.dataset.destination=loc.id;
    b.textContent=(container.id==='world-rail'?'⌖ ':'')+loc.label+(loc.id===s.currentArea?' · Here':'');
    b.disabled=world.isBlocked()||!loc.accessible||loc.id===s.currentArea;
    if(loc.id===s.currentArea)b.setAttribute('aria-current','location');
    container.append(b);
   }
 }
}

const assets={
  mailbox:{src:'./assets/mailbox-scene.webp',alt:'Closed old metal mailbox on a golden-hour forest trail.'},
  shed:{src:'./assets/shed-scene.webp',alt:'Closed wooden door on a weathered red shed surrounded by forest.'}
};
function narrative(s){
  if(s.currentArea==='shed') return s.objects.shedDoorOpened
    ?'The hinges complain. The doorway opens into the dim shed. The interior comes in the next chapter.'
    :'The old shed is quiet. Its door has been shut for a long time.';
  if(s.objects.letterRead) return 'The letter points toward an old shed. The name is now in Known Locations.';
  if(s.objects.envelopeTaken) return 'No sender. No postmark. Something about the envelope feels deliberate.';
  if(s.objects.mailboxOpened) return 'Inside the mailbox: a single, weathered envelope.';
  return 'The flag is raised. Something has been left inside.';
}
function action(label,cmd){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.action=cmd;
  b.disabled=world.isBlocked();$('object-actions').append(b);
}
function updatePlaces(){
  const s=world.getState(),list=$('places-list');list.replaceChildren();
  for(const location of world.knownLocations()){
    const b=document.createElement('button');b.type='button';b.dataset.destination=location.id;
    b.textContent=location.label + (location.id===s.currentArea?' · Here':'');
    b.disabled=world.isBlocked()||!location.accessible||location.id===s.currentArea;
    if(location.id===s.currentArea)b.setAttribute('aria-current','location');
    list.append(b);
  }
  $('places-panel').hidden=!locationsOpen;
  $('places-toggle').setAttribute('aria-expanded',String(locationsOpen));
}
function render(){
  const s=world.getState(),here=s.currentArea,mail=here==='mailbox',opened=mail?s.objects.mailboxOpened:s.objects.shedDoorOpened;
  const img=assets[here];
  if(scene.dataset.area!==here || !scene.dataset.loaded){
    $('scene-background').src=img.src;
    $('scene-background').alt=img.alt;
    scene.dataset.area=here;
    scene.dataset.loaded='yes';if(window.innerWidth<660)requestAnimationFrame(()=>{const vp=$('scene-viewport');vp.scrollLeft=here==='shed'?vp.scrollWidth-vp.clientWidth:0;});
  }
  scene.dataset.open=String(opened);
  $('area-title').textContent=AREAS[here].label;
  $('area-intro').textContent=AREAS[here].description;
  $('mailbox-open').hidden=!mail||s.objects.mailboxOpened||world.isBlocked();
  $('mailbox-envelope').hidden=!mail||!s.objects.mailboxOpened||s.objects.envelopeTaken||world.isBlocked();
  $('shed-door').hidden=mail||s.objects.shedDoorOpened||world.isBlocked();
  $('shed-look').hidden=mail||!s.objects.shedDoorOpened||world.isBlocked();
  $('observation').textContent=observed??narrative(s);
  $('object-actions').replaceChildren();
  if(mail){
    if(!s.objects.mailboxOpened)action('Open mailbox','open-mailbox');
    else if(!s.objects.envelopeTaken)action('Take envelope','take-envelope');
    else action('Examine letter','inspect-letter');
  }else action(s.objects.shedDoorOpened?'Look into the shed':'Open shed door',s.objects.shedDoorOpened?'inspect-shed':'open-shed-door');
  const target=mail?'shed':'mailbox';
  $('scene-exit').hidden=world.isBlocked()||!world.canTravel(target);
  $('scene-exit').dataset.destination=target;
  $('scene-exit').textContent=mail?'Old Shed Exterior →':'← Mailbox Area';
  const warning=world.getWarning();
  $('save-warning').hidden=!warning;$('save-warning').textContent=warning||'';
  $('save-state').textContent=warning?'Save warning · see below':'Progress saves locally';
  updatePlaces();renderAux();
}
function showLetter(){if(!world.getState().objects.envelopeTaken)return;
  $('read-letter').hidden=world.getState().objects.letterRead;
  dialog.showModal();
}
function interact(type){
  observed=null;
  if(type==='inspect-letter'){showLetter();return;}
  if(type==='inspect-shed'){observed='The shed interior and its desk are not built yet. The open door is saved for your next visit.';render();return;}
  const result=world.act(type);
  if(!result.ok){observed='That action is not available yet.';render();return;}
  render();
  if(type==='take-envelope')showLetter();
}
function travel(to){
  observed=null;
  const result=world.travel(to);
  if(!result.ok){observed='That location cannot be reached yet.';render();return;}
  locationsOpen=false;
  render();$('area-title').focus({preventScroll:true});
}
for(const b of document.querySelectorAll('[data-ui-choice]'))b.addEventListener('click',()=>setInterface(b.dataset.uiChoice));
for(const id of ['aside-locations','world-rail']) $(id).addEventListener('click',e=>{const b=e.target.closest('[data-destination]');if(b&&!b.disabled)travel(b.dataset.destination)});
setInterface(interfaceChoice);
$('mailbox-open').addEventListener('click',()=>interact('open-mailbox'));
$('mailbox-envelope').addEventListener('click',()=>interact('take-envelope'));
$('shed-door').addEventListener('click',()=>interact('open-shed-door'));
$('shed-look').addEventListener('click',()=>interact('inspect-shed'));
$('object-actions').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)interact(b.dataset.action)});
$('scene-exit').addEventListener('click',()=>travel($('scene-exit').dataset.destination));
$('places-toggle').addEventListener('click',()=>{
  locationsOpen=!locationsOpen;updatePlaces();
  if(locationsOpen)$('places-heading').focus();
});
$('places-close').addEventListener('click',()=>{locationsOpen=false;updatePlaces();$('places-toggle').focus()});
$('places-list').addEventListener('click',e=>{const b=e.target.closest('[data-destination]');if(b&&!b.disabled)travel(b.dataset.destination)});
$('read-letter').addEventListener('click',()=>{
  const result=world.act('read-letter');
  if(result.ok){observed='The letter names the Old Shed. Its location is now known.';dialog.close();render();$('area-title').focus({preventScroll:true})}
});
$('letter-close').addEventListener('click',()=>{dialog.close();$('area-title').focus({preventScroll:true})});
$('reset-toggle').addEventListener('click',()=>{
  if(!confirm('Reset ONLY this two-area test on this browser? Existing Cipher saves are preserved.'))return;
  if(dialog.open)dialog.close();const result=world.reset();
  locationsOpen=false;observed=result.ok?'The mailbox is closed again.':'Could not reset safely.';
  render();$('area-title').focus({preventScroll:true});
});
render();

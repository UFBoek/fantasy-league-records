/* Waiver History: completed Sleeper waiver and free-agent transactions only. */
(function(){
'use strict';
function figWaiverHistoryModel(data,opts){
 const names={},teams=new Map(),seen=new Set();
 function addName(id,name,position){
  id=String(id??'');name=String(name||'').trim();
  if(id&&name&&name!==id&&!names[id])names[id]={name,position:position||''};
 }
 for(const [id,p] of Object.entries(data.waiverNames||{}))addName(id,p.name,p.position);
 for(const [id,p] of Object.entries(data.raValues?.players||{}))addName(id,p?.name,p?.position);
 for(const p of data.currentRoster||[])addName(p.player_id,p.player_name,p.position);
 for(const p of data.draftPicks||[])addName(p.player_id,p.draft_full_name||p.player_name,p.position);
 for(const p of data.playerLog||[])addName(p.player_id,p.player_name,p.position);
 const team=id=>{
  if(!teams.has(id))teams.set(id,{id,name:opts.names?.[id]||'Team '+id,adds:[],drops:[]});
  return teams.get(id);
 };
 const invalidStart=Date.parse('2023-12-17T00:00:00Z'),
  invalidEnd=Date.parse('2023-12-18T00:00:00Z');
 for(const t of data.transactions||[]){
  if(!['waiver','free_agent'].includes(t.transaction_type)||t.status!=='complete')continue;
  const ts=Number(t.created_timestamp)||0;
  if(ts>=invalidStart&&ts<invalidEnd)continue;
  if(seen.has(String(t.transaction_id)))continue;
  seen.add(String(t.transaction_id));
  for(const kind of ['adds','drops'])for(const [pid,rid] of Object.entries(t[kind]||{})){
   const id=Number(rid);
   if(!Number.isInteger(id)||id<1||id>10)continue;
   team(id)[kind].push({playerId:String(pid),season:Number(t.season),week:Number(t.week),
    timestamp:ts,kind:t.transaction_type});
  }
 }
 const ready=opts.valuesReady===true;
 const worth=pid=>{
  if(!ready)return null;
  const raw=opts.playerValue(pid);
  return raw===null||raw===undefined||!Number.isFinite(Number(raw))?0:Math.max(0,Number(raw));
 };
 const unique=events=>{
  const found=new Map();
  for(const e of events){
   if(!found.has(e.playerId)){
    const m=names[e.playerId];
    found.set(e.playerId,{id:e.playerId,name:m?.name||'Player #'+e.playerId,
     position:m?.position||'',value:worth(e.playerId),events:[],last:0});
   }
   const p=found.get(e.playerId);p.events.push(e);
   if(e.timestamp>=p.last){p.last=e.timestamp;p.season=e.season;p.week=e.week;}
  }
  return [...found.values()].sort((a,b)=>(b.value??-1)-(a.value??-1)||b.last-a.last||a.id.localeCompare(b.id));
 };
 for(let i=1;i<=10;i++)team(i);
 for(const t of teams.values()){
  t.uniqueAdds=unique(t.adds);t.uniqueDrops=unique(t.drops);
  t.addedValue=ready?t.uniqueAdds.reduce((s,p)=>s+p.value,0):null;
  t.droppedValue=ready?t.uniqueDrops.reduce((s,p)=>s+p.value,0):null;
  t.top10Value=ready?t.uniqueAdds.slice(0,10).reduce((s,p)=>s+p.value,0):null;
 }
 return {teams:[...teams.values()].sort((a,b)=>a.id-b.id),ready};
}
function figWaiverHistoryPage(id,model,ui){
 const host=ui.el('#teamTabBody');if(!host)return;
 const t=model.teams.find(t=>t.id===Number(id));if(!t)return;
 const esc=ui.escape,money=ui.money;
 const val=p=>p.value===null?'–':money(p.value);
 const years=[...new Set([...t.adds,...t.drops].map(e=>e.season))].sort((a,b)=>b-a);
 let q='',year='all',sort='value',mode='both';
 const stat=(label,v,sub)=>'<div class="fig-wv-stat"><small>'+label+'</small><strong>'+v+'</strong><span>'+sub+'</span></div>';
 host.innerHTML='<section class="fig-wv-page"><header class="fig-wv-title"><small>TRANSACTION ARCHIVE</small><h2>WAIVER HISTORY</h2></header>'+
 '<div class="fig-wv-stats">'+stat('ADDED PLAYERS',t.uniqueAdds.length,t.adds.length+' TRANSACTIONS')+
 stat('DROPPED PLAYERS',t.uniqueDrops.length,t.drops.length+' TRANSACTIONS')+
 stat('ADDED VALUE',t.addedValue===null?'–':money(t.addedValue),'CURRENT VALUE')+
 stat('DROPPED VALUE',t.droppedValue===null?'–':money(t.droppedValue),'CURRENT VALUE')+'</div>'+
 '<div class="fig-wv-filters"><input id="figWvSearch" type="search" placeholder="Search players…" aria-label="Search waiver players">'+
 '<label>YEAR<select id="figWvYear"><option value="all">ALL YEARS</option>'+
 years.map(y=>'<option value="'+y+'">'+y+'</option>').join('')+'</select></label>'+
 '<label>SORT<select id="figWvSort"><option value="value">CURRENT VALUE</option><option value="recent">MOST RECENT</option><option value="count">MOST MOVES</option></select></label>'+
 '<label>VIEW<select id="figWvMode"><option value="both">ADDS & DROPS</option><option value="adds">ADDS</option><option value="drops">DROPS</option></select></label></div>'+
 '<div id="figWvBoards" class="fig-wv-boards"></div>'+
 '<p class="fig-wv-note">Completed waiver and free-agent activity only. Trades, commissioner moves and the December 17, 2023 restoration batch are excluded. Values are current, not historical. Expand any player to see every recorded move.</p></section>';
 const select=kind=>{
  const all=kind==='adds'?t.uniqueAdds:t.uniqueDrops;
  return all.filter(p=>(!q||p.name.toLowerCase().includes(q)||p.id.includes(q))&&
   (year==='all'||p.events.some(e=>String(e.season)===year)))
   .sort((a,b)=>sort==='count'?b.events.length-a.events.length||
    (b.value??-1)-(a.value??-1):sort==='recent'?b.last-a.last:
    (b.value??-1)-(a.value??-1)||b.last-a.last);
 };
 const row=(p,kind)=>'<details class="fig-wv-row"><summary>'+
  ui.headshot(p.id,p.name,'fig-wv-headshot')+
  '<span class="fig-wv-person"><b>'+esc(p.name)+'</b><small>'+esc(p.position||'PLAYER')+
  ' · '+p.events.length+' '+kind+' · '+p.season+' W'+p.week+'</small></span>'+
  '<span class="fig-wv-value"><strong>'+val(p)+'</strong><small>VALUE NOW</small></span><span>⌄</span></summary>'+
  '<div class="fig-wv-events">'+p.events.slice().sort((a,b)=>b.timestamp-a.timestamp).map(e=>
  '<div>'+e.season+' W'+e.week+' · '+(e.kind==='waiver'?'Waiver claim':'Free agent')+
  ' · '+new Date(e.timestamp).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'})+
  '</div>').join('')+'</div></details>';
 const draw=()=>{
  ui.el('#figWvBoards').innerHTML=[['adds','PLAYERS ADDED'],['drops','PLAYERS DROPPED']]
   .filter(([k])=>mode==='both'||mode===k)
   .map(([k,label])=>'<section class="fig-wv-board"><header><h3>'+label+'</h3><small>'+
   select(k).length+' PLAYERS</small></header><div class="fig-wv-scroll">'+
   (select(k).map(p=>row(p,k==='adds'?'ADD':'DROP')).join('')||
    '<div class="fig-wv-empty">No matching players.</div>')+'</div></section>').join('');
 };
 for(const [id,event,update] of [
  ['figWvSearch','input',v=>q=v.toLowerCase().trim()],
  ['figWvYear','change',v=>year=v],['figWvSort','change',v=>sort=v],
  ['figWvMode','change',v=>mode=v]]){
  ui.el('#'+id)?.addEventListener(event,e=>{update(e.target.value);draw();});
 }
 draw();
}
window.figWaiverHistoryModel=figWaiverHistoryModel;
window.figWaiverHistoryPage=figWaiverHistoryPage;
})();
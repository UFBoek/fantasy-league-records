/* Trade Ratings v143 — current-market + realized lineup production outcome snapshots.
   NOT historical trade-date prices; incomplete or one-sided exchanges are unrated. */
function figTradeRatingLetter(n){
 if(n===null||!Number.isFinite(n))return '—';
 return n>=90?'S':n>=75?'A':n>=60?'B':n>=45?'C':n>=30?'D':'F';
}
function figTradeRatingModel(data,tools){
 const trades=data.trades||[],assets=data.tradeAssets||[],sides=data.tradeSides||[];
 const playerWeeks=data.playerLog||[],audits=data.draftAudit||[];
 const catalog=new Map(),outgoing=new Map(),production=new Map(),received=new Map();
 const idKey=x=>String(x.transaction_id)+':'+Number(x.franchise_id);
 const isAfter=(x,t)=>Number(x.season)>Number(t.season)||
  (Number(x.season)===Number(t.season)&&Number(x.week)>Number(t.week));
 const pickKey=a=>[Number(a.pick_season),Number(a.pick_round),Number(a.original_pick_franchise_id)].join(':');
 for(const a of assets){
  if(a.asset_direction==='Received'){
   const k=idKey(a);
   if(!received.has(k))received.set(k,[]);
   received.get(k).push(a);
  }else if(a.asset_direction==='Sent'){
   const k=Number(a.franchise_id)+':'+(a.asset_type==='Player'?'P:'+String(a.player_id):'K:'+pickKey(a));
   if(!outgoing.has(k))outgoing.set(k,[]);
   outgoing.get(k).push(a);
  }
 }
 for(const x of outgoing.values())x.sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week)||String(a.transaction_id).localeCompare(String(b.transaction_id)));
 for(const w of playerWeeks){
  const key=Number(w.franchise_id)+':'+String(w.player_id);
  if(!production.has(key))production.set(key,[]);
  production.get(key).push(w);
 }
 const draftOutcomes=new Map(audits.filter(x=>x.draft_kind==='rookie').map(a=>[
   [Number(a.draft_year),Number(a.round),Number(a.original_franchise)].join(':'),a]));
 const nextSent=(t,franchise,key,kind)=>{
  const rows=outgoing.get(Number(franchise)+':'+kind+':'+key)||[];
  return rows.find(x=>isAfter(x,t))||null;
 };
 const takePlayer=(t,id,a)=>{
  const exit=nextSent(t,id,String(a.player_id),'P');
  const list=(production.get(Number(id)+':'+String(a.player_id))||[]).filter(w=>
   isAfter(w,t)&&(!exit||Number(w.season)<Number(exit.season)||
    (Number(w.season)===Number(exit.season)&&Number(w.week)<Number(exit.week))));
  // Official player log contains starts only, and a player/week is counted once.
  const distinct=new Map(list.map(w=>[[w.season,w.week,w.franchise_id,w.player_id].join(':'),w]));
  const points=[...distinct.values()].reduce((n,w)=>n+(Number(w.starter_points)||0),0);
  return {points,starts:distinct.size,exit};
 };
 const marketAsset=(t,id,a)=>{
  if(a.asset_type==='Player'){
   const z=takePlayer(t,id,a);
   return {name:a.player_name||a.asset_label||'Player',type:'PLAYER',market:tools.playerValue(a.player_id),
    basis:'Current player value',points:z.points,starts:z.starts,exit:Boolean(z.exit),asset:a};
  }
  if(a.asset_type==='Draft Pick'){
   // The 2023 startup draft used 20-round startup selections, NOT rookie
   // draft picks. Never substitute 2027 rookie prices for startup assets.
   if(Number(a.pick_season)===2023)return {name:tools.pickLabel(a.asset_label||'',a),
    type:'PICK',market:null,basis:'2023 startup pick: no historical price',
    points:0,starts:0,asset:a};
   const outcome=draftOutcomes.get(pickKey(a));
   const transferred=Boolean(nextSent(t,id,pickKey(a),'K'));
   const selectedByRecipient=outcome?.resolution_status==='DIRECT_DRAFT_SLOT_MATCH'&&
    outcome?.selection_verified_by_draft_slot===true&&Number(outcome.selecting_franchise)===Number(id);
   const converted=!transferred&&selectedByRecipient&&outcome?.player_id;
   const pickPrice=tools.pickValue(a.pick_season,a.pick_round,a.original_pick_franchise_id);
   const market=converted?tools.playerValue(outcome.player_id):pickPrice?.value??null;
   const basis=converted?'Verified drafted player value':'Current pick comparable';
   return {name:tools.pickLabel(a.asset_label||'',a),type:'PICK',market,basis,points:0,starts:0,
     converted:!!converted,selection:converted?outcome.player_name:null,
     proxy:!converted&&Boolean(pickPrice?.isProxy),transferred,asset:a};
  }
  return {name:a.asset_label||a.asset_type||'Unpriced asset',type:a.asset_type||'OTHER',market:null,
   basis:'Not valued',points:0,starts:0,asset:a};
 };
 const all=trades.map(t=>{
  const participants=sides.filter(s=>String(s.transaction_id)===String(t.transaction_id));
  const part=participants.map(p=>{
   const rowAssets=received.get(idKey(p))||[];
   const items=rowAssets.map(a=>marketAsset(t,p.franchise_id,a));
   const priced=items.filter(a=>a.market!==null&&Number.isFinite(a.market));
   const market=priced.reduce((n,a)=>n+a.market,0);
   const lineup=items.reduce((n,a)=>n+a.points,0);
   const starts=items.reduce((n,a)=>n+a.starts,0);
   return {id:+p.franchise_id,name:tools.name(p.owner_name,p.franchise_id),items,market,lineup,starts,
    priced:priced.length,total:items.length,complete:priced.length===items.length&&items.length>0,
    impact:market+lineup*4,grade:null,score:null};
  });
  // Require enough data to compare the FULL exchange. A blank or missing side
  // may reflect commissioner adjustments, not a meaningful swap.
  const rated=part.length>=2&&part.every(p=>p.complete)&&part.some(p=>p.impact>0);
  if(rated){
   const allImpact=part.reduce((n,p)=>n+p.impact,0);
   for(const p of part){
    const opposition=(allImpact-p.impact)/(part.length-1);
    const raw=50+45*(p.impact-opposition)/(p.impact+opposition+2500);
    p.score=Math.max(5,Math.min(95,Math.round(raw)));
    p.grade=figTradeRatingLetter(p.score);
   }
  }
  return {id:String(t.transaction_id),season:String(t.season),week:Number(t.week),participants:part,
   rated,players:Number(t.total_player_assets)||0,picks:Number(t.total_pick_assets)||0,
   search:(String(t.owners_involved||'')+' '+part.map(p=>p.name+' '+p.items.map(x=>x.name+' '+(x.selection||'')).join(' ')).join(' ')).toLowerCase()};
 }).filter(t=>t.participants.length>=2)
 .sort((a,b)=>Number(b.season)-Number(a.season)||b.week-a.week||b.id.localeCompare(a.id));
 const names=new Map();
 for(const p of sides)names.set(+p.franchise_id,tools.name(p.owner_name,p.franchise_id));
 const rankings=[...names.entries()].map(([id,name])=>{
  const relevant=all.filter(t=>t.participants.some(p=>p.id===id));
  const graded=relevant.flatMap(t=>t.participants.filter(p=>p.id===id&&p.score!==null));
  const avg=graded.length?graded.reduce((n,x)=>n+x.score,0)/graded.length:null;
  const wins=graded.filter(p=>p.score>=54).length,losses=graded.filter(p=>p.score<=46).length;
  const ties=graded.length-wins-losses;
  return {id,name,trades:relevant.length,rated:graded.length,avg:avg===null?null:+avg.toFixed(1),
   grade:figTradeRatingLetter(avg),wins,losses,ties,provisional:graded.length<3};
 }).sort((a,b)=>Number(a.provisional)-Number(b.provisional)||
  (b.avg??-1)-(a.avg??-1)||b.rated-a.rated||a.name.localeCompare(b.name));
 return {trades:all,rankings,years:[...new Set(all.map(t=>t.season))].sort((a,b)=>+b-+a),
   rated:all.filter(t=>t.rated).length};
}
function figTradeRatingsPage(model,helpers){
 const {html,el,escape,money,avatar,ownerLink}=helpers;
 let manager='all',versus='all',year='all',search='',sort='recent',limit=24;
 const managers=[...model.rankings].sort((a,b)=>a.name.localeCompare(b.name));
 const options=(selected,allowAll=true,exclude=null)=> (allowAll?'<option value="all">ALL MANAGERS</option>':'')+
  managers.filter(m=>m.id!==Number(exclude)).map(m=>'<option value="'+m.id+'"'+(String(m.id)===String(selected)?' selected':'')+'>'+escape(m.name)+'</option>').join('');
 const grade=x=>x.score===null
  ?'<span class="fig-tr-grade pending">UNRATED</span>'
  :'<span class="fig-tr-grade grade-'+String(x.grade).toLowerCase()+'">'+x.grade+' <strong>'+x.score+'</strong></span>';
 const summaryAssets=p=>p.items.map(a=>escape(a.name)).join(' · ')||'No received assets';
 const compactSide=p=>'<div class="fig-tr-compact-side"><div class="fig-tr-compact-person">'+
  '<span>'+avatar(p.id,'fig-tr-photo')+escape(p.name)+'</span>'+grade(p)+'</div>'+
  '<div class="fig-tr-asset-preview">'+summaryAssets(p)+'</div></div>';
 const detailSide=p=>'<div class="fig-tr-detail-side"><div class="fig-tr-detail-head">'+
  ownerLink(p.name,p.id)+grade(p)+'</div><div class="fig-tr-detail-stats">'+
  '<span><b>'+(p.priced?money(p.market):'—')+'</b><small>CURRENT VALUE</small></span>'+
  '<span><b>'+money(p.lineup)+'</b><small>LINEUP POINTS · '+p.starts+' STARTS</small></span></div>'+
  '<div class="fig-tr-items">'+(p.items.length?p.items.map(a=>'<div class="fig-tr-item">'+
   '<span class="fig-tr-type">'+escape(a.type)+'</span><div><b>'+escape(a.name)+'</b>'+
   (a.selection?'<small>Selected: '+escape(a.selection)+'</small>':'')+
   (a.transferred?'<small>Pick later transferred</small>':'')+
   (a.proxy?'<small>2027 pick comparable, not trade-date value</small>':'')+
   (a.type==='PLAYER'&&a.exit?'<small>Later traded away</small>':'')+
   '</div><div class="fig-tr-item-value">'+(a.market!==null?money(a.market):'UNVALUED')+
   (a.type==='PLAYER'?'<small>'+money(a.points)+' lineup pts</small>':'')+'</div></div>').join(''):
   '<div class="fig-tr-item fig-tr-no-assets">No recorded assets received</div>')+'</div></div>';
 const card=t=>'<details class="fig-tr-card"><summary class="fig-tr-summary">'+
  '<span class="fig-tr-trade-date">'+escape(t.season)+'<small>W'+t.week+' · '+t.participants.length+' TEAMS</small></span>'+
  '<div class="fig-tr-mini-matchup">'+t.participants.map(compactSide).join('')+'</div>'+
  '<span class="fig-tr-chevron" aria-hidden="true">⌄</span></summary>'+
  '<div class="fig-tr-details">'+t.participants.map(detailSide).join('')+'</div>'+
  (!t.rated?'<div class="fig-tr-unrated-note">Not scored: a side has missing market values, or no assets were recorded. No value was invented.</div>':
  '<div class="fig-tr-outcome-note">Outcome snapshot uses current asset values plus 4× completed lineup points produced after acquisition. Not a trade-date grade.</div>')+
  '</details>';
 const rankRow=(m,i)=>'<button type="button" class="fig-tr-rank-row" data-manager="'+m.id+'">'+
  '<b class="fig-tr-rank-num">'+(m.provisional?'—':String(i+1))+'</b>'+
  avatar(m.id,'fig-tr-rank-avatar')+
  '<span class="fig-tr-rank-name"><strong>'+escape(m.name)+'</strong><small>'+m.rated+'/'+m.trades+
  ' rated · '+m.wins+'W '+m.losses+'L '+m.ties+'T'+(m.provisional?' · PROVISIONAL':'')+'</small></span>'+
  '<span class="fig-tr-rank-score">'+(m.avg===null?'—':String(m.avg.toFixed(1)))+
  '<small>'+(m.avg===null?'UNRATED':m.grade+' GRADE')+'</small></span></button>';
 const leaderboard='<section class="section fig-tr-leaderboard"><div class="section-head">'+
  '<h2 class="section-title">OVERALL TRADE RANKINGS</h2><div class="section-note">Average rated trade outcome · minimum 3 for ranked</div></div>'+
  '<div class="fig-tr-rankings">'+model.rankings.map(rankRow).join('')+'</div>'+
  '</section>';
 html('tradeRatingsRoot','<div class="fig-tr-page">'+
  '<div class="fig-tr-stats"><div><small>COMPLETED TRADES</small><strong>'+model.trades.length+'</strong></div>'+
  '<div><small>FULLY VALUED</small><strong>'+model.rated+'</strong></div>'+
  '<div><small>MANAGERS</small><strong>'+managers.length+'</strong></div></div>'+
  leaderboard+
  '<section class="section fig-tr-history" id="tradeRatingsHistory"><div class="section-head">'+
  '<h2 class="section-title">TRADE HISTORY</h2><div class="section-note">Select managers to compare every direct trade</div></div>'+
  '<div class="fig-tr-controls"><label>MANAGER<select id="figTrManager">'+options(manager)+'</select></label>'+
  '<label>WITH / AGAINST<select id="figTrVersus">'+options(versus)+'</select></label>'+
  '<label>YEAR<select id="figTrYear"><option value="all">ALL YEARS</option>'+model.years.map(y=>'<option value="'+escape(y)+'">'+escape(y)+'</option>').join('')+'</select></label>'+
  '<label>SORT<select id="figTrSort"><option value="recent">NEWEST</option><option value="oldest">OLDEST</option>'+
  '<option value="best">BEST RATED</option><option value="worst">WORST RATED</option></select></label>'+
  '</div><div class="fig-tr-search-row"><input id="figTrSearch" class="search" type="search" placeholder="Search traded players, picks or managers…" autocomplete="off"><button id="figTrClear" type="button">RESET</button></div>'+
  '<div id="figTrResults"></div></section>'+
  '<details class="fig-tr-method section"><summary>HOW ARE TRADES RATED?</summary>'+
  '<p>A snapshot of the assets each manager received: current RosterAudit player or draft-pick value, plus completed starting-lineup points earned after receiving a player (weighted at 4 value units per point). Transferred historical picks use present-day comparable values; verified picks drafted by the recipient may use the selected player’s current value.</p>'+
  '<p>Each side is scored from 5–95 against the other side (or other sides’ average). S ≥90, A ≥75, B ≥60, C ≥45, D ≥30, F below 30. An average of three rated trades is required for an official ranking. Incomplete or one-sided exchanges are unranked.</p>'+
  '<p><strong>These are outcome ratings, not historical trade-date prices.</strong> Missing valuations are never silently scored as zero. Player production is counted only after the transaction, stopping at a later recorded trade out; draft-pick outcomes are not credited to someone who subsequently traded the pick. Market values are current and rankings may change when RosterAudit updates.</p></details></div>');
 const root=el('#tradeRatingsRoot');
 const results=el('#figTrResults');
 const render=()=>{
  let list=model.trades.filter(t=>(manager==='all'||t.participants.some(x=>String(x.id)===manager))&&
   (versus==='all'||t.participants.some(x=>String(x.id)===versus))&&
   (manager==='all'||versus==='all'||manager!==versus)&&
   (year==='all'||t.season===year)&&(!search||t.search.includes(search)));
  if(sort==='oldest')list=[...list].reverse();
  if(sort==='best'||sort==='worst')list=[...list].sort((a,b)=>{
   const metric=t=>{
    if(!t.rated)return null;
    if(manager!=='all')return t.participants.find(p=>String(p.id)===manager)?.score??null;
    const scores=t.participants.map(p=>p.score).filter(x=>x!==null);
    return sort==='worst'?Math.min(...scores):Math.max(...scores);
   };
   const as=metric(a),bs=metric(b);
   if(as===null)return bs===null?0:1;
   if(bs===null)return -1;
   return sort==='best'?bs-as:as-bs;
  });
  const shown=list.slice(0,limit);
  const selectedPair=manager!=='all'&&versus!=='all'&&manager!==versus;
  // Head-to-head totals mirror the James/Hayden all-time summary, but any pair
  // can be selected and the results respond to year/search filters.
  const pairPanel=selectedPair&&list.length?'<div class="fig-tr-pair-board">'+[manager,versus].map(id=>{
    const rows=list.flatMap(t=>t.participants.filter(p=>String(p.id)===id));
    const n=rows.length,market=rows.reduce((v,p)=>v+p.market,0);
    const lineup=rows.reduce((v,p)=>v+p.lineup,0),rated=rows.filter(p=>p.score!==null);
    const avg=rated.length?rated.reduce((v,p)=>v+p.score,0)/rated.length:null;
    const name=managers.find(p=>String(p.id)===id)?.name||id;
    return '<div class="fig-tr-pair-person">'+avatar(id,'fig-tr-rank-avatar')+
     '<div class="fig-tr-pair-name">'+escape(name)+'<small>'+n+' DIRECT TRADES</small></div>'+
     '<div class="fig-tr-pair-score">'+(avg===null?'—':avg.toFixed(1))+'<small>AVG SCORE</small></div>'+
     '<div class="fig-tr-pair-stats"><span>'+money(market)+' <small>RECEIVED VALUE</small></span>'+
     '<span>'+money(lineup)+' <small>LINEUP PTS</small></span></div></div>';
   }).join('')+'</div>':'';
  results.innerHTML='<div class="fig-tr-result-meta">'+list.length+' MATCHING TRADES · '+list.filter(t=>t.rated).length+' RATED</div>'+
   pairPanel+
   (shown.length?'<div class="fig-tr-list">'+shown.map(card).join('')+'</div>':'<div class="fig-tr-empty">No trades match these filters.</div>')+
   (list.length>shown.length?'<button type="button" class="fig-tr-more" id="figTrMore">SHOW '+Math.min(24,list.length-shown.length)+' MORE →</button>':'');
  const more=el('#figTrMore');if(more)more.onclick=()=>{limit+=24;render()};
 };
 const selectId=(key,setter)=>{const e=el(key);if(e)e.onchange=ev=>{setter(ev.target.value);limit=24;render()}};
 selectId('#figTrManager',v=>manager=v);
 selectId('#figTrVersus',v=>versus=v);
 selectId('#figTrYear',v=>year=v);
 selectId('#figTrSort',v=>sort=v);
 const input=el('#figTrSearch');if(input)input.oninput=e=>{search=String(e.target.value||'').toLowerCase().trim();limit=24;render()};
 const reset=el('#figTrClear');if(reset)reset.onclick=()=>{
  manager=versus=year='all';search='';sort='recent';limit=24;
  for(const key of ['#figTrManager','#figTrVersus','#figTrYear']){const e=el(key);if(e)e.value='all'}
  const so=el('#figTrSort');if(so)so.value='recent';
  if(input)input.value='';render();
 };
 for(const button of root.querySelectorAll('.fig-tr-rank-row'))button.onclick=()=>{
  manager=String(button.dataset.manager);versus='all';year='all';search='';sort='recent';limit=24;
  el('#figTrManager').value=manager;el('#figTrVersus').value='all';el('#figTrYear').value='all';el('#figTrSort').value='recent';
  if(input)input.value='';render();el('#tradeRatingsHistory')?.scrollIntoView?.({behavior:'smooth',block:'start'});
 };
 render();
}

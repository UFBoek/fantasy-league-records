/* Trade Ratings v146 — numeric overall return, not subjective letter grades.
   100% means value received equals value sent; lineup production counts after acquisition.
   These are current-outcome comparisons, never reconstructed trade-date prices. */
function figTradeReturnPct(received,sent){
 if(!Number.isFinite(received)||!Number.isFinite(sent))return null;
 if(sent===0)return received>0?Infinity:null;
 return received/sent*100;
}
function figTradeReturnLabel(pct){
 if(pct===null)return '—';
 if(pct===Infinity)return '∞%';
 return Math.round(pct).toLocaleString('en-US')+'%';
}
function figTradeRatingModel(data,tools){
 const trades=data.trades||[],assets=data.tradeAssets||[],sides=data.tradeSides||[];
 const playerWeeks=data.playerLog||[],audits=data.draftAudit||[];
 const outgoing=new Map(),production=new Map(),received=new Map();
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
   // An individual player absent from the available valuation catalog is worth 0.
   // Do not confuse that with the *entire* provider snapshot being unavailable.
   const raw=tools.playerValue(a.player_id);
   const market=raw===null||raw===undefined
    ?(tools.valuesReady&&(!a.player_id||a.player_id==='')?0:null)
    :(Number.isFinite(Number(raw))?Math.max(0,Number(raw)):0);
   return {name:a.player_name||a.asset_label||'Player',type:'PLAYER',market,
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
   const raw=converted?tools.playerValue(outcome.player_id):pickPrice?.value??null;
   const market=converted&&tools.valuesReady&&raw===null?0:raw;
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
    impact:market+lineup*4,sent:0,net:null,returnPct:null};
  });
  // Evaluate what this manager received against what they SENT, using the
  // *recipient's* later outcome for outgoing assets. Counterparty attribution
  // preserves the correct cost basis in three- and four-manager trades.
  const ids=new Set(part.map(p=>p.id));
  const sourceComplete=part.every(p=>p.items.every(a=>ids.has(Number(a.asset.counterparty_franchise_id))&&
   Number(a.asset.counterparty_franchise_id)!==p.id));
  for(const p of part){
   p.sent=part.reduce((total,other)=>total+other.items
    .filter(a=>Number(a.asset.counterparty_franchise_id)===p.id)
    .reduce((n,a)=>n+(Number(a.market)||0)+a.points*4,0),0);
   p.net=p.impact-p.sent;
   p.returnPct=figTradeReturnPct(p.impact,p.sent);
  }
  // Unrecorded or unpriced draft picks still make a trade incomplete, but
  // catalog-missing players with a legitimate zero valuation do not.
  const rated=part.length>=2&&sourceComplete&&part.every(p=>p.complete);
  if(!rated)for(const p of part){p.net=null;p.returnPct=null;}
  return {id:String(t.transaction_id),season:String(t.season),week:Number(t.week),participants:part,
   rated,players:Number(t.total_player_assets)||0,picks:Number(t.total_pick_assets)||0,
   search:(String(t.owners_involved||'')+' '+part.map(p=>p.name+' '+p.items.map(x=>x.name+' '+(x.selection||'')).join(' ')).join(' ')).toLowerCase()};
 }).filter(t=>t.participants.length>=2)
 .sort((a,b)=>Number(b.season)-Number(a.season)||b.week-a.week||b.id.localeCompare(a.id));
 const names=new Map();
 for(const p of sides)names.set(+p.franchise_id,tools.name(p.owner_name,p.franchise_id));
 const rankings=[...names.entries()].map(([id,name])=>{
  const relevant=all.filter(t=>t.participants.some(p=>p.id===id));
  const graded=relevant.filter(t=>t.rated).flatMap(t=>t.participants.filter(p=>p.id===id));
  const gained=graded.reduce((n,p)=>n+p.impact,0),sent=graded.reduce((n,p)=>n+p.sent,0);
  const net=gained-sent,returnPct=graded.length?figTradeReturnPct(gained,sent):null;
  const wins=graded.filter(p=>p.net>0).length,losses=graded.filter(p=>p.net<0).length;
  const ties=graded.length-wins-losses;
  return {id,name,trades:relevant.length,rated:graded.length,gained,sent,net,returnPct,
   wins,losses,ties,provisional:graded.length<3};
 }).sort((a,b)=>Number(a.provisional)-Number(b.provisional)||
  (a.returnPct===b.returnPct?0:(a.returnPct===null?1:b.returnPct===null?-1:
   a.returnPct>b.returnPct?-1:1))||b.net-a.net||b.rated-a.rated||a.name.localeCompare(b.name));
 return {trades:all,rankings,years:[...new Set(all.map(t=>t.season))].sort((a,b)=>+b-+a),
   rated:all.filter(t=>t.rated).length};
}
function figTradeRatingsPage(model,helpers){
 const {html,el,escape,money,avatar,ownerLink}=helpers;
 let manager='all',versus='all',year='all',search='',sort='recent',limit=24;
 const managers=[...model.rankings].sort((a,b)=>a.name.localeCompare(b.name));
 const options=(selected,allowAll=true,exclude=null)=> (allowAll?'<option value="all">ALL MANAGERS</option>':'')+
  managers.filter(m=>m.id!==Number(exclude)).map(m=>'<option value="'+m.id+'"'+(String(m.id)===String(selected)?' selected':'')+'>'+escape(m.name)+'</option>').join('');
 const returnChip=(p,rated)=>!rated
  ?'<span class="fig-tr-grade pending">UNRATED</span>'
  :'<span class="fig-tr-grade '+(p.net>0?'positive':p.net<0?'negative':'even')+'"><strong>'+
    (p.returnPct===null?'0 NET':figTradeReturnLabel(p.returnPct))+'</strong></span>';
 const summaryAssets=p=>p.items.map(a=>escape(a.name)).join(' · ')||'No received assets';
 const compactSide=(p,rated)=>'<div class="fig-tr-compact-side"><div class="fig-tr-compact-person">'+
  '<span>'+avatar(p.id,'fig-tr-photo')+escape(p.name)+'</span>'+returnChip(p,rated)+'</div>'+
  '<div class="fig-tr-asset-preview">'+summaryAssets(p)+'</div></div>';
 const detailSide=(p,rated)=>'<div class="fig-tr-detail-side"><div class="fig-tr-detail-head">'+
  ownerLink(p.name,p.id)+returnChip(p,rated)+'</div><div class="fig-tr-detail-stats">'+
  '<span><b>'+money(p.market)+'</b><small>CURRENT VALUE</small></span>'+
  '<span><b>'+money(p.lineup)+'</b><small>LINEUP PTS · '+p.starts+' STARTS</small></span>'+
  '<span><b>'+money(p.sent)+'</b><small>SENT OUTCOME</small></span></div>'+
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
  '<div class="fig-tr-mini-matchup">'+t.participants.map(p=>compactSide(p,t.rated)).join('')+'</div>'+
  '<span class="fig-tr-chevron" aria-hidden="true">⌄</span></summary>'+
  '<div class="fig-tr-details">'+t.participants.map(p=>detailSide(p,t.rated)).join('')+'</div>'+
  (!t.rated?'<div class="fig-tr-unrated-note">Return unavailable: at least one side is missing assets, pick values, or sender information.</div>':
  '<div class="fig-tr-outcome-note">RETURN % = received outcome ÷ sent outcome × 100; 100% is even. Net return = received − sent. Both outcomes include current asset value plus 4× earned starting-lineup points. ∞% means assets sent have a zero outcome; 0 NET means both sides are zero.</div>')+
  '</details>';
 const rankRow=(m,i)=>'<button type="button" class="fig-tr-rank-row" data-manager="'+m.id+'">'+
  '<b class="fig-tr-rank-num">'+(m.provisional?'—':String(i+1))+'</b>'+
  avatar(m.id,'fig-tr-rank-avatar')+
  '<span class="fig-tr-rank-name"><strong>'+escape(m.name)+'</strong><small>'+m.rated+'/'+m.trades+
  ' rated · '+m.wins+'W '+m.losses+'L '+m.ties+'T'+(m.provisional?' · PROVISIONAL':'')+'</small></span>'+
  '<span class="fig-tr-rank-score">'+(m.rated?figTradeReturnLabel(m.returnPct):'—')+
  '<small>'+(m.rated?'NET '+(m.net>0?'+':'')+money(m.net):'UNRATED')+'</small></span></button>';
 const leaderboard='<section class="section fig-tr-leaderboard"><div class="section-head">'+
  '<h2 class="section-title">OVERALL TRADE RANKINGS</h2><div class="section-note">Total received ÷ total sent · minimum 3 trades for ranked</div></div>'+
  '<div class="fig-tr-rankings">'+model.rankings.map(rankRow).join('')+'</div>'+
  '</section>';
 html('tradeRatingsRoot','<div class="fig-tr-page">'+
  '<div class="fig-tr-stats"><div><small>COMPLETED TRADES</small><strong>'+model.trades.length+'</strong></div>'+
  '<div><small>RETURNS CALCULATED</small><strong>'+model.rated+'</strong></div>'+
  '<div><small>MANAGERS</small><strong>'+managers.length+'</strong></div></div>'+
  leaderboard+
  '<section class="section fig-tr-history" id="tradeRatingsHistory"><div class="section-head">'+
  '<h2 class="section-title">TRADE HISTORY</h2><div class="section-note">Select managers to compare every direct trade</div></div>'+
  '<div class="fig-tr-controls"><label>MANAGER<select id="figTrManager">'+options(manager)+'</select></label>'+
  '<label>WITH / AGAINST<select id="figTrVersus">'+options(versus)+'</select></label>'+
  '<label>YEAR<select id="figTrYear"><option value="all">ALL YEARS</option>'+model.years.map(y=>'<option value="'+escape(y)+'">'+escape(y)+'</option>').join('')+'</select></label>'+
  '<label>SORT<select id="figTrSort"><option value="recent">NEWEST</option><option value="oldest">OLDEST</option>'+
  '<option value="best">HIGHEST RETURN</option><option value="worst">LOWEST RETURN</option></select></label>'+
  '</div><div class="fig-tr-search-row"><input id="figTrSearch" class="search" type="search" placeholder="Search traded players, picks or managers…" autocomplete="off"><button id="figTrClear" type="button">RESET</button></div>'+
  '<div id="figTrResults"></div></section>'+
  '<details class="fig-tr-method section"><summary>HOW IS RETURN CALCULATED?</summary>'+
  '<p>Every trade has a numeric overall return, not a letter grade. Return % = (current value received + 4× subsequent lineup points from received players) ÷ (current value sent + 4× subsequent lineup points from those assets for their new teams) × 100. A 150% return means 50% more value received than sent. The leaderboard calculates each manager’s return from their combined totals, not an average of percentages; at least three complete trades are required to rank.</p>'+
  '<p>Players missing from the active RosterAudit catalog count as 0; missing player IDs also count as 0 when the valuation feed is available. A full feed outage is not treated as zero. Unpriced historical startup picks and incomplete transfers remain unranked. If no value was sent but value was received, return is ∞%; if both outcomes are zero, net return is 0.</p>'+
  '<p><strong>These are current-outcome returns, not historical trade-date prices.</strong> Player production is counted only after the transaction, stopping at a later recorded trade out; draft-pick outcomes are not credited to someone who subsequently traded the pick. Results change with RosterAudit updates.</p></details></div>');
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
    if(manager!=='all')return t.participants.find(p=>String(p.id)===manager)?.returnPct??null;
    const returns=t.participants.map(p=>p.returnPct).filter(x=>x!==null);
    return returns.length?(sort==='worst'?Math.min(...returns):Math.max(...returns)):null;
   };
   const as=metric(a),bs=metric(b);
   if(as===null)return bs===null?0:1;
   if(bs===null)return -1;
   return as===bs?0:sort==='best'?(as>bs?-1:1):(as<bs?-1:1);
  });
  const shown=list.slice(0,limit);
  const selectedPair=manager!=='all'&&versus!=='all'&&manager!==versus;
  // Head-to-head totals mirror the James/Hayden all-time summary, but any pair
  // can be selected and the results respond to year/search filters.
  const pairPanel=selectedPair&&list.length?'<div class="fig-tr-pair-board">'+[manager,versus].map(id=>{
    const rows=list.flatMap(t=>t.participants.filter(p=>String(p.id)===id));
    const n=rows.length,market=rows.reduce((v,p)=>v+p.market,0);
    const lineup=rows.reduce((v,p)=>v+p.lineup,0);
    const rated=rows.filter(p=>list.some(t=>t.rated&&t.participants.includes(p)));
    const got=rated.reduce((v,p)=>v+p.impact,0),sent=rated.reduce((v,p)=>v+p.sent,0);
    const totalReturn=rated.length?figTradeReturnPct(got,sent):null;
    const name=managers.find(p=>String(p.id)===id)?.name||id;
    return '<div class="fig-tr-pair-person">'+avatar(id,'fig-tr-rank-avatar')+
     '<div class="fig-tr-pair-name">'+escape(name)+'<small>'+n+' DIRECT TRADES</small></div>'+
     '<div class="fig-tr-pair-score">'+figTradeReturnLabel(totalReturn)+'<small>OVERALL RETURN</small></div>'+
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

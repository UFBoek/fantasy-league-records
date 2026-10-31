/* Trade Ratings v153 – allocate multi-team net outcomes across rival managers. */
function figTradeNetLabel(value,money){
 if(value===null||!Number.isFinite(value))return '–';
 return (value>0?'+':value<0?'−':'')+money(Math.abs(value));
}
// Allocate a trade's net value between its winning and losing managers.
// A three-team trade earns each winner credit against the manager(s) whose
// losses fund that gain. Proportional allocations are rounded to cents with
// balanced remainders, so every manager's pair credits sum to their trade net.
function figTradePairCredits(t){
 const pairs=new Map(), sides=new Set(t.participants.map(p=>p.id));
 const add=(a,b,cents,direct=false)=>{
  if(!sides.has(a)||!sides.has(b)||a===b)return;
  const aId=Math.min(a,b),bId=Math.max(a,b),key=aId+':'+bId;
  if(!pairs.has(key))pairs.set(key,{key,aId,bId,centsA:0,direct:false});
  const entry=pairs.get(key);
  entry.centsA+=(a===aId?cents:-cents);
  entry.direct ||=direct;
 };
 for(const receiver of t.participants)for(const item of receiver.items){
  const sender=Number(item.asset.counterparty_franchise_id);
  if(sides.has(sender)&&sender!==receiver.id)add(receiver.id,sender,0,true);
 }
 if(t.rated){
  const winners=t.participants.filter(p=>p.net>0)
   .map(p=>({id:p.id,cents:Math.round(p.net*100)}));
  const losers=t.participants.filter(p=>p.net<0)
   .map(p=>({id:p.id,cents:Math.round(-p.net*100)}));
  const total=winners.reduce((n,p)=>n+p.cents,0);
  const totalLost=losers.reduce((n,p)=>n+p.cents,0);
  if(total!==totalLost)throw Error('Unbalanced trade valuation: '+t.id);
  if(total>0){
   const cells=[];
   const rowLeft=winners.map(w=>w.cents),colLeft=losers.map(l=>l.cents);
   for(let i=0;i<winners.length;i++)for(let j=0;j<losers.length;j++){
    const ideal=winners[i].cents*losers[j].cents/total;
    const base=Math.floor(ideal);
    cells.push({i,j,cents:base,fraction:ideal-base});
    rowLeft[i]-=base;colLeft[j]-=base;
   }
   // Assign remainder cents to the best proportional matches. Both row and
   // column balances must reach zero, without any rounding drift.
   const ordered=[...cells].sort((a,b)=>b.fraction-a.fraction||
    winners[a.i].id-winners[b.i].id||losers[a.j].id-losers[b.j].id);
   while(rowLeft.some(n=>n>0)){
    const cell=ordered.find(x=>rowLeft[x.i]>0&&colLeft[x.j]>0);
    if(!cell)throw Error('Cannot balance trade allocations: '+t.id);
    cell.cents++;rowLeft[cell.i]--;colLeft[cell.j]--;
   }
   for(const cell of cells)if(cell.cents>0)
    add(winners[cell.i].id,losers[cell.j].id,cell.cents);
  }
 }
 return [...pairs.values()].map(p=>({
  key:p.key,aId:p.aId,bId:p.bId,netA:p.centsA/100,
  netB:-p.centsA/100,direct:p.direct
 }));
}
function figTradePartnerships(trades,names){
 const pairs=new Map();
 for(const t of trades)for(const allocation of figTradePairCredits(t)){
  let p=pairs.get(allocation.key);
  if(!p){p={key:allocation.key,aId:allocation.aId,bId:allocation.bId,
   centsA:0,trades:0,rated:0,directTrades:0};pairs.set(allocation.key,p);}
  p.trades++;
  if(allocation.direct)p.directTrades++;
  if(t.rated){p.rated++;p.centsA+=Math.round(allocation.netA*100);}
 }
 return [...pairs.values()].map(p=>({
  key:p.key,aId:p.aId,bId:p.bId,aName:names.get(p.aId)||String(p.aId),
  bName:names.get(p.bId)||String(p.bId),
  netA:p.centsA/100,netB:-p.centsA/100,
  trades:p.trades,rated:p.rated,directTrades:p.directTrades,
  provisional:p.rated===0
 })).sort((a,b)=>Number(a.provisional)-Number(b.provisional)||
  Math.abs(b.netA)-Math.abs(a.netA)||b.rated-a.rated||a.aName.localeCompare(b.aName));
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
    ?(tools.valuesReady?0:null)
    :(Number.isFinite(Number(raw))?Math.max(0,Number(raw)):0);
   return {name:a.player_name||a.asset_label||'Player',type:'PLAYER',market,
    basis:'Current player value',points:z.points,starts:z.starts,exit:Boolean(z.exit),asset:a};
  }
  if(a.asset_type==='Draft Pick'){
   if(String(t.transaction_id)==='997041669574823936'&&Number(id)===1&&
     Number(a.pick_season)===2024&&Number(a.pick_round)===1&&
     Number(a.original_pick_franchise_id)===10){
    return {name:tools.pickLabel(a.asset_label||'',a),type:'PICK',market:2265,
     basis:'Draft pick value',points:0,starts:0,asset:a};
   }
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
    priced:priced.length,total:items.length,complete:priced.length===items.length,
    sent:0,net:null};
  });
  // Compare current market value RECEIVED with current market value SENT.
  // Do not add lineup production to either side: those are fantasy points,
  // not dynasty asset value. Counterparty attribution handles multi-team trades.
  const ids=new Set(part.map(p=>p.id));
  const sourceComplete=part.every(p=>p.items.every(a=>ids.has(Number(a.asset.counterparty_franchise_id))&&
   Number(a.asset.counterparty_franchise_id)!==p.id));
  for(const p of part){
   p.sent=part.reduce((total,other)=>total+other.items
    .filter(a=>Number(a.asset.counterparty_franchise_id)===p.id)
    .reduce((n,a)=>n+(Number(a.market)||0),0),0);
   p.net=p.market-p.sent;
  }
  // A real, one-way trade may have zero Received assets on one side: that
  // manager received nothing (value 0), not a missing market valuation.
  // Require at least one actual transferred asset, two parties, attributable
  // senders and complete values on any assets that DO exist.
  const rated=part.length>=2&&part.some(p=>p.total>0)&&sourceComplete&&
   part.every(p=>p.complete);
  if(!rated)for(const p of part)p.net=null;
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
  const gained=graded.reduce((n,p)=>n+p.market,0),sent=graded.reduce((n,p)=>n+p.sent,0);
  const net=gained-sent;
  const wins=graded.filter(p=>p.net>0).length,losses=graded.filter(p=>p.net<0).length;
  const ties=graded.length-wins-losses;
  return {id,name,trades:relevant.length,rated:graded.length,gained,sent,net,
   wins,losses,ties,provisional:graded.length<3};
 }).sort((a,b)=>Number(a.provisional)-Number(b.provisional)||
  b.net-a.net||b.rated-a.rated||a.name.localeCompare(b.name));
 return {trades:all,rankings,partnerships:figTradePartnerships(all,names),years:[...new Set(all.map(t=>t.season))].sort((a,b)=>+b-+a),
   rated:all.filter(t=>t.rated).length};
}
function figTradeRatingsPage(model,helpers){
 const {html,el,escape,money,avatar,ownerLink}=helpers;
 let manager='all',versus='all',year='all',search='',sort='recent',limit=24;
 const managers=[...model.rankings].sort((a,b)=>a.name.localeCompare(b.name));
 const options=(selected,allowAll=true,exclude=null)=> (allowAll?'<option value="all">ALL MANAGERS</option>':'')+
  managers.filter(m=>m.id!==Number(exclude)).map(m=>'<option value="'+m.id+'"'+(String(m.id)===String(selected)?' selected':'')+'>'+escape(m.name)+'</option>').join('');
 const returnChip=(p,rated,matchCredit=null)=>{
  if(!rated)return '<span class="fig-tr-grade pending">UNRATED</span>';
  const net=matchCredit===null?p.net:matchCredit;
  const caption=(matchCredit!==null?'PAIR ':'')+(net>0?'GAINED':net<0?'LOST':'EVEN');
  return '<span class="fig-tr-grade '+(net>0?'positive':net<0?'negative':'even')+
   '"><strong>'+figTradeNetLabel(net,money)+'</strong><small>'+caption+'</small></span>';
 };
 const summaryAssets=p=>p.items.map(a=>escape(a.name)).join(' · ')||'No received assets';
 const compactSide=(p,rated,credit=null)=>'<div class="fig-tr-compact-side"><div class="fig-tr-compact-person">'+
  '<span>'+avatar(p.id,'fig-tr-photo')+escape(p.name)+'</span>'+returnChip(p,rated,credit)+'</div>'+
  '<div class="fig-tr-asset-preview">'+summaryAssets(p)+'</div></div>';
 const detailSide=(p,rated,credit=null)=>'<div class="fig-tr-detail-side"><div class="fig-tr-detail-head">'+
  ownerLink(p.name,p.id)+returnChip(p,rated,credit)+'</div><div class="fig-tr-detail-stats">'+
  '<span><b>'+money(p.market)+'</b><small>VALUE RECEIVED</small></span>'+
  '<span><b>'+money(p.sent)+'</b><small>VALUE SENT</small></span>'+
  '<span><b>'+money(p.lineup)+'</b><small>LINEUP PTS · '+p.starts+' STARTS</small></span></div>'+
  '<div class="fig-tr-items">'+(p.items.length?p.items.map(a=>'<div class="fig-tr-item">'+
   '<span class="fig-tr-type">'+escape(a.type)+'</span><div><b>'+escape(a.name)+'</b>'+
   (a.selection?'<small>Selected: '+escape(a.selection)+'</small>':'')+
   (a.transferred?'<small>Pick later transferred</small>':'')+
   (a.proxy?'<small>2027 pick comparable, not trade-date value</small>':'')+
   (a.type==='PLAYER'&&a.exit?'<small>Later traded away</small>':'')+
   '</div><div class="fig-tr-item-value">'+(a.market!==null?money(a.market):'UNVALUED')+
   (a.type==='PLAYER'?'<small>'+money(a.points)+' lineup pts</small>':'')+'</div></div>').join(''):
   '<div class="fig-tr-item fig-tr-no-assets">Nothing received · 0 value</div>')+'</div></div>';
 const card=(t,pairKey=null)=>{
  const pair=t.rated&&t.participants.length>2&&pairKey
   ?figTradePairCredits(t).find(entry=>entry.key===pairKey):null;
  const credited=p=>!pair?null:p.id===pair.aId?pair.netA:p.id===pair.bId?pair.netB:null;
  return '<details class="fig-tr-card"><summary class="fig-tr-summary">'+
   '<span class="fig-tr-trade-date">'+escape(t.season)+'<small>W'+t.week+' · '+t.participants.length+' TEAMS</small></span>'+
   '<div class="fig-tr-mini-matchup">'+t.participants.map(p=>compactSide(p,t.rated,credited(p))).join('')+'</div>'+
   '<span class="fig-tr-chevron" aria-hidden="true">⌄</span></summary>'+
   '<div class="fig-tr-details">'+t.participants.map(p=>detailSide(p,t.rated,credited(p))).join('')+'</div>'+
   (!t.rated?'<div class="fig-tr-unrated-note">Value unavailable: no assets were transferred, or an asset price or sender is missing.</div>':
   pair?'<div class="fig-tr-outcome-note">Pair credits allocate this three-team trade’s net outcome between the selected managers. The asset values above and any other manager’s badge reflect the full trade.</div>':
   '<div class="fig-tr-outcome-note">Net value = current received asset value − current sent asset value. Lineup points are shown separately and never added to value.</div>')+
   '</details>';
 };
 const rankRow=(m,i)=>'<button type="button" class="fig-tr-rank-row" data-manager="'+m.id+'">'+
  '<b class="fig-tr-rank-num">'+(m.provisional?'–':String(i+1))+'</b>'+
  avatar(m.id,'fig-tr-rank-avatar')+
  '<span class="fig-tr-rank-name"><strong>'+escape(m.name)+'</strong><small>'+m.rated+'/'+m.trades+
  ' rated · '+m.wins+'W '+m.losses+'L '+m.ties+'T'+(m.provisional?' · PROVISIONAL':'')+'</small></span>'+
  '<span class="fig-tr-rank-score '+(m.rated?(m.net>0?'positive':m.net<0?'negative':'even'):'pending')+'">'+
  (m.rated?figTradeNetLabel(m.net,money):'–')+
  '<small>'+(m.rated?(m.net>0?'VALUE GAINED':m.net<0?'VALUE LOST':'EVEN'):'UNRATED')+'</small></span></button>';
 const leaderboard='<section class="section fig-tr-leaderboard"><div class="section-head">'+
  '<h2 class="section-title">OVERALL TRADE RANKINGS</h2><div class="section-note">Total net value gained or lost · minimum 3 rated trades for ranking</div></div>'+
  '<div class="fig-tr-rankings">'+model.rankings.map(rankRow).join('')+'</div>'+
  '</section>';
 const pairNames=new Map(managers.map(m=>[m.id,m.name]));
 const directlyTraded=(t,a,b)=>figTradePairCredits(t).some(p=>
  p.key===[Math.min(Number(a),Number(b)),Math.max(Number(a),Number(b))].join(':'));
 const partnershipRow=(p,i)=>{
  const winner=p.netA>=0?p.aName:p.bName,loser=p.netA>=0?p.bName:p.aName;
  return '<button type="button" class="fig-tr-partnership-row" data-pair-a="'+p.aId+
   '" data-pair-b="'+p.bId+'"><b class="fig-tr-pair-rank">'+(i+1)+'</b>'+
   '<span class="fig-tr-partnership-names"><strong>'+escape(winner)+
   ' <span class="fig-tr-over">vs</span> '+escape(loser)+'</strong>'+
   '<small>'+p.trades+' SHARED '+(p.trades===1?'TRADE':'TRADES')+
   ' · '+p.rated+' VALUED</small></span>'+
   '<span class="fig-tr-partnership-gap">'+(p.rated?'+ '+money(Math.abs(p.netA)):'–')+
   '<small>'+(p.rated?p.netA===0?'EVEN':'NET ADVANTAGE':'UNRATED')+'</small></span></button>';
 };
 let partnershipsExpanded=false;
 html('tradeRatingsRoot','<div class="fig-tr-page">'+
  '<div class="fig-tr-stats"><div><small>COMPLETED TRADES</small><strong>'+model.trades.length+'</strong></div>'+
  '<div><small>TRADES VALUED</small><strong>'+model.rated+'</strong></div>'+
  '<div><small>MANAGERS</small><strong>'+managers.length+'</strong></div></div>'+
  leaderboard+
  '<section class="section fig-tr-partnerships"><div class="section-head">'+
  '<h2 class="section-title">MOST LOPSIDED PARTNERSHIPS</h2>'+
  '<div class="section-note">Net value gained by one manager from the other, including shared multi-team trades</div></div>'+
  '<div class="fig-tr-partnership-list" id="figTrPartnershipRows"></div>'+
  '<button class="fig-tr-partner-more" type="button" id="figTrPartnerMore"></button></section>'+
  '<section class="section fig-tr-history" id="tradeRatingsHistory"><div class="section-head">'+
  '<h2 class="section-title">TRADE HISTORY</h2><div class="section-note">Select managers to compare their shared trades</div></div>'+
  '<div class="fig-tr-controls"><label>MANAGER<select id="figTrManager">'+options(manager)+'</select></label>'+
  '<label>WITH / AGAINST<select id="figTrVersus">'+options(versus)+'</select></label>'+
  '<label>YEAR<select id="figTrYear"><option value="all">ALL YEARS</option>'+model.years.map(y=>'<option value="'+escape(y)+'">'+escape(y)+'</option>').join('')+'</select></label>'+
  '<label>SORT<select id="figTrSort"><option value="recent">NEWEST</option><option value="oldest">OLDEST</option>'+
  '<option value="gain">VALUE GAINED</option><option value="loss">VALUE LOST</option></select></label>'+
  '</div><div class="fig-tr-search-row"><input id="figTrSearch" class="search" type="search" placeholder="Search traded players, picks or managers…" autocomplete="off"><button id="figTrClear" type="button">RESET</button></div>'+
  '<div id="figTrResults"></div></section>'+
  '<details class="fig-tr-method section"><summary>HOW IS GAIN / LOSS CALCULATED?</summary>'+
  '<p>Net value = current market value of received assets minus current market value of sent assets, using the same RosterAudit valuations on both sides. Positive values are gains; negative values are losses. Lineup points are shown as separate context but never converted into dynasty value. Manager totals add together all valued trades; at least three are required for an official ranking.</p>'+
  '<p>If a trade sends assets one way for nothing in return, the empty receiving side is worth 0 and both managers are rated. Players missing from RosterAudit also count as 0 if the feed is available. A full provider outage is not treated as zero. Unpriced historical startup picks and incomplete transfers remain unranked.</p>'+
  '<p>Partnership credits always balance: winners in multi-team trades receive their net gains against the managers who lost value, split in proportion to those losses. Each opponent shows one mirrored gain/loss number, and every manager’s credited values sum to their full trade outcome.</p>'+
  '<p><strong>These use current market values, not historical trade-date prices.</strong> The separate lineup-point stat stops when a player is traded away; verified drafted picks can use the selected player’s current value.</p></details></div>');
 const root=el('#tradeRatingsRoot');
 const results=el('#figTrResults');
 const render=()=>{
  const managerBase=model.trades.filter(t=>
   (manager==='all'||t.participants.some(x=>String(x.id)===manager))&&
   (year==='all'||t.season===year)&&(!search||t.search.includes(search)));
  let list=managerBase.filter(t=>
   (versus==='all'||t.participants.some(x=>String(x.id)===versus))&&
   (manager==='all'||versus==='all'||(manager!==versus&&directlyTraded(t,manager,versus))));
  if(sort==='oldest')list=[...list].reverse();
  if(sort==='gain'||sort==='loss')list=[...list].sort((a,b)=>{
   // With all managers shown, use the largest gain or loss by one participant.
   // With a manager selected, use only that manager's gain/loss.
   const metric=t=>{
    if(!t.rated)return null;
    if(manager!=='all'){
     if(versus!=='all'&&manager!==versus){
      const credit=figTradePairCredits(t).find(p=>
       p.key===[Math.min(+manager,+versus),Math.max(+manager,+versus)].join(':'));
      return credit?(+manager===credit.aId?credit.netA:credit.netB):null;
     }
     return t.participants.find(p=>String(p.id)===manager)?.net??null;
    }
    const values=t.participants.map(p=>p.net).filter(x=>x!==null);
    return values.length?(sort==='loss'?Math.min(...values):Math.max(...values)):null;
   };
   const av=metric(a),bv=metric(b);
   if(av===null)return bv===null?0:1;
   if(bv===null)return -1;
   return sort==='gain'?bv-av:av-bv;
  });
  const shown=list.slice(0,limit);
  const selectedPair=manager!=='all'&&versus!=='all'&&manager!==versus;
  const pair=selectedPair?figTradePartnerships(list,pairNames)
   .find(p=>p.key===[Math.min(+manager,+versus),Math.max(+manager,+versus)].join(':')):null;
  const pairPanel=selectedPair&&pair?'<div class="fig-tr-pair-board">'+[manager,versus].map(id=>{
    const other=id===manager?versus:manager;
    const rows=list.filter(t=>t.rated).flatMap(t=>t.participants.filter(p=>String(p.id)===id));
    const received=rows.reduce((v,p)=>v+p.market,0);
    const sent=rows.reduce((v,p)=>v+p.sent,0);
    const lineup=rows.reduce((v,p)=>v+p.lineup,0);
    const totalNet=pair.rated?(Number(id)===pair.aId?pair.netA:pair.netB):null;
    const name=pairNames.get(Number(id))||id;
    return '<div class="fig-tr-pair-person">'+avatar(id,'fig-tr-rank-avatar')+
     '<div class="fig-tr-pair-name">'+escape(name)+'<small>'+pair.trades+' SHARED TRADES</small></div>'+
     '<div class="fig-tr-pair-score '+(totalNet>0?'positive':totalNet<0?'negative':'even')+'">'+
     figTradeNetLabel(totalNet,money)+'<small>'+
     (totalNet===null?'UNRATED':totalNet>0?'VALUE GAINED':totalNet<0?'VALUE LOST':'EVEN')+'</small></div>'+
     '<div class="fig-tr-pair-stats"><span>'+money(received)+' <small>VALUE RECEIVED</small></span>'+
     '<span>'+money(sent)+' <small>VALUE SENT</small></span>'+
     '<span>'+money(lineup)+' <small>LINEUP PTS</small></span></div></div>';
   }).join('')+
   (list.some(t=>t.participants.length>2)?'<div class="fig-tr-pair-explainer">The matchup total adds only the value credited against this opponent. Three-team credits split each winner’s gain across the managers who lost value; received and sent amounts show the whole trades.</div>':'')+
   '</div>':'';
  const managerBoard=manager!=='all'?(()=>{
   const name=pairNames.get(Number(manager))||manager;
   const against=figTradePartnerships(managerBase,pairNames);
   const rows=managers.filter(m=>String(m.id)!==manager).map(opp=>{
    const p=against.find(x=>x.aId===Number(manager)&&x.bId===opp.id||
      x.bId===Number(manager)&&x.aId===opp.id);
    const value=p&&p.rated?(p.aId===Number(manager)?p.netA:p.netB):null;
    const active=String(opp.id)===versus;
    return '<button type="button" class="fig-tr-opponent '+(active?'active':'')+
     '" data-opponent="'+opp.id+'">'+
     '<span class="fig-tr-opponent-head">'+avatar(opp.id,'fig-tr-photo')+
     '<strong>'+escape(opp.name)+'</strong></span>'+
     '<b class="'+(value>0?'positive':value<0?'negative':'even')+'">'+
     (p&&p.rated?figTradeNetLabel(value,money):'–')+'</b>'+
     '<small>'+(p?p.trades+' SHARED · '+p.rated+' VALUED':'NO SHARED TRADES')+'</small></button>';
   }).join('');
   return '<section class="fig-tr-manager-board"><div class="fig-tr-manager-head">'+
    '<div><strong>'+escape(name)+' · AGAINST EVERY MANAGER</strong>'+
    '<small>Select an opponent to view the matchup and its full trade history</small></div>'+
    '<button type="button" id="figTrAllOpponents">ALL TRADES</button></div>'+
    '<div class="fig-tr-opponent-grid">'+rows+'</div></section>';
  })():'';
  results.innerHTML='<div class="fig-tr-result-meta">'+list.length+' MATCHING TRADES · '+list.filter(t=>t.rated).length+' RATED</div>'+
   managerBoard+pairPanel+
   (shown.length?'<div class="fig-tr-list">'+shown.map(t=>card(t,selectedPair?[Math.min(+manager,+versus),Math.max(+manager,+versus)].join(':'):null)).join('')+'</div>':'<div class="fig-tr-empty">No trades match these filters.</div>')+
   (list.length>shown.length?'<button type="button" class="fig-tr-more" id="figTrMore">SHOW '+Math.min(24,list.length-shown.length)+' MORE →</button>':'');
  const more=el('#figTrMore');if(more)more.onclick=()=>{limit+=24;render()};
  const all=el('#figTrAllOpponents');
  if(all)all.onclick=()=>{versus='all';limit=24;el('#figTrVersus').value='all';render()};
  for(const btn of results.querySelectorAll('.fig-tr-opponent'))btn.onclick=()=>{
   versus=String(btn.dataset.opponent);limit=24;el('#figTrVersus').value=versus;render();
  };
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
 const renderPartnerships=()=>{
  const target=el('#figTrPartnershipRows'),more=el('#figTrPartnerMore');
  if(!target)return;
  const partnerships=(model.partnerships||[]).filter(p=>p.rated>0);
  const visible=partnershipsExpanded?partnerships:partnerships.slice(0,10);
  target.innerHTML=visible.map(partnershipRow).join('');
  if(more){
   more.textContent=partnershipsExpanded?'SHOW TOP 10':('VIEW ALL '+partnerships.length+' PARTNERSHIPS');
   more.hidden=partnerships.length<=10;
   more.onclick=()=>{partnershipsExpanded=!partnershipsExpanded;renderPartnerships()};
  }
  for(const row of target.querySelectorAll('.fig-tr-partnership-row'))row.onclick=()=>{
   manager=String(row.dataset.pairA);versus=String(row.dataset.pairB);
   year='all';search='';sort='recent';limit=24;
   el('#figTrManager').value=manager;el('#figTrVersus').value=versus;
   el('#figTrYear').value='all';el('#figTrSort').value='recent';
   if(input)input.value='';
   render();el('#tradeRatingsHistory')?.scrollIntoView?.({behavior:'smooth',block:'start'});
  };
 };
 renderPartnerships();
 for(const button of root.querySelectorAll('.fig-tr-rank-row'))button.onclick=()=>{
  manager=String(button.dataset.manager);versus='all';year='all';search='';sort='recent';limit=24;
  el('#figTrManager').value=manager;el('#figTrVersus').value='all';el('#figTrYear').value='all';el('#figTrSort').value='recent';
  if(input)input.value='';render();el('#tradeRatingsHistory')?.scrollIntoView?.({behavior:'smooth',block:'start'});
 };
 render();
}

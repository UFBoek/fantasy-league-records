/* FIG Manager Ratings v155 — draft + trade + completed-week lineup efficiency. */
(function(){
'use strict';
const weights={draft:.35,trade:.35,lineup:.20,waiver:.10};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const value=n=>Number.isFinite(Number(n))?Number(n):0;
const percent=n=>(100*n).toFixed(1)+'%';
function percentile(values,number){
 const sample=values.filter(Number.isFinite).sort((a,b)=>a-b);
 if(!sample.length||!Number.isFinite(number))return null;
 if(sample.length===1||sample[0]===sample[sample.length-1])return 50;
 const margin=1e-9;
 const below=sample.filter(x=>x<number-margin).length;
 const equal=sample.filter(x=>Math.abs(x-number)<=margin).length;
 return Math.round(clamp(1+99*(below+(equal-1)/2)/(sample.length-1),1,100));
}
function figManagerRatingModel(data,tradeModel,helpers){
 const drafts=(data.draftPicks||[]).filter(p=>String(p.draft_class||'').toLowerCase()==='rookie');
 const seasonSettings=new Map((data.leagueSettings||[]).map(s=>[Number(s.season),s]));
 const trades=new Map((tradeModel.rankings||[]).map(t=>[Number(t.id),t]));
 const waivers=new Map((helpers.waiver?.teams||[]).map(t=>[Number(t.id),t]));
 const ids=[...new Set([
  ...Object.keys(helpers.names||{}).map(Number),
  ...(data.rosterSeason||[]).map(r=>Number(r.franchise_id)),
  ...drafts.map(p=>Number(p.franchise_id)),
  ...trades.keys()
 ])].filter(id=>Number.isInteger(id)&&id>0).sort((a,b)=>a-b);
 const rows=ids.map(id=>{
  const picks=drafts.filter(p=>Number(p.franchise_id)===id);
  const grade=helpers.draftSummary(picks);
  const selected=picks.map(p=>({pick:p,grade:helpers.draftGrade(p)}))
   .filter(x=>x.grade&&x.grade.current!==null);
  // Real draft grades are the primary quality signal. Slot-weighted return
  // contributes less, so small late picks cannot dominate the grade.
  const gradePct=grade.score===null?null:grade.score/5*100;
  const returnPct=grade.ratio===null?null:100*clamp(grade.ratio/2.5,0,1);
  const draftRaw=gradePct===null?null:.75*gradePct+.25*returnPct;
  const trade=trades.get(id)||{id,net:0,wins:0,losses:0,ties:0,trades:0,rated:0};
  const waiver=waivers.get(id)||{uniqueAdds:[],top10Value:null,addedValue:null,adds:[]};
  // Total net asset value mirrors Trade Ratings. Trade outcomes supply
  // a smaller tie-breaker; asinh limits single outlier trade dominance.
  const tradeRaw=trade.rated?Math.asinh(value(trade.net)/9000)+
   .35*(value(trade.wins)-value(trade.losses))/trade.rated:null;
  const seasons=(data.rosterSeason||[]).filter(r=>Number(r.franchise_id)===id)
   .map(r=>{
    const y=Number(r.season),settings=seasonSettings.get(y),games=value(r.wins)+value(r.losses)+value(r.ties);
    let cfg={};
    try{cfg=JSON.parse(settings?.settings_json||'{}')}catch(_error){}
    const complete=settings?.status==='complete';
    // In an active season, Sleeper's season totals must represent only the
    // same fully scored weeks as the finalization counter. No live scoring.
    const safe=complete||(settings?.status==='in_season'&&games>0&&
     games===Number(cfg.last_scored_leg));
    const scored=Number(r.points_for_sleeper),possible=Number(r.max_pf);
    if(!safe||!Number.isFinite(scored)||!Number.isFinite(possible)||
       possible<=0||scored<0||scored>possible+.05||games<=0)return null;
    return {year:y,games,scored,possible,efficiency:scored/possible};
   }).filter(Boolean).sort((a,b)=>b.year-a.year);
  const actual=seasons.reduce((sum,s)=>sum+s.scored,0);
  const optimal=seasons.reduce((sum,s)=>sum+s.possible,0);
  const games=seasons.reduce((sum,s)=>sum+s.games,0);
  const lineup=optimal>0?actual/optimal:null;
  return {id,name:helpers.name(id),picks,grade,selected,draftRaw,tradeRaw,trade,waiver,waiverRaw:waiver.top10Value,
   seasons,actual,optimal,games,lineup};
 });
 for(const r of rows){
  r.draftScore=percentile(rows.map(x=>x.draftRaw),r.draftRaw);
  r.tradeScore=percentile(rows.map(x=>x.tradeRaw),r.tradeRaw);
  r.lineupScore=percentile(rows.map(x=>x.lineup),r.lineup);
  r.waiverScore=percentile(rows.map(x=>x.waiverRaw),r.waiverRaw);
  // A very small trade sample is not enough to earn an extreme rating.
  if(r.tradeScore!==null)r.tradeScore=Math.round(50+
   (r.tradeScore-50)*Math.min(1,r.trade.rated/3));
  const available=[r.draftScore,r.tradeScore,r.lineupScore,r.waiverScore].every(Number.isFinite);
  r.rating=available?Math.round(clamp(
   weights.draft*r.draftScore+weights.trade*r.tradeScore+
   weights.lineup*r.lineupScore+weights.waiver*r.waiverScore,1,100)):null;
  r.provisional=r.trade.rated<3;
 }
 rows.sort((a,b)=>(b.rating??-1)-(a.rating??-1)||
   (b.tradeScore??-1)-(a.tradeScore??-1)||
   (b.draftScore??-1)-(a.draftScore??-1)||a.id-b.id);
 let rank=0,previous=null;
 rows.forEach((r,index)=>{
  if(r.rating!==previous)rank=index+1;
  r.rank=r.rating===null?null:rank;
  previous=r.rating;
 });
 return {rows,weights,seasons:[...new Set(rows.flatMap(r=>r.seasons.map(s=>s.year)))].sort((a,b)=>b-a)};
}
function figManagerRatingsPage(model,helpers,managerId){
 const {el,html,escape,money,avatar}=helpers;
 const n=number=>number===null||number===undefined?'—':String(number);
 const signed=number=>(number>0?'+':number<0?'−':'')+money(Math.abs(number));
 const score=number=>number===null?'—':number+'/100';
 const p=number=>number===null?'—':percent(number);
 const card=(label,val,sub)=>'<div class="fig-mr-kpi"><span>'+label+'</span><strong>'+val+'</strong><small>'+sub+'</small></div>';
 const bars=r=>[
  ['DRAFT',r.draftScore,'#19a788'],
  ['TRADE',r.tradeScore,'#477ec5'],
  ['SIT / START',r.lineupScore,'#c49c39'],
  ['WAIVERS',r.waiverScore,'#986bad']
 ].map(([label,amount,tone])=>'<div class="fig-mr-bar-row"><span>'+label+'</span><div class="fig-mr-bar-track"><i style="width:'+(amount??0)+'%;background:'+tone+'"></i></div><strong>'+n(amount)+'</strong></div>').join('');
 const breakdown=r=>'<div class="fig-mr-breakdown">'+bars(r)+'</div>';
 const method='<details class="fig-mr-method"><summary>HOW MANAGER RATINGS WORK <span>⌄</span></summary>'+
  '<p><b>Draft 35%</b>: All rookie selections, using the existing S–F pick grades (75%) and capped slot-weighted value return (25%). 2023 startup picks are excluded, matching Draft Rankings.</p>'+
  '<p><b>Trade 35%</b>: Total net asset value gained or lost, from the existing Trade Ratings valuation and rated-trade win/loss record. A smaller sample of fewer than three rated trades is moderated toward the league average.</p>'+
  '<p><b>Sit / Start 20%</b>: Sleeper regular-season actual points divided by maximum possible points, across finalized weeks only. This is a points-capture percentage, not the percentage of weeks with a perfect lineup.</p>'+
  '<p><b>Waiver Value 10%</b>: Current value of the ten most valuable unique players added from free agency or waivers. Duplicate pickups only count once. Commissioner moves, trades and the 2023-12-17 restoration batch are excluded. Drops remain visible in team histories but are not subtracted from pickup value.</p>'+ 
  '<p>Each category is graded from 1–100 against the other managers in this league, then combined with the weights above. Scores are relative league ratings, not universal NFL fantasy-manager grades. Draft and trade values reflect the current RosterAudit snapshot and will change as player values change.</p></details>';
 const row=r=>'<a class="fig-mr-rank-row" href="#/manager/'+r.id+'">'+
  '<span class="fig-mr-place">'+(r.rank===null?'—':'#'+r.rank)+'</span>'+
  avatar(r.id,'fig-mr-avatar')+
  '<span class="fig-mr-manager"><b>'+escape(r.name)+'</b><small>'+r.grade.valued+' rookie picks · '+r.trade.rated+' rated trades'+
  (r.provisional?' · provisional trades':'')+'</small></span>'+
  '<span class="fig-mr-primary"><strong>'+n(r.rating)+'</strong><small>IQ / 100</small></span>'+
  '<span class="fig-mr-rank-components"><span><b>'+n(r.draftScore)+'</b><small>DRAFT</small></span>'+
  '<span><b>'+n(r.tradeScore)+'</b><small>TRADE</small></span>'+
  '<span><b>'+n(r.lineupScore)+'</b><small>LINEUP</small></span>'+ 
  '<span><b>'+n(r.waiverScore)+'</b><small>WAIVERS</small></span></span>'+
  '<span class="fig-mr-chevron">›</span></a>';
 const statList=(title,content)=>'<section class="fig-mr-panel"><h2>'+title+'</h2>'+content+'</section>';
 const team=model.rows.find(r=>r.id===Number(managerId));
 if(team){
  const head='<div class="fig-mr-profile-head"><a class="fig-mr-back" href="#/manager-ratings">← ALL MANAGER RATINGS</a>'+
   '<div class="fig-mr-profile-identity">'+avatar(team.id,'fig-mr-profile-avatar')+
   '<div><span>ALL-TIME MANAGER RATING</span><h2>'+escape(team.name)+'</h2><small>LEAGUE RANK '+(team.rank===null?'—':'#'+team.rank)+'</small></div>'+
   '<strong>'+n(team.rating)+'<small>/ 100</small></strong></div></div>';
  const details='<div class="fig-mr-profile-cols">'+
   statList('DRAFT RATING',card('DRAFT SCORE',score(team.draftScore),'35% OF MANAGER IQ')+
    card('ROOKIE RETURN',team.grade.ratio===null?'—':Math.round(team.grade.ratio*100)+'%',
     team.grade.valued+' / '+team.grade.eligible+' PICKS GRADED')+
    card('PICK GRADE',escape(team.grade.letter),'AVERAGE LETTER GRADE')+
    '<a class="fig-mr-panel-link" href="#/draft/team/'+team.id+'">FULL DRAFT BREAKDOWN →</a>')+
   statList('TRADE RATING',card('TRADE SCORE',score(team.tradeScore),'35% OF MANAGER IQ')+
    card('NET VALUE',signed(team.trade.net),team.trade.rated+' / '+team.trade.trades+' TRADES RATED')+
    card('TRADE RECORD',team.trade.wins+'W · '+team.trade.losses+'L · '+team.trade.ties+'T','VALUED OUTCOMES')+
    '<a class="fig-mr-panel-link" href="#/trades">FULL TRADE RATINGS →</a>')+
   statList('SIT / START',card('LINEUP SCORE',score(team.lineupScore),'20% OF MANAGER IQ')+
    card('POINTS CAPTURED',p(team.lineup),team.games+' COMPLETED REGULAR-SEASON WEEKS')+
    card('POINTS LEFT',money(team.optimal-team.actual),
      money(team.actual)+' OF '+money(team.optimal)+' POSSIBLE')+
    '<a class="fig-mr-panel-link" href="#/team/'+team.id+'">TEAM HISTORY →</a>')+
   statList('WAIVER VALUE',card('WAIVER SCORE',score(team.waiverScore),'10% OF MANAGER IQ')+
    card('TOP 10 PICKUPS',team.waiver.top10Value===null?'—':money(team.waiver.top10Value),'CURRENT ROSTERAUDIT VALUE')+
    card('UNIQUE ADDS',team.waiver.uniqueAdds.length,team.waiver.adds.length+' RECORDED MOVES')+
    '<a class="fig-mr-panel-link" href="#/team/'+team.id+'/waivers">WAIVER HISTORY →</a>')+'</div>';
  const years='<div class="fig-mr-year-list">'+team.seasons.map(s=>'<div class="fig-mr-year-row">'+
   '<b>'+s.year+'</b><span>'+s.games+' WEEKS</span><span>'+money(s.scored)+' / '+money(s.possible)+' PTS</span>'+
   '<strong>'+p(s.efficiency)+'</strong></div>').join('')+'</div>';
  const hits=team.selected.slice().sort((a,b)=>b.grade.delta-a.grade.delta).slice(0,4);
  const grades=hits.map(x=>'<a class="fig-mr-pick" href="#/player/'+encodeURIComponent(x.pick.player_id||'')+'">'+
    '<span><b>'+escape(x.pick.draft_full_name||x.pick.player_name||'Unknown')+'</b><small>'+
    escape(x.pick.draft_season)+' · R'+escape(x.pick.round)+'</small></span>'+
    '<strong>'+escape(x.grade.letter)+'</strong><span class="fig-mr-pick-gain">'+signed(x.grade.delta)+'</span></a>').join('');
  html('managerRatingsRoot','<div class="fig-mr-page">'+head+breakdown(team)+details+
   '<div class="fig-mr-extra">'+statList('LINEUP EFFICIENCY BY SEASON',years||'<p>No finalized weekly data.</p>')+
   statList('BEST ROOKIE PICK RETURNS',grades||'<p>No graded selections.</p>')+'</div>'+method+'</div>');
  return;
 }
 let sort='rating';
 const options=[['rating','OVERALL IQ'],['draftScore','DRAFT'],['tradeScore','TRADE'],['lineupScore','SIT / START'],['waiverScore','WAIVERS']];
 const render=()=>{
  const ordered=[...model.rows].sort((a,b)=>(b[sort]??-1)-(a[sort]??-1)||
    (b.rating??-1)-(a.rating??-1)||a.id-b.id);
  const target=el('#figMrRankings');
  if(target)target.innerHTML=ordered.map(row).join('');
  document.querySelectorAll('.fig-mr-sort').forEach(button=>{
   const active=button.dataset.sort===sort;
   button.classList.toggle('active',active);
   button.setAttribute('aria-pressed',String(active));
  });
 };
 html('managerRatingsRoot','<div class="fig-mr-page">'+
  '<div class="fig-mr-intro"><div><small>THE FIG MANAGER IQ INDEX</small><h2>ALL-TIME RANKINGS</h2></div>'+
  '<div class="fig-mr-weights"><span><b>35%</b> DRAFT</span><span><b>35%</b> TRADE</span><span><b>20%</b> SIT/START</span><span><b>10%</b> WAIVERS</span></div></div>'+
  '<div class="fig-mr-sortbar"><span>SORT BY</span>'+
  options.map(x=>'<button type="button" class="fig-mr-sort'+(x[0]===sort?' active':'')+
   '" data-sort="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'+
  '<div class="fig-mr-rankings" id="figMrRankings"></div>'+
  '<div class="fig-mr-footer">Tap a manager for their draft, trade, sit/start and waiver breakdowns. Only finalized regular-season weeks count toward lineup efficiency.</div>'+
  method+'</div>');
 document.querySelectorAll('.fig-mr-sort').forEach(button=>{
  button.addEventListener('click',()=>{sort=button.dataset.sort;render();});
 });
 render();
}
window.figManagerRatingModel=figManagerRatingModel;
window.figManagerRatingsPage=figManagerRatingsPage;
window.figManagerPercentile=percentile;
})();
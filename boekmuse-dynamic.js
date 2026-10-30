/* BoekMuse v2: model generates a new SELECT; D1 calculates and verifies the answer.
   This module replaces the legacy fixed-metric AI without removing historical pages. */
(function(root){
 'use strict';
 const ENDPOINT='https://boekmuse-sql-preview.fig-league-archive.workers.dev';
 const NAMES={1:'Boek',2:'Fru',3:'Fromm',4:'Sack',5:'Leyton',6:'Hayden',7:'Line',8:'Winston',9:'CamNol',10:'James'};
 let previous=null;
 const MAX_WAIT=55000;
 const isFollowup=q=>/^(?:and\b|what about\b|how about\b|of those\b|among them\b|now\b|which of them\b|for .* instead\b|same (?:thing|question)\b)/i.test(q.trim());
 function shown(k,v){
  if(v===null||v===undefined)return '—';
  if((k==='team_id'||k==='opponent_id')&&NAMES[Number(v)])return NAMES[Number(v)];
  if(typeof v==='number')return Number(v).toLocaleString('en-US',{maximumFractionDigits:3});
  return String(v);
 }
 function displayColumn(k){
  return k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
   .replace(/\bTd\b/g,'TD').replace(/\bPpg\b/g,'PPG').replace(/\bWr\b/g,'WR').replace(/\bQb\b/g,'QB');
 }
 function link(row){
  if(row.player_id)return '#/player/'+encodeURIComponent(row.player_id);
  if(row.team_id&&row.season)return '#/teamseason/'+Number(row.team_id)+'/'+Number(row.season);
  if(row.team_id)return '#/team/'+Number(row.team_id);
  if(row.opponent_id)return '#/team/'+Number(row.opponent_id);
  return '';
 }
 function resultToPage(data){
  const cols=data.columns||[],raw=data.rows||[];
  const one=raw.length===1&&cols.length===1?raw[0][cols[0]]:null;
  const summary=one!==null&&one!==undefined?shown(cols[0],one):
   String(raw.length)+' '+(raw.length===1?'matching result':'matching results');
  return {ok:true,title:data.title||'Verified league results',value:summary,
   context:data.understood||'Query across finalized league data',
   interpretation:{measure:data.title||'Custom SQL calculation',group:'Question-specific',
    team:'League history',scope:data.understood||'Published finalized games',
    method:'Calculated directly with a read-only SQL query against the published league database.'},
   columns:cols.map(displayColumn),
   rows:raw.map(r=>({values:cols.map(c=>shown(c,r[c])),href:link(r)})),
   sql:data.sql,note:'Computed by Cloudflare D1 using published league records. The AI generated a read-only query; the numbers come from database results.'};
 }
 async function ask(question){
  if(!ENDPOINT)return {ok:false,message:'Database connection not configured.'};
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),MAX_WAIT);
  const followup=isFollowup(question)&&previous?previous:null;
  try{
   const res=await fetch(ENDPOINT+'/query',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({question,previous:followup}),signal:controller.signal
   });
   const data=await res.json();
   if(!res.ok)return {ok:false,message:String(data.error||'The free database search is temporarily unavailable. Try again shortly.')};
   if(!data.ok)return {ok:false,message:String(data.message||'No trustworthy calculation available for this question.')};
   if(data.previous&&data.previous.sql)previous=data.previous;
   return resultToPage(data);
  }catch(e){
   return {ok:false,message:e?.name==='AbortError'?
    'This calculation took too long. Try a narrower season or question.':
    'The AI analytics service could not be reached. No estimated statistic was returned.'};
  }finally{clearTimeout(timeout);}
 }
 if(root.document)root.boekmuseDynamic={ask,clearContext:()=>{previous=null}};
 if(typeof module!=='undefined'&&module.exports)module.exports={ask,resultToPage,shown,isFollowup};
})(typeof window==='undefined'?globalThis:window);

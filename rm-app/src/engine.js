// Game engine: pure logic, no DOM.
var E = (function () {
'use strict';
var POS = ['LP','HK','TP','LK','BR','SH','FH','CE','WG','FB'];
var POSN = {LP:'Loosehead prop',HK:'Hooker',TP:'Tighthead prop',LK:'Lock',BR:'Back row',SH:'Scrum-half',FH:'Fly-half',CE:'Centre',WG:'Wing',FB:'Full-back'};
var SLOTS = ['LP','HK','TP','LK','LK','BR','BR','BR','SH','FH','WG','CE','CE','WG','FB','HK','LP','TP','LK','BR','SH','FH','WG'];
var ATTR = ['Sc','Li','Ta','Ca','Bd','Pa','Ha','Ki','Pc','St','Di','Gk'];
var ATTRN = {Sc:'Scrummaging',Li:'Lineout',Ta:'Tackling',Ca:'Carrying',Bd:'Breakdown',Pa:'Passing',Ha:'Handling',Ki:'Kicking',Pc:'Pace',St:'Stamina',Di:'Discipline',Gk:'Goal kicking'};
var PROF = {
 LP:[1,.3,.7,.7,.6,.3,.4,.1,.3,.6,.6,0], HK:[.9,1,.7,.7,.7,.4,.5,.1,.4,.7,.6,0], TP:[1,.3,.7,.6,.6,.3,.4,.1,.2,.6,.6,0],
 LK:[.7,1,.8,.7,.7,.4,.6,.1,.4,.8,.6,0], BR:[.5,.6,1,.9,1,.5,.6,.2,.6,.9,.6,0],
 SH:[0,0,.6,.4,.4,1,.9,.8,.7,.8,.7,.45], FH:[0,0,.6,.5,.3,1,.9,1,.6,.7,.7,.9], CE:[0,0,.9,.9,.5,.8,.8,.5,.7,.8,.7,.3],
 WG:[0,0,.6,.8,.3,.6,.8,.4,1,.8,.7,.15], FB:[0,0,.7,.7,.3,.7,.9,.9,.8,.8,.7,.5]};
var REL = {LP:{TP:.9,HK:.75},TP:{LP:.9,HK:.75},HK:{LP:.75,TP:.75,BR:.7},LK:{BR:.88},BR:{LK:.88,HK:.7},
 SH:{FH:.8,WG:.75},FH:{CE:.88,FB:.88,SH:.78},CE:{FH:.86,WG:.88,FB:.82},WG:{FB:.92,CE:.86},FB:{WG:.92,FH:.85,CE:.82}};
var CAP = 7800000, ROUNDS = 18, DEADLINE = 14, MAXSQUAD = 50;
var FIRST = ['Tom','Jack','Harry','Will','Ollie','Sam','Ben','Joe','Archie','George','Alfie','Charlie','Max','Dan','Josh','Luke','Freddie','Ethan','Callum','Rhys','Finn','Toby','Louis','Jake','Kai'];
var LAST = ['Hargreaves','Colby','Winstanley','Ibekwe','Penrose','Mallory','Thackeray','Oduya','Brightwell','Carrick','Dunmore','Eastwood','Fairburn','Garside','Holloway','Kessler','Lowther','Merrick','Northcote','Prewett','Quayle','Rowntree','Sefton','Tamati','Wardle'];
var MINDEPTH = {LP:3,HK:3,TP:3,LK:4,BR:6,SH:2,FH:2,CE:4,WG:4,FB:2};

function rng(G){ return function(){ G.seed = (G.seed + 0x6D2B79F5) | 0; var t = G.seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function clamp(x,a,b){ return x<a?a:x>b?b:x; }
function isFwd(pos){ return POS.indexOf(pos) < 5; }
function fam(p,slot){ if(p.pos===slot) return 1; var r = REL[p.pos] && REL[p.pos][slot]; if(r) return r; return isFwd(p.pos)===isFwd(slot) ? 0.7 : 0.5; }
function condF(c){ return 0.80 + 0.20*c/100; }
function formAvg(p){ if(!p.form.length) return 6.5; var s=0; for(var i=0;i<p.form.length;i++) s+=p.form[i]; return s/p.form.length; }
function formF(p){ return 1 + (formAvg(p)-6.5)*0.012; }
function avail(p){ return !p.inj && !p.susp; }
function club(id){ for(var i=0;i<CLUBS.length;i++) if(CLUBS[i].id===id) return CLUBS[i]; }
function squad(G,cid){ return G.players.filter(function(p){ return p.club===cid; }); }
function wageBill(G,cid){ return squad(G,cid).reduce(function(t,p){ return t+p.wage; },0); }
function value(p){ var v = 6000*Math.exp((p.ca-50)/7.2); var a=p.age; v *= a<=23?1.25:a<=28?1:a<=31?0.75:a<=33?0.5:0.3; if(p.contract<=2027) v*=0.8; return Math.round(v/5000)*5000; }
function baseWage(p){ return Math.round(18000*Math.exp((p.ca-50)/13)/1000)*1000; }

function addPlayer(G,R,o){
  var p = {id:G.players.length,n:o.n,pos:o.pos,age:o.age,ca:o.ca,club:o.club,at:{},cond:100,form:[],inj:0,susp:0,apps:0,tries:0,pts:0,rs:0,yc:0,rc:0,listed:false,acad:!!o.acad,contract:2027+Math.floor(R()*3),wage:0};
  var w = PROF[o.pos];
  ATTR.forEach(function(k,i){ p.at[k] = clamp(Math.round(o.ca/5*(0.42+0.62*w[i]) + (R()-0.5)*3),1,20); });
  if(o.pos==='FH'||o.pos==='FB'||o.pos==='SH'||o.pos==='CE') p.at.Gk = clamp(Math.round(p.at.Gk + (R()-0.5)*4),1,20);
  p.wage = baseWage(p); G.players.push(p); return p;
}
function genYouth(G,R,cid,pos){ return addPlayer(G,R,{n:FIRST[Math.floor(R()*FIRST.length)]+' '+LAST[Math.floor(R()*LAST.length)],pos:pos,age:18+Math.floor(R()*3),ca:56+Math.floor(R()*9),club:cid,acad:true}); }
function ensureDepth(G,R,cid,fitOnly){
  var sq = squad(G,cid), made=[];
  POS.forEach(function(pos){ var n = sq.filter(function(p){ return p.pos===pos && (!fitOnly||avail(p)); }).length; var need = fitOnly ? Math.max(1,MINDEPTH[pos]-2) : MINDEPTH[pos];
    for(;n<need;n++) made.push(genYouth(G,R,cid,pos)); });
  return made;
}

function effSlot(p,slot){ return p.ca*fam(p,slot)*condF(p.cond)*formF(p); }
function pickXV(G,cid){
  var pool = squad(G,cid).filter(avail), used = {}, sel = [];
  for(var k=0;k<23;k++) sel.push(null);
  var order = [1,8,9,0,2,3,4,5,6,7,14,10,13,11,12,15,16,17,20,18,19,21,22];
  order.forEach(function(i){ var best=null,bs=-1;
    pool.forEach(function(p){ if(used[p.id]) return; var s = effSlot(p,SLOTS[i]); if(p.pos===SLOTS[i]) s*=1.08; if(p.cond<72) s*=0.9; if(s>bs){ bs=s; best=p; } });
    if(best){ sel[i]=best.id; used[best.id]=1; } });
  return sel;
}
function selProblems(G,cid,sel){
  var out=[], seen={};
  if(!sel) return ['No team selected.'];
  for(var i=0;i<23;i++){ var id=sel[i];
    if(id==null){ if(i<15) out.push('No player at number '+(i+1)+'.'); continue; }
    var p=G.players[id];
    if(!p || p.club!==cid){ out.push('Number '+(i+1)+' is no longer at the club.'); continue; }
    if(seen[id]) out.push(p.n+' is picked twice.'); seen[id]=1;
    if(p.inj) out.push(p.n+' is injured.'); else if(p.susp) out.push(p.n+' is suspended.');
  }
  return out;
}
function xvStrength(G,cid){ var s=pickXV(G,cid),t=0,n=0; for(var i=0;i<15;i++) if(s[i]!=null){ t+=G.players[s[i]].ca; n++; } return n?t/n:0; }

function defaultTac(){ return {style:'bal',pens:'mix',def:'bal',tempo:'norm',kicker:null,autoSubs:true}; }

function newGame(userClub, mgr, seed){
  var G = {v:1,seed:seed|0,mgr:mgr||'Manager',user:userClub,players:[],clubs:{},round:0,phase:'league',news:[],offers:[],bids:[],bidSeq:1,fix:[],po:null,last:null,ledger:{gate:0,central:0,wages:0,costs:0,sales:0,buys:0,prize:0},champion:null};
  var R = rng(G);
  CLUBS.forEach(function(c){
    G.clubs[c.id] = {id:c.id,bal:0,tac:defaultTac(),sel:null,exp:'',t:{p:0,w:0,d:0,l:0,pf:0,pa:0,tf:0,tb:0,lb:0,pts:0}};
    POS.forEach(function(pos){ (c.squad[pos]||[]).forEach(function(s){ var a=s.split('|'); addPlayer(G,R,{n:a[0],pos:pos,ca:+a[1],age:+a[2],club:c.id}); }); });
    ensureDepth(G,R,c.id,false);
    var bill = wageBill(G,c.id); if(bill > CAP*0.96){ var f = CAP*0.96/bill; squad(G,c.id).forEach(function(p){ p.wage = Math.round(p.wage*f/1000)*1000; }); }
  });
  // strength ranking -> expectations, bank balance, AI tactics
  var rank = CLUBS.map(function(c){ return {id:c.id,s:xvStrength(G,c.id)}; }).sort(function(a,b){ return b.s-a.s; });
  rank.forEach(function(r,i){ var c=G.clubs[r.id]; c.rank=i+1;
    c.exp = i<2?'Reach the final':i<4?'Reach the play-offs':i<7?'Finish in the top six':'Avoid finishing bottom';
    c.bal = 900000 + Math.round((10-i)*90000 + club(r.id).cap*30);
    if(r.id!==userClub){ var q=R(); c.tac.style = q<0.3?'tight':q<0.65?'bal':'wide'; q=R(); c.tac.def = q<0.3?'blitz':q<0.7?'bal':'drift'; q=R(); c.tac.pens = q<0.25?'goal':q<0.75?'mix':'corner'; }
  });
  // AI clubs list a few fringe players
  CLUBS.forEach(function(c){ if(c.id===userClub) return; var sq=squad(G,c.id).filter(function(p){ return !p.acad; }).sort(function(a,b){ return a.ca-b.ca; }); for(var i=0;i<3&&i<sq.length;i++) if(R()<0.8) sq[i].listed=true; });
  // fixtures: circle method, double round robin
  var ids = CLUBS.map(function(c){ return c.id; });
  for(var i=ids.length-1;i>0;i--){ var j=Math.floor(R()*(i+1)); var t=ids[i]; ids[i]=ids[j]; ids[j]=t; }
  var n=ids.length, half=[];
  for(var r=0;r<n-1;r++){ var rd=[]; for(var k=0;k<n/2;k++){ var a=ids[k], b=ids[n-1-k]; rd.push((r+k)%2 ? {h:b,a:a,res:null} : {h:a,a:b,res:null}); } half.push(rd); ids.splice(1,0,ids.pop()); }
  G.fix = half.concat(half.map(function(rd){ return rd.map(function(f){ return {h:f.a,a:f.h,res:null}; }); }));
  G.clubs[userClub].sel = pickXV(G,userClub);
  news(G,'Welcome to '+club(userClub).name,'The board expects you to: '+G.clubs[userClub].exp.toLowerCase()+'. The salary cap is '+money(CAP)+' and the transfer deadline falls after round '+DEADLINE+'.');
  return G;
}
function money(v){ var s=v<0?'-':''; v=Math.abs(v); return s+'£'+(v>=1e6?(v/1e6).toFixed(2)+'m':v>=1000?Math.round(v/1000)+'k':v); }
function news(G,t,b){ G.news.unshift({r:roundLabel(G),t:t,b:b||''}); if(G.news.length>80) G.news.length=80; }
function roundLabel(G){ return G.phase==='league'?'Round '+(G.round+1):G.phase==='sf'?'Semi-finals':G.phase==='final'?'Final':'Season over'; }
function dateLabel(G){ if(G.phase==='sf') return '5 Jun 2027'; if(G.phase==='final') return '19 Jun 2027'; if(G.phase==='done') return 'June 2027';
  var d = new Date(Date.UTC(2026,8,26)); d.setUTCDate(d.getUTCDate() + G.round*7 + (G.round>=5?21:0) + (G.round>=10?28:0) + (G.round>=14?14:0));
  return d.getUTCDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]+' '+d.getUTCFullYear(); }

// ---------- match ----------
function newMatch(G,hid,aid,opt){
  opt = opt||{};
  var M = {h:hid,a:aid,min:0,log:[],done:false,ko:!!opt.ko,neutral:!!opt.neutral,stage:opt.stage||'league',cond:{},pr:{},sides:[],et:false,pk:null,ht:[0,0]};
  [hid,aid].forEach(function(cid){
    var c=G.clubs[cid], sel;
    if(cid===G.user && c.sel && !selProblems(G,cid,c.sel).length) sel=c.sel.slice(); else sel=pickXV(G,cid);
    var s={club:cid,xv:sel.slice(0,15),bench:sel.slice(15).filter(function(x){ return x!=null; }),tac:JSON.parse(JSON.stringify(c.tac)),score:0,tries:0,cons:0,pens:0,dgs:0,yc:0,rc:0,ev:0,subs:0,bin:[],start:sel.slice(0,15)};
    s.auto = cid!==G.user || !!s.tac.autoSubs;
    sel.forEach(function(id){ if(id!=null){ M.cond[id]=G.players[id].cond; M.pr[id]={mins:0,tr:0,pts:0,r:0,yc:0,rc:0,inj:0}; } });
    M.sides.push(s);
  });
  say(M,0,'info',-1,'Kick-off at '+(M.neutral?'Allianz Stadium, Twickenham':club(hid).ground)+'.');
  return M;
}
function say(M,m,k,s,t){ M.log.push({m:m,k:k,s:s,t:t}); }
function onPitch(G,M,si,i){ var s=M.sides[si], id=s.xv[i]; if(id==null) return null; for(var b=0;b<s.bin.length;b++) if(s.bin[b].slot===i) return null; return G.players[id]; }
function sideRat(G,M,si){
  var A=function(i,k){ var p=onPitch(G,M,si,i); return p ? p.at[k]*fam(p,SLOTS[i])*condF(M.cond[p.id])*formF(p) : 0; };
  var sum=function(idx,k){ var t=0; for(var j=0;j<idx.length;j++) t+=A(idx[j],k); return t; };
  var F=[0,1,2,3,4,5,6,7], B=[8,9,10,11,12,13,14], ALL=F.concat(B);
  return {
    scrum:(sum([0,1,2],'Sc')*3+sum([3,4],'Sc')*1.5+sum([5,6,7],'Sc')*0.67)/14*5,
    line:(A(1,'Li')*3+sum([3,4],'Li')*2+sum([5,6,7],'Li'))/10*5,
    bd:(sum([5,6,7],'Bd')*2+sum([0,1,2,3,4],'Bd')+sum([11,12],'Bd')*0.5)/12*5,
    fwd:(sum(F,'Ca')+sum(F,'St')*0.5)/12*5,
    back:(sum([8,9],'Pa')*1.5+sum([10,11,12,13,14],'Pa')*0.6+sum(B,'Ha')+sum([10,13,14],'Pc')*1.4+sum([11,12],'Ca')*1.3+A(9,'Ki')*0.8)/20.6*5,
    def:sum(ALL,'Ta')/15*5, kick:(A(8,'Ki')+A(9,'Ki')*2+A(14,'Ki'))/4*5, disc:sum(ALL,'Di')/15*5 };
}
function kicker(G,M,si){ var s=M.sides[si], best=null; for(var i=0;i<15;i++){ var p=onPitch(G,M,si,i); if(!p) continue; if(s.tac.kicker===p.id) return p; if(!best||p.at.Gk>best.at.Gk) best=p; } return best; }
function pickOn(G,M,si,R,wfn){ var c=[],tot=0; for(var i=0;i<15;i++){ var p=onPitch(G,M,si,i); if(!p) continue; var w=wfn(p,i); if(w>0){ c.push([p,i,w]); tot+=w; } } if(!c.length) return null; var x=R()*tot; for(var j=0;j<c.length;j++){ x-=c[j][2]; if(x<=0) return c[j]; } return c[c.length-1]; }
function doSub(G,M,si,slot,bi,forced){
  var s=M.sides[si], out=s.xv[slot], inn=s.bench[bi]; if(inn==null) return false;
  s.xv[slot]=inn; s.bench.splice(bi,1); if(!forced) s.subs++;
  say(M,M.min,'sub',si,'Substitution for '+club(s.club).name+': '+G.players[inn].n+' on'+(out!=null?' for '+G.players[out].n:'')+'.');
  return true;
}
function bestBench(G,M,si,slot){ var s=M.sides[si], bi=-1, bs=0; s.bench.forEach(function(id,i){ var p=G.players[id], v=p.ca*fam(p,SLOTS[slot]); if(v>bs){ bs=v; bi=i; } }); return bi; }
function aiSubs(G,M,si){
  var s=M.sides[si], done=0;
  for(var b=0;b<s.bench.length && done<2;b++){ var p=G.players[s.bench[b]], best=-1, bc=999;
    for(var i=0;i<15;i++){ var q=onPitch(G,M,si,i); if(!q||fam(p,SLOTS[i])<0.85) continue; var c=M.cond[q.id] + (q.ca-p.ca)*0.8; if(c<bc){ bc=c; best=i; } }
    if(best>=0 && (bc<74 || M.min>=62)){ doSub(G,M,si,best,b,false); b--; done++; } }
}
function addScore(M,si,pid,pts){ M.sides[si].score+=pts; if(pid!=null) M.pr[pid].pts+=pts; }
function tryScored(G,M,si,R,maul,txt){
  var s=M.sides[si], o=M.sides[1-si];
  var W=maul?[1,5,1,1.2,1.2,2,2,2.2,0,0,0,0,0,0,0]:[.5,1.2,.5,.6,.6,1.3,1.4,1.5,1.2,1,3,1.8,1.9,3,2.2];
  var c=pickOn(G,M,si,R,function(p,i){ return W[i]*(maul?1:(p.at.Pc+p.at.Ca)/24); }); if(!c) return;
  var p=c[0]; s.tries++; M.pr[p.id].tr++; addScore(M,si,p.id,5);
  say(M,M.min,'try',si,'TRY! '+txt.replace('%p',p.n).replace('%c',club(s.club).name)+' '+score(M));
  var k=kicker(G,M,si); if(!k) return;
  var wide = !maul && (c[1]===10||c[1]===13) ? 0.12 : 0;
  if(R() < clamp(0.47+0.022*k.at.Gk-wide+(R()-0.5)*0.1,0.2,0.97)){ s.cons++; addScore(M,si,k.id,2); say(M,M.min,'kick',si,k.n+' adds the conversion. '+score(M)); }
  else say(M,M.min,'info',si,k.n+' pulls the conversion wide.');
}
function score(M){ return '('+club(M.h).name+' '+M.sides[0].score+'-'+M.sides[1].score+' '+club(M.a).name+')'; }
function pick(R,a){ return a[Math.floor(R()*a.length)]; }

function stepMinute(G,M){
  if(M.done) return;
  var R=rng(G); M.min++; var m=M.min, si, i;
  for(si=0;si<2;si++){ var s=M.sides[si];
    for(i=s.bin.length-1;i>=0;i--) if(s.bin[i].until<=m){ say(M,m,'info',si,G.players[s.bin[i].pid].n+' returns from the sin bin.'); s.bin.splice(i,1); }
    var tf = s.tac.tempo==='fast'?1.15:s.tac.tempo==='slow'?0.9:1;
    for(i=0;i<15;i++){ var p=onPitch(G,M,si,i); if(!p) continue; M.pr[p.id].mins++; M.cond[p.id]=Math.max(20,M.cond[p.id]-(isFwd(p.pos)?0.5:0.4)*(1.3-p.at.St/40)*tf); }
    if(s.auto && m>=46 && m%4===0 && m<76 && s.subs<8) aiSubs(G,M,si);
  }
  var rt=[sideRat(G,M,0),sideRat(G,M,1)];
  var tempo = (M.sides[0].tac.tempo==='fast'?0.03:M.sides[0].tac.tempo==='slow'?-0.03:0)+(M.sides[1].tac.tempo==='fast'?0.03:M.sides[1].tac.tempo==='slow'?-0.03:0);
  if(R() < 0.56+tempo){
    var ctrl=function(r){ return 0.3*r.scrum+0.25*r.line+0.45*r.bd; };
    var pH = clamp(0.5+(M.neutral?0:0.035)+(ctrl(rt[0])-ctrl(rt[1]))/170,0.25,0.75);
    var a = R()<pH?0:1, d=1-a, A=M.sides[a], D=M.sides[d], ra=rt[a], rd=rt[d];
    A.ev++;
    var mix = A.tac.style==='tight'?0.7:A.tac.style==='wide'?0.3:0.5;
    var att = ra.fwd*mix+ra.back*(1-mix);
    var x = (att-rd.def-6)/26 + (a===0&&!M.neutral?0.06:0);
    var pTry = 0.158*Math.exp(x)*(A.tac.style==='wide'?1.07:A.tac.style==='tight'?0.94:1)*(D.tac.def==='blitz'?0.93:D.tac.def==='drift'?1.03:1);
    var pPen = 0.12*(D.tac.def==='blitz'?1.2:D.tac.def==='drift'?0.9:1)*(A.tac.style==='tight'?1.15:1)*clamp(1.6-rd.disc/110,0.7,1.3);
    var an=club(A.club).name, dn=club(D.club).name, q=R();
    if(q<pTry){
      var c=pickOn(G,M,a,R,function(p,i){ return i>=8?1:0.3; });
      tryScored(G,M,a,R,false,pick(R,['%p finishes a sweeping move for %c.','%p crashes over from close range.','%p goes over in the corner after quick hands from %c.','%p breaks the line and runs it in.','%p dots down after sustained %c pressure.','%p is on the end of a clever kick through.']));
    } else if(q<pTry+pPen){
      var off=pickOn(G,M,d,R,function(p){ return 21-p.at.Di; });
      var yq=R(), carded=false;
      if(off && yq<0.012){ carded=true; D.rc++; M.pr[off[0].id].rc=1; D.xv[off[1]]=null; say(M,m,'card',d,'RED CARD! '+off[0].n+' ('+dn+') is sent off for a dangerous tackle.'); }
      else if(off && yq<0.012+0.115*(D.tac.def==='blitz'?1.2:1)){ carded=true; D.yc++; M.pr[off[0].id].yc++; D.bin.push({slot:off[1],until:m+10,pid:off[0].id}); say(M,m,'card',d,'Yellow card! '+off[0].n+' ('+dn+') goes to the sin bin for ten minutes.'); }
      var k=kicker(G,M,a), diff=A.score-D.score;
      var pg = A.tac.pens==='goal'?0.85:A.tac.pens==='corner'?0.12:0.45;
      if(m>=70 && diff<-3 && diff>=-8) pg=0.1; if(m>=70 && diff>=-3 && diff<=0) pg=0.95; if(carded) pg*=0.6;
      if(k && R()<pg){
        if(R() < clamp(0.50+0.021*k.at.Gk+(R()-0.5)*0.25,0.2,0.96)){ A.pens++; addScore(M,a,k.id,3); say(M,m,'kick',a,'Penalty to '+an+'. '+k.n+' kicks the three points. '+score(M)); }
        else say(M,m,'info',a,'Penalty to '+an+', but '+k.n+' pushes the kick wide.');
      } else {
        if(R() < clamp(0.84+(ra.line-rd.line)/160,0.55,0.96)){
          if(R() < 0.30*Math.exp((ra.fwd-(rd.def+rd.scrum)/2-4)/26)) tryScored(G,M,a,R,true,'%c kick to the corner, the maul rumbles over and %p touches down.');
          else say(M,m,'info',a,an+' kick to the corner and drive the maul, but '+dn+' hold them up.');
        } else say(M,m,'info',d,an+' go to the corner but '+dn+' steal the lineout.');
      }
    } else if(q<pTry+pPen+0.0015*ra.kick/75){
      var fh=onPitch(G,M,a,9)||kicker(G,M,a); if(fh){ A.dgs++; addScore(M,a,fh.id,3); say(M,m,'kick',a,'Drop goal! '+fh.n+' slots it for '+an+'. '+score(M)); }
    } else if(q<pTry+pPen+0.012){
      var hs=R()<0.5?0:1, h=pickOn(G,M,hs,R,function(){ return 1; });
      if(h){ var wk=1+Math.min(20,Math.floor(-Math.log(1-R())*3)); M.pr[h[0].id].inj=wk; say(M,m,'card',hs,'Injury: '+h[0].n+' ('+club(M.sides[hs].club).name+') cannot continue.');
        var bi=bestBench(G,M,hs,h[1]); if(bi>=0) doSub(G,M,hs,h[1],bi,true); else M.sides[hs].xv[h[1]]=null; }
    } else if(R()<0.42){
      var pa=onPitch(G,M,a,Math.floor(R()*15)), pd=onPitch(G,M,d,Math.floor(R()*15));
      var L=[];
      if(pa) L.push(pa.n+' makes a break for '+an+' but the cover defence gets across.', pa.n+' knocks on with the line in sight.', an+' go through the phases in the '+dn+' 22.', pa.n+' puts up a high ball and '+an+' chase hard.');
      if(pd) L.push('Turnover! '+pd.n+' gets over the ball and wins it back for '+dn+'.', 'Big tackle from '+pd.n+' stops the '+an+' attack.', pd.n+' clears to touch for '+dn+'.');
      L.push(ra.scrum>rd.scrum+3?an+' win a scrum against the head.':'Scrum reset. The referee has a word with both front rows.', ra.line>rd.line?an+' take clean lineout ball and set the maul.':dn+' disrupt the '+an+' lineout.');
      say(M,m,'info',a,pick(R,L));
    }
  }
  if(m===40){ M.ht=[M.sides[0].score,M.sides[1].score]; say(M,m,'ht',-1,'Half-time: '+score(M)); }
  var end = M.et?100:80;
  if(m>=end){
    var s0=M.sides[0].score, s1=M.sides[1].score;
    if(M.ko && s0===s1 && !M.et){ M.et=true; say(M,m,'ht',-1,'Level after 80 minutes. Extra time will be played.'); return; }
    if(M.ko && s0===s1){ M.pk = M.sides[0].tries!==M.sides[1].tries ? (M.sides[0].tries>M.sides[1].tries?0:1) : (R()<0.5?0:1); say(M,m,'info',-1,'Still level. '+club(M.sides[M.pk].club).name+' go through '+(M.sides[0].tries!==M.sides[1].tries?'on tries scored.':'after a place-kicking competition.')); }
    M.done=true; say(M,m,'ft',-1,'Full-time: '+score(M)); rateMatch(G,M,R);
  }
}
function rateMatch(G,M,R){
  for(var si=0;si<2;si++){ var s=M.sides[si], marg=clamp(s.score-M.sides[1-si].score,-25,25), ids=Object.keys(M.pr), avg=0, n=0;
    ids.forEach(function(id){ var p=G.players[id]; if(p.club===s.club && M.pr[id].mins>0){ avg+=p.ca; n++; } }); avg = n?avg/n:75;
    ids.forEach(function(id){ var p=G.players[id], r=M.pr[id]; if(p.club!==s.club || !r.mins) return;
      r.r = Math.round(clamp(6.2+marg/25*0.9+(R()-0.5)*1.8+r.tr*0.6+(r.pts-r.tr*5)*0.05-r.yc*0.7-r.rc*1.5+(p.ca-avg)/22,3,10)*10)/10; });
  }
}
function playOut(G,M){ var guard=0; while(!M.done && guard++<200) stepMinute(G,M); return M; }
function winner(M){ var a=M.sides[0].score,b=M.sides[1].score; return a>b?0:b>a?1:(M.pk==null?-1:M.pk); }

// ---------- season ----------
function curFixtures(G){ return G.phase==='league'?G.fix[G.round]:G.phase==='sf'?G.po.sf:G.phase==='final'?[G.po.final]:[]; }
function userFixture(G){ var f=curFixtures(G); for(var i=0;i<f.length;i++) if(!f[i].res && (f[i].h===G.user||f[i].a===G.user)) return f[i]; return null; }
function matchFor(G,f){ return newMatch(G,f.h,f.a,{ko:G.phase!=='league',neutral:G.phase==='final',stage:G.phase}); }
function record(G,f,M){
  var s0=M.sides[0], s1=M.sides[1], w=winner(M);
  f.res={hs:s0.score,as:s1.score,ht:s0.tries,at:s1.tries,pk:M.pk,w:w};
  if(M.stage==='league'){
    [[s0,s1,0],[s1,s0,1]].forEach(function(x){ var t=G.clubs[x[0].club].t, me=x[0].score, op=x[1].score; t.p++; t.pf+=me; t.pa+=op; t.tf+=x[0].tries;
      if(me>op){ t.w++; t.pts+=4; } else if(me===op){ t.d++; t.pts+=2; } else { t.l++; if(op-me<=7){ t.lb++; t.pts++; } }
      if(x[0].tries>=4){ t.tb++; t.pts++; } });
  }
  Object.keys(M.pr).forEach(function(id){ var p=G.players[id], r=M.pr[id]; if(!r.mins) return;
    p.apps++; p.tries+=r.tr; p.pts+=r.pts; p.rs+=r.r; p.yc+=r.yc; p.rc+=r.rc; p.cond=Math.round(M.cond[id]); p.form.push(r.r); if(p.form.length>5) p.form.shift();
    if(r.inj){ p.inj=r.inj; if(p.club===G.user) news(G,p.n+' injured','Out for about '+r.inj+' week'+(r.inj>1?'s':'')+'.'); }
    if(r.rc){ p.susp=2+Math.floor((G.seed>>>3)%3); if(p.club===G.user) news(G,p.n+' suspended','Banned for '+p.susp+' matches after his red card.'); }
  });
  if(f.h===G.user && !M.neutral){ var c=club(f.h), t2=G.clubs[f.h], pos=standings(G).map(function(x){ return x.id; }).indexOf(f.h);
    var att=Math.round(c.cap*clamp(0.68+(9-pos)*0.03+(M.stage!=='league'?0.15:0),0.5,1)), gate=att*34; t2.bal+=gate; G.ledger.gate+=gate; f.res.att=att; }
}
function standings(G){ return CLUBS.map(function(c){ var t=G.clubs[c.id].t; return {id:c.id,t:t,diff:t.pf-t.pa}; }).sort(function(a,b){ return b.t.pts-a.t.pts || b.t.w-a.t.w || b.diff-a.diff || b.t.pf-a.t.pf || (a.id<b.id?-1:1); }); }
function simOthers(G){ curFixtures(G).forEach(function(f){ if(!f.res) record(G,f,playOut(G,matchFor(G,f))); }); }

function transferTo(G,p,to,fee,wage){
  var from=p.club; p.club=to; p.listed=false; if(wage) p.wage=wage; p.contract=2029;
  [from,to].forEach(function(cid){ var c=G.clubs[cid]; if(c.sel) c.sel=c.sel.map(function(id){ return id===p.id?null:id; }); if(c.tac.kicker===p.id) c.tac.kicker=null; });
  if(from===G.user){ G.clubs[from].bal+=fee; G.ledger.sales+=fee; }
  if(to===G.user){ G.clubs[to].bal-=fee; G.ledger.buys+=fee; }
  G.offers=G.offers.filter(function(o){ return o.pid!==p.id||o.status!=='pending'; }); G.bids=G.bids.filter(function(b){ return b.pid!==p.id; });
}
function askPrice(G,p){ var sel=pickXV(G,p.club), i=sel.indexOf(p.id); var f = i>=0&&i<15?1.6:i>=15?1.25:1.05; if(p.listed) f=0.7; return value(p)*f; }
function windowOpen(G){ return G.phase==='league' && G.round<DEADLINE; }
function makeOffer(G,pid,fee,wage){
  var p=G.players[pid]; if(!windowOpen(G)) return 'The transfer deadline has passed.';
  if(p.club===G.user) return 'He already plays for you.';
  if(G.offers.some(function(o){ return o.pid===pid&&o.status==='pending'; })) return 'You already have an offer in for him.';
  if(fee>G.clubs[G.user].bal) return 'You cannot afford that fee.';
  G.offers.unshift({pid:pid,fee:fee,wage:wage,status:'pending',msg:'Awaiting a reply.'}); return '';
}
function processOffers(G,R){
  G.offers.forEach(function(o){ if(o.status!=='pending') return; var p=G.players[o.pid], cn=club(p.club).name, u=G.clubs[G.user];
    var fail=function(m){ o.status='rejected'; o.msg=m; news(G,'Offer for '+p.n+' turned down',m); };
    if(!windowOpen(G)) return fail('The transfer deadline has passed.');
    var ask=askPrice(G,p)*(0.95+R()*0.15);
    if(o.fee<ask*0.8) return fail(cn+' called the bid derisory.');
    if(o.fee<ask) return fail(cn+' want around '+money(Math.ceil(ask/10000)*10000)+'.');
    if(o.wage<p.wage*1.05) return fail(cn+' accepted the fee, but '+p.n+' wants at least '+money(Math.ceil(p.wage*1.05/1000)*1000)+' a year.');
    if(o.fee>u.bal) return fail('The deal collapsed: you can no longer afford the fee.');
    if(wageBill(G,G.user)+o.wage>CAP) return fail('The deal collapsed: his wages would take you over the salary cap.');
    if(squad(G,G.user).length>=MAXSQUAD) return fail('The deal collapsed: your squad is full ('+MAXSQUAD+').');
    var from=p.club; transferTo(G,p,G.user,o.fee,o.wage); o.status='accepted'; o.msg='Signed.'; ensureDepth(G,R,from,false);
    news(G,p.n+' signs','He joins from '+cn+' for '+money(o.fee)+' on '+money(o.wage)+' a year.');
  });
  if(G.offers.length>25) G.offers.length=25;
}
function makeBids(G,R){
  G.bids=G.bids.filter(function(b){ return --b.ttl>0; });
  if(!windowOpen(G)) return;
  var mine=squad(G,G.user), others=CLUBS.filter(function(c){ return c.id!==G.user; });
  var bid=function(p,mult){ if(G.bids.some(function(b){ return b.pid===p.id; })) return;
    var c=pick(R,others); if(wageBill(G,c.id)+p.wage>CAP || squad(G,c.id).length>=MAXSQUAD-2) return;
    var fee=Math.round(value(p)*mult/5000)*5000; G.bids.push({id:G.bidSeq++,pid:p.id,from:c.id,fee:fee,ttl:3});
    news(G,c.name+' bid for '+p.n,'They have offered '+money(fee)+'. Answer it on the Transfers screen.'); };
  mine.forEach(function(p){ if(p.listed && R()<0.4) bid(p,0.75+R()*0.4); });
  if(R()<0.07){ var stars=mine.filter(function(p){ return p.ca>=78&&!p.listed; }); if(stars.length) bid(pick(R,stars),1.2+R()*0.4); }
}
function acceptBid(G,id){ var b=G.bids.filter(function(x){ return x.id===id; })[0]; if(!b) return; var p=G.players[b.pid]; transferTo(G,p,b.from,b.fee,0); news(G,p.n+' sold','He joins '+club(b.from).name+' for '+money(b.fee)+'.'); ensureDepth(G,rng(G),G.user,false); }
function rejectBid(G,id){ G.bids=G.bids.filter(function(x){ return x.id!==id; }); }

function weekTick(G){
  var R=rng(G), u=G.clubs[G.user];
  G.players.forEach(function(p){ p.cond=Math.min(100,Math.round(p.cond+28+p.at.St*0.6)); if(p.inj){ p.inj--; if(!p.inj && p.club===G.user) news(G,p.n+' fit again','He is available for selection.'); } else if(R()<0.004){ p.inj=1+Math.floor(R()*4); if(p.club===G.user) news(G,p.n+' hurt in training','Out for about '+p.inj+' week'+(p.inj>1?'s':'')+'.'); }
    if(p.susp) p.susp--; });
  var w=Math.round(wageBill(G,G.user)/20), costs=140000, central=255000;
  u.bal+=central-w-costs; G.ledger.central+=central; G.ledger.wages+=w; G.ledger.costs+=costs;
  processOffers(G,R); makeBids(G,R);
  CLUBS.forEach(function(c){ ensureDepth(G,R,c.id,true); });
}
// Call after every fixture in the current stage has a result.
function advance(G){
  if(G.phase==='league'){
    G.round++;
    if(G.round>=ROUNDS){ var st=standings(G); G.phase='sf'; G.po={sf:[{h:st[0].id,a:st[3].id,res:null},{h:st[1].id,a:st[2].id,res:null}],final:null};
      news(G,'The play-offs are set',club(st[0].id).name+' v '+club(st[3].id).name+' and '+club(st[1].id).name+' v '+club(st[2].id).name+'.'); }
  } else if(G.phase==='sf'){
    var w=G.po.sf.map(function(f){ return f.res.w===0?f.h:f.a; }); G.po.final={h:w[0],a:w[1],res:null}; G.phase='final';
    news(G,'The final',club(w[0]).name+' will meet '+club(w[1]).name+' at Twickenham.');
  } else if(G.phase==='final'){
    var f=G.po.final; G.champion=f.res.w===0?f.h:f.a; G.phase='done'; seasonEnd(G); return;
  }
  weekTick(G);
}
function seasonEnd(G){
  var st=standings(G), pos=st.map(function(x){ return x.id; }).indexOf(G.user)+1, u=G.clubs[G.user];
  var inFinal=G.po.final.h===G.user||G.po.final.a===G.user, champ=G.champion===G.user;
  var met = u.rank<=2?inFinal:u.rank<=4?pos<=4:u.rank<=7?pos<=6:pos<=9;
  var prize = champ?600000:inFinal?350000:pos<=4?200000:(11-pos)*15000; u.bal+=prize; G.ledger.prize+=prize;
  G.verdict={pos:pos,champ:champ,inFinal:inFinal,met:met,
    text: champ?'Champions of England. The board is delighted.':met?'The board is satisfied: you met its target ('+u.exp.toLowerCase()+').':'The board is disappointed: the target was to '+u.exp.toLowerCase()+'.'};
  news(G,club(G.champion).name+' are champions','The season is over. '+G.verdict.text);
}
function leaders(G,key,n){ var a=G.players.filter(function(p){ return p.apps>0; });
  if(key==='avg') a=a.filter(function(p){ return p.apps>=Math.max(1,Math.floor(G.round/2)); }).sort(function(x,y){ return y.rs/y.apps-x.rs/x.apps; }); else a.sort(function(x,y){ return y[key]-x[key]; });
  return a.slice(0,n); }

return {POS:POS,POSN:POSN,SLOTS:SLOTS,ATTR:ATTR,ATTRN:ATTRN,CAP:CAP,ROUNDS:ROUNDS,DEADLINE:DEADLINE,MAXSQUAD:MAXSQUAD,rng:rng,club:club,squad:squad,wageBill:wageBill,value:value,fam:fam,effSlot:effSlot,avail:avail,formAvg:formAvg,
  pickXV:pickXV,selProblems:selProblems,xvStrength:xvStrength,newGame:newGame,money:money,roundLabel:roundLabel,dateLabel:dateLabel,newMatch:newMatch,stepMinute:stepMinute,playOut:playOut,doSub:doSub,onPitch:onPitch,winner:winner,
  curFixtures:curFixtures,userFixture:userFixture,matchFor:matchFor,record:record,standings:standings,simOthers:simOthers,advance:advance,makeOffer:makeOffer,askPrice:askPrice,windowOpen:windowOpen,acceptBid:acceptBid,rejectBid:rejectBid,leaders:leaders,kicker:kicker};
})();
if (typeof module !== 'undefined') module.exports = E;

(() => {
  const altCanvas = document.querySelector('#altGame');
  const actx = altCanvas.getContext('2d');
  const modeTabs = [...document.querySelectorAll('.modeTab')];
  const eventFeed = document.querySelector('#eventFeed');
  const courseTitle = document.querySelector('#courseTitle');
  const courseSub = document.querySelector('#courseSub');
  const courseLegend = document.querySelector('#courseLegend');
  const gameSub = document.querySelector('#gameSub');
  const arenaTitleText = document.querySelector('#arenaTitleText');

  let mode = 'pinball';
  let altRunning = false;
  let altCounting = false;
  let altRaf = 0;
  let altLast = 0;
  let altT0 = 0;
  let altW = 900;
  let altH = 720;
  let altDpr = 1;
  let state = null;
  let lastEventUntil = 0;

  const modeInfo = {
    pinball: {
      title: '코스 구성', sub: '순위 역전형 코스', game: '1등 당첨', status: '대기 중 · 1등 당첨', arena: 'PINBALL LONG ARENA',
      legend: [['#f8be5c','Y','Y자 갈림길'],['#f082bd','↻','대형 회전문'],['#47c999','◉','강력 원형 범퍼'],['#ff97bf','⌁','자동 플리퍼'],['#76cdff','Ⅳ','4갈래 슬롯'],['#ffd777','⇆','움직이는 깔때기']]
    },
    battle: {
      title: '배틀로얄 규칙', sub: '보이는 펀치 · 폭탄 · 보호막', game: '마지막 생존자가 1등', status: '대기 중 · BATTLE ROYALE', arena: 'BOXING BATTLE ROYALE',
      legend: [['#ff695e','🥊','권투글러브 펀치'],['#ffca4b','💣','경고 후 폭탄 폭발'],['#5bbcff','S','3초 보호막'],['#45d483','◎','점점 좁아지는 링'],['#ffffff','POW','맞은 이유 즉시 표시'],['#ffd93d','1','마지막 생존 1위']]
    },
    rocket: {
      title: '로켓 이벤트', sub: '운빨 역전 우주 레이스', game: '먼저 도착하면 1등', status: '대기 중 · ROCKET RACE', arena: 'ROCKET RACE ARENA',
      legend: [['#45d483','▲','터보 부스터'],['#ff9f43','!','엔진 과열'],['#4da3ff','◎','웜홀 위치 교환'],['#ff4d5a','✦','운석 충돌'],['#ffd93d','+','연료 보급'],['#b05cff','1','우주정거장 도착 순위']]
    }
  };

  const rnd = (a,b) => a + Math.random() * (b-a);
  const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);

  function resizeAlt(){
    const r = board.getBoundingClientRect();
    altW = Math.max(320, r.width); altH = Math.max(440, r.height); altDpr = Math.min(devicePixelRatio || 1, 2);
    altCanvas.width = Math.round(altW * altDpr); altCanvas.height = Math.round(altH * altDpr);
    altCanvas.style.width = `${altW}px`; altCanvas.style.height = `${altH}px`;
    actx.setTransform(altDpr,0,0,altDpr,0,0);
    if(mode !== 'pinball') drawAlt(performance.now());
  }

  function legendHtml(items){ return items.map(([bg,icon,text]) => `<div class="legendItem"><i class="legendIcon" style="background:${bg}">${icon}</i>${text}</div>`).join(''); }

  function setMode(next){
    if(!modeInfo[next] || next === mode) return;
    if(altRunning || altCounting || run || counting){ pop('게임이 끝난 뒤 모드를 변경할 수 있습니다.'); return; }
    mode = next;
    modeTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    const info = modeInfo[mode];
    courseTitle.textContent = info.title; courseSub.textContent = info.sub; gameSub.textContent = info.game; arenaTitleText.textContent = info.arena; courseLegend.innerHTML = legendHtml(info.legend);
    board.classList.toggle('altMode', mode !== 'pinball'); winner.classList.remove('show');
    results.innerHTML = '<div class="empty">START를 누르면 순위가 표시됩니다.</div>'; meta.textContent = `0 / ${parse().out.length}`; status.textContent = info.status; progress.textContent = mode === 'pinball' ? '진행 0%' : 'READY'; start.textContent = 'START';
    eventFeed.innerHTML = ''; state = null;
    if(mode === 'pinball'){ cameraY = 0; setWaiting(parse().out); draw(); }
    else { resizeAlt(); makeReadyState(); drawAlt(performance.now()); }
  }

  function makeReadyState(){
    const list = parse().out;
    state = { kind: mode, ready: true, racers: list.map((name,i)=>({id:i,name,c:color(name)})) };
    updateAltRank(state.racers);
  }

  function escapeHtml(str){ return String(str).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function showEvent(text, ttl=1500){ lastEventUntil=performance.now()+ttl; eventFeed.innerHTML=`<span class="eventChip">${escapeHtml(text)}</span>`; }
  function setControlsLocked(locked){ names.disabled=locked; shuffleBtn.disabled=locked; start.disabled=locked; modeTabs.forEach(b=>b.disabled=locked); }

  function startSelected(){
    if(mode === 'pinball'){ startGame(); return; }
    if(altRunning || altCounting) return;
    const p=parse(); if(p.out.length<2){pop('참가자를 2명 이상 입력하세요.');return;}
    const list=prepared?[...prepared]:mix([...p.out]); prepared=null; winner.classList.remove('show'); winnerShown=false; results.innerHTML=''; meta.textContent=`0 / ${list.length}`; eventFeed.innerHTML=''; altCounting=true; setControlsLocked(true); status.textContent=`${modeInfo[mode].game} · 준비 중`;
    let n=3; countdown.textContent=n; countdown.classList.add('show'); beep(560,.07,.035);
    const timer=setInterval(()=>{ n--; if(n>0){countdown.textContent=n;beep(620+n*50,.06,.03);return;} clearInterval(timer); countdown.textContent='GO!'; beep(900,.1,.045); setTimeout(()=>{countdown.classList.remove('show');countdown.textContent='';altCounting=false;initAlt(mode,list);},360); },620);
  }

  function initAlt(kind,list){ altRunning=true; altT0=altLast=performance.now(); if(kind==='battle')initBattle(list); if(kind==='rocket')initRocket(list); status.textContent='진행 중'; cancelAnimationFrame(altRaf); altRaf=requestAnimationFrame(altLoop); }
  function finishAlt(ranking){
    if(!altRunning)return; altRunning=false; const final=ranking||getAltRanking(); renderAltResults(final,true); const top=final[0];
    if(top){ winnerName.textContent=top.name; winner.querySelector('small').textContent=mode==='battle'?'LAST SURVIVOR':'THE WINNER IS'; winner.classList.add('show'); beep(790,.12,.05); setTimeout(()=>beep(990,.12,.04),110); status.textContent=`완료 · 1등 ${top.name}`; }
    else status.textContent='완료';
    progress.textContent='FINISH'; setControlsLocked(false); start.disabled=parse().out.length<2; start.textContent='AGAIN';
  }
  function altLoop(now){ const rawDt=Math.min((now-altLast)/1000,.035),rate=fastForward?3:1,dt=rawDt*rate; altLast=now; if(mode==='battle')stepBattle(dt,now); if(mode==='rocket')stepRocket(dt,now); drawAlt(now); if(altRunning)altRaf=requestAnimationFrame(altLoop); }

  function updateAltRank(ranking){
    if(!liveRankList)return; const r=ranking||[]; if(!r.length){liveRankList.innerHTML='<div class="liveRankEmpty">대기 중</div>';return;} liveRankList.innerHTML='';
    r.slice(0,7).forEach((b,i)=>{const row=document.createElement('div');row.className='liveRankRow'+(i===0?' leader':'');const tc=ballTextColor(b.c);row.innerHTML=`<span class="liveRankNo" style="background:${b.c};color:${tc};border:1px solid rgba(255,255,255,.24)">${i+1}</span><i class="liveRankDot" style="background:${b.c}"></i><span class="liveRankName"></span>`;row.querySelector('.liveRankName').textContent=b.name;liveRankList.appendChild(row);});
    if(r.length>7){const more=document.createElement('div');more.className='liveRankMore';more.textContent=`+${r.length-7}명`;liveRankList.appendChild(more);}
  }
  function renderAltResults(ranking,final=false){
    const totalN=state?.racers?.length||parse().out.length; meta.textContent=`${final?ranking.length:(state?.eliminated?.length||state?.finish?.length||0)} / ${totalN}`; results.innerHTML=''; if(!ranking.length){results.innerHTML='<div class="empty">아직 순위가 없습니다.</div>';return;}
    ranking.forEach((b,i)=>{const el=document.createElement('div');el.className='result';let suffix='';if(final)suffix=mode==='battle'?(i===0?'생존':'탈락'):(b.t?`${b.t.toFixed(2)}s`:'');el.innerHTML=`<span class="rank">${i+1}</span><i class="colorDot" style="background:${b.c}"></i><span class="rname"></span><span class="time"></span>`;el.querySelector('.rname').textContent=b.name;el.querySelector('.time').textContent=suffix;results.appendChild(el);});
  }
  function getAltRanking(){ if(!state)return[]; if(mode==='battle')return battleRanking(); if(mode==='rocket')return rocketRanking(); return[]; }

  // -------- BOXING BATTLE ROYALE --------
  function initBattle(list){
    const cx=altW/2, cy=altH/2+12, maxR=Math.min(altW,altH)*.40;
    state={kind:'battle',ready:false,cx,cy,startR:maxR,ringR:maxR,finish:[],eliminated:[],effects:[],bomb:null,nextBomb:rnd(3.6,5.0),shieldItem:null,nextShield:rnd(5.5,8.0),sudden:false,racers:list.map((name,i)=>{const a=(i/list.length)*Math.PI*2+rnd(-.15,.15),r=maxR*rnd(.28,.58);return{id:i,name,c:color(name),x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r,vx:rnd(-42,42),vy:rnd(-42,42),r:Math.max(10,Math.min(14,14-list.length*.035)),alive:true,t:0,phase:Math.random()*10,punchCd:rnd(.45,1.3),windup:0,targetId:null,punchFlash:0,hitFlash:0,shield:0};})};
    showEvent('🥊 BOXING BATTLE! 가까운 상대를 펀치로 링 밖에 밀어내세요',2200); updateAltRank(battleRanking());
  }
  function battleRanking(){
    const alive=state.racers.filter(r=>r.alive).sort((a,b)=>{const da=Math.hypot(a.x-state.cx,a.y-state.cy),db=Math.hypot(b.x-state.cx,b.y-state.cy);return da-db;});
    return [...alive,...[...state.eliminated].reverse()];
  }
  function nearestTarget(r){ let best=null,bestD=Infinity; for(const o of state.racers){if(o===r||!o.alive)continue;const d=dist(r,o);if(d<bestD){bestD=d;best=o;}} return {target:best,d:bestD}; }
  function startPunch(r){ const n=nearestTarget(r); if(!n.target || n.d>145){r.punchCd=rnd(.22,.5);return;} r.targetId=n.target.id; r.windup=.34; r.punchCd=state.sudden?rnd(.48,.78):rnd(.75,1.22); }
  function hitForce(target,dx,dy,force){ const scale=target.shield>0?.34:1; target.vx+=dx*force*scale;target.vy+=dy*force*scale;target.hitFlash=1;if(target.shield>0)state.effects.push({type:'shieldHit',x:target.x,y:target.y,age:0,ttl:.45}); }
  function executePunch(r){
    const t=state.racers.find(x=>x.id===r.targetId&&x.alive); r.targetId=null; if(!t)return; const dx=t.x-r.x,dy=t.y-r.y,d=Math.hypot(dx,dy)||1;if(d>155)return;const nx=dx/d,ny=dy/d,force=(state.sudden?330:270)+Math.random()*70;hitForce(t,nx,ny,force);r.vx-=nx*35;r.vy-=ny*35;r.punchFlash=1;state.effects.push({type:'pow',x:r.x+nx*Math.min(d*.72,55),y:r.y+ny*Math.min(d*.72,55),age:0,ttl:.6,text:'POW!'});showEvent(`🥊 ${r.name} → ${t.name} 펀치!${t.shield>0?' · 보호막 방어':''}`,1100);beep(240,.035,.014);
  }
  function spawnBomb(){
    const a=Math.random()*Math.PI*2,rr=state.ringR*rnd(.12,.55);state.bomb={x:state.cx+Math.cos(a)*rr,y:state.cy+Math.sin(a)*rr,timer:1.25,max:1.25,radius:Math.min(110,state.ringR*.48)};showEvent('💣 폭탄 등장! 경고 원 밖으로 피하세요',1400);beep(360,.04,.012);
  }
  function explodeBomb(){
    const b=state.bomb;if(!b)return;let hits=0;for(const r of state.racers){if(!r.alive)continue;const dx=r.x-b.x,dy=r.y-b.y,d=Math.hypot(dx,dy)||1;if(d>b.radius)continue;hits++;const f=(1-d/b.radius)*420+150;hitForce(r,dx/d,dy/d,f);}state.effects.push({type:'boom',x:b.x,y:b.y,age:0,ttl:.72,r:b.radius});showEvent(`💥 폭탄 폭발! ${hits}명 밀려남`,1200);beep(105,.08,.025);state.bomb=null;state.nextBomb=state.sudden?rnd(2.8,4.0):rnd(4.4,6.2);
  }
  function spawnShield(){const a=Math.random()*Math.PI*2,rr=state.ringR*rnd(.12,.48);state.shieldItem={x:state.cx+Math.cos(a)*rr,y:state.cy+Math.sin(a)*rr,life:6};showEvent('🛡 보호막 등장! 먼저 닿으면 3초간 밀림 감소',1500);}
  function eliminateBattle(r,elapsed,reason='링 아웃'){
    if(!r.alive)return;r.alive=false;r.t=elapsed;state.eliminated.push(r);state.effects.push({type:'out',x:r.x,y:r.y,age:0,ttl:.7,text:'OUT!'});beep(115,.06,.022);showEvent(`💨 ${r.name} ${reason}! · ${state.racers.filter(x=>x.alive).length}명 생존`,1200);
  }
  function stepBattle(dt,now){
    const elapsed=(now-altT0)/1000; if(!state.sudden&&elapsed>24){state.sudden=true;showEvent('🔥 SUDDEN DEATH! 링 축소 + 펀치 속도 증가',1900);beep(700,.08,.025);} const shrink=Math.min(1,elapsed/36);state.ringR=state.startR*(1-(state.sudden?.58:.48)*shrink);if(elapsed>39)state.ringR*=Math.max(.55,1-(elapsed-39)*.045);
    state.nextBomb-=dt;state.nextShield-=dt;if(!state.bomb&&state.nextBomb<=0)spawnBomb();if(state.bomb){state.bomb.timer-=dt;if(state.bomb.timer<=0)explodeBomb();}
    if(!state.shieldItem&&state.nextShield<=0){spawnShield();state.nextShield=rnd(7.0,10.5);}if(state.shieldItem){state.shieldItem.life-=dt;if(state.shieldItem.life<=0)state.shieldItem=null;}
    const alive=state.racers.filter(r=>r.alive);
    for(const r of alive){
      r.punchCd-=dt;r.punchFlash=Math.max(0,r.punchFlash-dt*4);r.hitFlash=Math.max(0,r.hitFlash-dt*4);r.shield=Math.max(0,r.shield-dt);
      if(r.windup>0){const prev=r.windup;r.windup-=dt;const t=state.racers.find(x=>x.id===r.targetId&&x.alive);if(t){const dx=t.x-r.x,dy=t.y-r.y,d=Math.hypot(dx,dy)||1;r.vx+=dx/d*18*dt;r.vy+=dy/d*18*dt;}if(prev>0&&r.windup<=0)executePunch(r);}else if(r.punchCd<=0)startPunch(r);
      const dx=state.cx-r.x,dy=state.cy-r.y,d=Math.hypot(dx,dy)||1;const edge=d/state.ringR;const inward=edge>.72?32:9;r.vx+=dx/d*inward*dt;r.vy+=dy/d*inward*dt;const tangent=Math.sin(elapsed*.9+r.phase)*10;r.vx+=(-dy/d)*tangent*dt;r.vy+=(dx/d)*tangent*dt;
      r.vx*=Math.pow(.992,dt*60);r.vy*=Math.pow(.992,dt*60);const v=Math.hypot(r.vx,r.vy),maxV=state.sudden?330:270;if(v>maxV){r.vx=r.vx/v*maxV;r.vy=r.vy/v*maxV;}r.x+=r.vx*dt;r.y+=r.vy*dt;
      if(state.shieldItem&&Math.hypot(r.x-state.shieldItem.x,r.y-state.shieldItem.y)<r.r+17){r.shield=3.2;state.shieldItem=null;state.effects.push({type:'shield',x:r.x,y:r.y,age:0,ttl:.65});showEvent(`🛡 ${r.name} 보호막 획득!`,1200);beep(610,.06,.018);}
    }
    for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){const a=alive[i],b=alive[j],dx=b.x-a.x,dy=b.y-a.y,rr=a.r+b.r,d2=dx*dx+dy*dy;if(d2<=.01||d2>=rr*rr)continue;const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=rr-d;a.x-=nx*ov/2;a.y-=ny*ov/2;b.x+=nx*ov/2;b.y+=ny*ov/2;const rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rel<0){const imp=-rel*.42+8;a.vx-=imp*nx;a.vy-=imp*ny;b.vx+=imp*nx;b.vy+=imp*ny;}}
    for(const r of alive){if(Math.hypot(r.x-state.cx,r.y-state.cy)-r.r>state.ringR)eliminateBattle(r,elapsed);}
    for(const e of state.effects)e.age+=dt;state.effects=state.effects.filter(e=>e.age<e.ttl);
    const survivors=state.racers.filter(r=>r.alive),rank=battleRanking();progress.textContent=`생존 ${survivors.length} / ${state.racers.length} · 링 ${Math.round(state.ringR/state.startR*100)}%`;updateAltRank(rank);renderBattleStatus(rank);
    if(survivors.length<=1){if(survivors[0])survivors[0].t=elapsed;finishAlt(rank);return;}if(elapsed>52){for(const r of rank.slice(1).filter(r=>r.alive))eliminateBattle(r,elapsed,'SUDDEN OUT');finishAlt(battleRanking());}
  }
  function renderBattleStatus(rank){meta.textContent=`${state.eliminated.length} / ${state.racers.length} 탈락`;results.innerHTML='';const show=rank.slice(0,Math.min(rank.length,8));show.forEach((b,i)=>{const el=document.createElement('div');el.className='result';el.innerHTML=`<span class="rank">${i+1}</span><i class="colorDot" style="background:${b.c}"></i><span class="rname"></span><span class="time"></span>`;el.querySelector('.rname').textContent=b.name;el.querySelector('.time').textContent=b.alive?(b.shield>0?'🛡':'생존'):'OUT';results.appendChild(el);});}
  function drawGlove(x,y,ang,extend=0,alpha=1){actx.save();actx.translate(x,y);actx.rotate(ang);actx.globalAlpha=alpha;actx.translate(extend,0);actx.fillStyle='#ff5f57';actx.strokeStyle='rgba(255,255,255,.75)';actx.lineWidth=1.2;actx.beginPath();actx.roundRect(-2,-7,13,14,5);actx.fill();actx.stroke();actx.fillStyle='#d7423d';actx.fillRect(-7,-4,7,8);actx.restore();actx.globalAlpha=1;}
  function drawBattle(){
    drawAltBackground('#182c3b','#07131d');const cx=state?.cx||altW/2,cy=state?.cy||altH/2,ringR=state?.ringR||Math.min(altW,altH)*.40;actx.fillStyle='rgba(255,255,255,.025)';actx.beginPath();actx.arc(cx,cy,ringR,0,Math.PI*2);actx.fill();actx.strokeStyle=state?.sudden?'rgba(255,91,86,.95)':'rgba(69,212,131,.92)';actx.lineWidth=5;actx.beginPath();actx.arc(cx,cy,ringR,0,Math.PI*2);actx.stroke();actx.strokeStyle='rgba(255,255,255,.065)';actx.lineWidth=1;for(let k=.25;k<1;k+=.25){actx.beginPath();actx.arc(cx,cy,ringR*k,0,Math.PI*2);actx.stroke();}
    actx.fillStyle='rgba(255,255,255,.48)';actx.font='900 11px system-ui';actx.textAlign='center';actx.fillText(state?.sudden?'SUDDEN DEATH':'BOXING ARENA',cx,cy+4);
    if(state?.bomb){const b=state.bomb,p=1-b.timer/b.max,pulse=.88+.12*Math.sin(performance.now()/75);actx.fillStyle='rgba(255,70,65,.08)';actx.strokeStyle=`rgba(255,203,74,${.5+.45*p})`;actx.lineWidth=3;actx.beginPath();actx.arc(b.x,b.y,b.radius*pulse,0,Math.PI*2);actx.fill();actx.stroke();actx.fillStyle='#181818';actx.beginPath();actx.arc(b.x,b.y,14,0,Math.PI*2);actx.fill();actx.fillStyle='#ffca4b';actx.font='900 11px system-ui';actx.fillText(`💣 ${Math.max(0,b.timer).toFixed(1)}`,b.x,b.y-22);}
    if(state?.shieldItem){const s=state.shieldItem,rr=13+Math.sin(performance.now()/110)*2;actx.fillStyle='rgba(91,188,255,.16)';actx.strokeStyle='rgba(91,188,255,.95)';actx.lineWidth=3;actx.beginPath();actx.arc(s.x,s.y,rr,0,Math.PI*2);actx.fill();actx.stroke();actx.fillStyle='#dff5ff';actx.font='950 10px system-ui';actx.fillText('S',s.x,s.y+1);}
    for(const r of state?.racers||[]){if(!r.alive)continue;const t=state.racers.find(x=>x.id===r.targetId&&x.alive),ang=t?Math.atan2(t.y-r.y,t.x-r.x):Math.atan2(r.vy,r.vx||1);const wind=r.windup>0?1-r.windup/.34:0,activeExtend=r.windup>0?(4+wind*13):(r.punchFlash>0?19*r.punchFlash:3);const perp=ang+Math.PI/2;const gx1=r.x+Math.cos(perp)*7,gy1=r.y+Math.sin(perp)*7,gx2=r.x-Math.cos(perp)*7,gy2=r.y-Math.sin(perp)*7;drawGlove(gx1,gy1,ang,activeExtend);drawGlove(gx2,gy2,ang,0,.78);
      if(r.windup>0&&t){actx.strokeStyle='rgba(255,202,75,.42)';actx.setLineDash([4,5]);actx.beginPath();actx.moveTo(r.x,r.y);actx.lineTo(t.x,t.y);actx.stroke();actx.setLineDash([]);actx.fillStyle='#ffca4b';actx.font='950 13px system-ui';actx.fillText('!',r.x,r.y-r.r-16);}
      if(r.shield>0){actx.strokeStyle='rgba(91,188,255,.92)';actx.lineWidth=3;actx.beginPath();actx.arc(r.x,r.y,r.r+7+Math.sin(performance.now()/100+r.phase)*1.5,0,Math.PI*2);actx.stroke();}
      if(r.hitFlash>0){actx.strokeStyle=`rgba(255,230,120,${r.hitFlash})`;actx.lineWidth=3;actx.beginPath();actx.arc(r.x,r.y,r.r+10*(1-r.hitFlash),0,Math.PI*2);actx.stroke();}
      drawBallLabel(r,r.x,r.y,r.r);actx.fillStyle='rgba(255,255,255,.88)';actx.font=`800 ${state.racers.length>14?7:9}px system-ui`;actx.textAlign='center';actx.fillText(r.name,r.x,r.y+r.r+13,62);
    }
    for(const e of state?.effects||[]){const p=e.age/e.ttl,a=1-p;if(e.type==='pow'||e.type==='out'){actx.globalAlpha=a;actx.fillStyle=e.type==='pow'?'#ffef75':'#ff7069';actx.font=`1000 ${18+8*p}px system-ui`;actx.textAlign='center';actx.fillText(e.text,e.x,e.y-10*p);}else if(e.type==='boom'){actx.globalAlpha=a;actx.strokeStyle='#ffca4b';actx.lineWidth=5*(1-p)+1;actx.beginPath();actx.arc(e.x,e.y,e.r*(.2+.8*p),0,Math.PI*2);actx.stroke();}else if(e.type==='shield'||e.type==='shieldHit'){actx.globalAlpha=a;actx.strokeStyle='#5bbcff';actx.lineWidth=4;actx.beginPath();actx.arc(e.x,e.y,12+25*p,0,Math.PI*2);actx.stroke();}actx.globalAlpha=1;}
  }

  // -------- ROCKET RACE --------
  function initRocket(list){state={kind:'rocket',ready:false,finish:[],nextEvent:.65,stars:Array.from({length:90},()=>({x:Math.random(),y:Math.random(),s:.5+Math.random()*1.5})),racers:list.map((name,i)=>({id:i,name,c:color(name),p:0,displayP:0,base:.036+Math.random()*.018,speed:.04+Math.random()*.014,boost:0,stall:0,hit:0,done:false,t:0,phase:Math.random()*10}))};showEvent('🚀 로켓 레이스 시작 · 터보, 운석, 웜홀 이벤트 ON',1800);updateAltRank(rocketRanking());}
  function rocketRanking(){const done=[...state.finish],ids=new Set(done.map(r=>r.id)),active=state.racers.filter(r=>!ids.has(r.id)).sort((a,b)=>b.p-a.p||b.speed-a.speed);return[...done,...active];}
  function rocketEvent(){const active=state.racers.filter(r=>!r.done);if(!active.length)return;const r=active[Math.floor(Math.random()*active.length)],roll=Math.random();if(roll<.25){r.boost=1.5;r.speed+=.022;showEvent(`🔥 ${r.name} TURBO! 폭발적인 가속`);beep(620,.04,.018);}else if(roll<.45){r.stall=.85+Math.random()*.7;showEvent(`⚠️ ${r.name} 엔진 과열! 잠시 감속`);beep(170,.05,.012);}else if(roll<.62){r.hit=1;r.p=Math.max(0,r.p-(.035+Math.random()*.045));showEvent(`☄️ ${r.name} 운석 충돌! 순위 하락`);beep(130,.05,.014);}else if(roll<.80&&active.length>1){const pool=active.filter(x=>x!==r),other=pool[Math.floor(Math.random()*pool.length)],tmp=r.p;r.p=other.p;other.p=tmp;r.hit=other.hit=.65;showEvent(`🌀 웜홀! ${r.name} ↔ ${other.name} 위치 교환`);beep(440,.06,.018);}else{r.speed+=.01;r.p=Math.min(.98,r.p+.028+Math.random()*.035);showEvent(`⛽ ${r.name} 연료 보급! 앞으로 점프`);beep(520,.035,.015);}}
  function stepRocket(dt,now){const elapsed=(now-altT0)/1000;state.nextEvent-=dt;if(state.nextEvent<=0){state.nextEvent=.68+Math.random()*.6;rocketEvent();}for(const r of state.racers){r.displayP+=(r.p-r.displayP)*Math.min(1,dt*7);r.boost=Math.max(0,r.boost-dt);r.stall=Math.max(0,r.stall-dt);r.hit=Math.max(0,r.hit-dt*2);if(r.done)continue;const jitter=Math.sin(elapsed*1.6+r.phase)*.003,eff=(r.speed+jitter+(r.boost>0?.027:0))*(r.stall>0?.18:1);r.p+=Math.max(.006,eff)*dt;r.speed+=(r.base-r.speed)*dt*.8;if(r.p>=1){r.p=1;r.displayP=1;r.done=true;r.t=elapsed;state.finish.push(r);showEvent(`🚀 ${state.finish.length}위 ${r.name} 우주정거장 도착!`);beep(600+state.finish.length*35,.05,.022);}}const rank=rocketRanking();updateAltRank(rank);renderAltResults(state.finish,false);const leader=rank.find(r=>!r.done)||rank[0];progress.textContent=`1등 진행 ${Math.round((leader?.p||1)*100)}%`;if(state.finish.length===state.racers.length)finishAlt(rank);if(elapsed>48&&altRunning){for(const r of rank.filter(r=>!r.done)){r.done=true;r.t=elapsed;state.finish.push(r);}finishAlt(rocketRanking());}}
  function drawRocket(){drawAltBackground('#09172d','#030812');for(const st of state?.stars||[]){actx.globalAlpha=.35+st.s*.22;actx.fillStyle='#fff';actx.fillRect(st.x*altW,st.y*altH,st.s,st.s);}actx.globalAlpha=1;const racers=state?.racers||[];if(!racers.length)return;const top=70,bottom=altH-60,trackH=bottom-top;actx.strokeStyle='rgba(182,223,102,.8)';actx.lineWidth=3;actx.beginPath();actx.moveTo(24,top);actx.lineTo(altW-24,top);actx.stroke();actx.fillStyle='rgba(255,255,255,.78)';actx.font='900 10px system-ui';actx.textAlign='center';actx.fillText('ORBITAL STATION · FINISH',altW/2,top-17);const laneW=altW/racers.length;racers.forEach((r,i)=>{const x=laneW*(i+.5),y=bottom-r.displayP*trackH;actx.strokeStyle='rgba(255,255,255,.055)';actx.lineWidth=1;actx.beginPath();actx.moveTo(x,top);actx.lineTo(x,bottom);actx.stroke();if(r.done)return;const flame=12+(r.boost>0?18:0)+Math.sin(performance.now()/55+r.phase)*3;actx.fillStyle=r.boost>0?'rgba(255,217,61,.8)':'rgba(255,145,70,.68)';actx.beginPath();actx.moveTo(x-4,y+11);actx.lineTo(x,y+11+flame);actx.lineTo(x+4,y+11);actx.fill();actx.save();actx.translate(x,y);actx.fillStyle=r.c;actx.beginPath();actx.moveTo(0,-14);actx.lineTo(8,4);actx.lineTo(7,13);actx.lineTo(-7,13);actx.lineTo(-8,4);actx.closePath();actx.fill();actx.strokeStyle='rgba(255,255,255,.72)';actx.lineWidth=1.2;actx.stroke();actx.fillStyle='#dff7ff';actx.beginPath();actx.arc(0,-2,3,0,Math.PI*2);actx.fill();actx.restore();if(r.hit>0){actx.strokeStyle=`rgba(176,92,255,${r.hit})`;actx.lineWidth=2;actx.beginPath();actx.arc(x,y,19+8*(1-r.hit),0,Math.PI*2);actx.stroke();}actx.fillStyle='rgba(255,255,255,.9)';actx.font=`800 ${racers.length>14?7:9}px system-ui`;actx.textAlign='center';actx.fillText(r.name,x,y-22,Math.max(34,laneW-4));});}

  function drawAltBackground(topColor,bottomColor){actx.clearRect(0,0,altW,altH);const gr=actx.createLinearGradient(0,0,0,altH);gr.addColorStop(0,topColor);gr.addColorStop(1,bottomColor);actx.fillStyle=gr;actx.fillRect(0,0,altW,altH);actx.globalAlpha=.045;actx.strokeStyle='#fff';actx.lineWidth=1;for(let x=-altH;x<altW+altH;x+=48){actx.beginPath();actx.moveTo(x,0);actx.lineTo(x-altH,altH);actx.stroke();}actx.globalAlpha=1;}
  function drawBallLabel(r,x,y,rad=10){actx.shadowColor='rgba(0,0,0,.28)';actx.shadowBlur=7;actx.shadowOffsetY=2;actx.fillStyle=r.c;actx.beginPath();actx.arc(x,y,rad,0,Math.PI*2);actx.fill();actx.shadowColor='transparent';actx.strokeStyle='rgba(255,255,255,.7)';actx.lineWidth=1.1;actx.stroke();}
  function drawReady(){const info=modeInfo[mode];drawAltBackground(mode==='rocket'?'#09172d':'#182c3b',mode==='rocket'?'#030812':'#07131d');actx.fillStyle='rgba(255,255,255,.82)';actx.font='950 24px system-ui';actx.textAlign='center';actx.fillText(mode==='battle'?'BOXING BATTLE ROYALE':'ROCKET RACE',altW/2,altH*.42);actx.fillStyle='rgba(255,255,255,.43)';actx.font='600 11px system-ui';actx.fillText(info.sub,altW/2,altH*.42+27);actx.fillText('START를 누르면 참가자 전원이 동시에 시작합니다',altW/2,altH*.42+48);}
  function drawAlt(now){if(!state||state.ready){drawReady();return;}if(mode==='battle')drawBattle();if(mode==='rocket')drawRocket();if(eventFeed.innerHTML&&now>lastEventUntil)eventFeed.innerHTML='';}
  function handleNames(){update();if(mode!=='pinball'&&!altRunning&&!altCounting){makeReadyState();drawAlt(performance.now());}}

  modeTabs.forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.mode)));
  window.addEventListener('resize',()=>setTimeout(resizeAlt,30));
  courseLegend.innerHTML=legendHtml(modeInfo.pinball.legend); resizeAlt();
  window.SB365Multi={startSelected,setMode,handleNames,get mode(){return mode;}};
})();

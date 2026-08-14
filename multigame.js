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
  let lastEvent = '';
  let lastEventUntil = 0;

  const modeInfo = {
    pinball: {
      title: '코스 구성', sub: '순위 역전형 코스', game: '1등 당첨', status: '대기 중 · 1등 당첨', arena:'PINBALL LONG ARENA',
      legend: [['#f8be5c','Y','Y자 갈림길'],['#f082bd','↻','대형 회전문'],['#47c999','◉','강력 원형 범퍼'],['#ff97bf','⌁','자동 플리퍼'],['#76cdff','Ⅳ','4갈래 슬롯'],['#ffd777','⇆','움직이는 깔때기']]
    },
    glass: {
      title: '유리다리 규칙', sub: '추락 후 재합류', game: '먼저 통과하면 1등', status: '대기 중 · GLASS BRIDGE', arena:'GLASS BRIDGE ARENA',
      legend: [['#76cdff','?','좌/우 랜덤 선택'],['#45d483','✓','안전 발판 전진'],['#ff7180','✕','깨진 발판 추락'],['#ffd93d','↩','우회로 재합류'],['#b05cff','⇧','연속 성공 점프'],['#ffffff','1','최종 통과 순위']]
    },
    battle: {
      title: '배틀로얄 규칙', sub: '마지막 생존 = 1등', game: '마지막 생존자가 1등', status: '대기 중 · BATTLE ROYALE', arena:'BATTLE ROYALE ARENA',
      legend: [['#45d483','◎','점점 좁아지는 링'],['#ff9f43','↔','구슬끼리 충돌'],['#ff4d5a','⚡','랜덤 충격파'],['#4da3ff','↗','밀려나면 탈락'],['#b05cff','↺','후반 강제 가속'],['#ffd93d','1','마지막 생존 1위']]
    },
    rocket: {
      title: '로켓 이벤트', sub: '운빨 역전 우주 레이스', game: '먼저 도착하면 1등', status: '대기 중 · ROCKET RACE', arena:'ROCKET RACE ARENA',
      legend: [['#45d483','▲','터보 부스터'],['#ff9f43','!','엔진 과열'],['#4da3ff','◎','웜홀 위치 교환'],['#ff4d5a','✦','운석 충돌'],['#ffd93d','+','연료 보급'],['#b05cff','1','우주정거장 도착 순위']]
    }
  };

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
    if(next === mode) return;
    if(altRunning || altCounting || run || counting){ pop('게임이 끝난 뒤 모드를 변경할 수 있습니다.'); return; }
    mode = next;
    modeTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    const info = modeInfo[mode]; courseTitle.textContent = info.title; courseSub.textContent = info.sub; gameSub.textContent = info.game; arenaTitleText.textContent = info.arena; courseLegend.innerHTML = legendHtml(info.legend);
    board.classList.toggle('altMode', mode !== 'pinball'); winner.classList.remove('show');
    results.innerHTML = '<div class="empty">START를 누르면 순위가 표시됩니다.</div>'; meta.textContent = `0 / ${parse().out.length}`; status.textContent = info.status; progress.textContent = mode === 'pinball' ? '진행 0%' : 'READY'; start.textContent = 'START';
    lastEvent = ''; eventFeed.innerHTML = ''; state = null;
    if(mode === 'pinball'){ cameraY = 0; setWaiting(parse().out); draw(); }
    else { resizeAlt(); makeReadyState(); drawAlt(performance.now()); }
  }

  function makeReadyState(){ const list = parse().out; state = { kind: mode, ready: true, racers: list.map((name,i)=>({id:i,name,c:color(name)})) }; updateAltRank(state.racers); }
  function escapeHtml(str){ return String(str).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function showEvent(text, ttl=1800){ lastEvent=text; lastEventUntil=performance.now()+ttl; eventFeed.innerHTML=`<span class="eventChip">${escapeHtml(text)}</span>`; }
  function setControlsLocked(locked){ names.disabled=locked; shuffleBtn.disabled=locked; start.disabled=locked; modeTabs.forEach(b=>b.disabled=locked); }

  function startSelected(){
    if(mode === 'pinball') return startGame();
    if(altRunning || altCounting) return;
    const p=parse(); if(p.out.length<2){pop('참가자를 2명 이상 입력하세요.');return}
    const list=prepared?[...prepared]:mix([...p.out]); prepared=null; winner.classList.remove('show'); winnerShown=false; results.innerHTML=''; meta.textContent=`0 / ${list.length}`; lastEvent=''; altCounting=true; setControlsLocked(true); status.textContent=`${modeInfo[mode].game} · 준비 중`;
    let n=3; countdown.textContent=n; countdown.classList.add('show'); beep(560,.07,.035);
    const timer=setInterval(()=>{n--;if(n>0){countdown.textContent=n;beep(620+n*50,.06,.03);return}clearInterval(timer);countdown.textContent='GO!';beep(900,.1,.045);setTimeout(()=>{countdown.classList.remove('show');countdown.textContent='';altCounting=false;initAlt(mode,list)},360)},620);
  }

  function initAlt(kind,list){ altRunning=true;altT0=altLast=performance.now();if(kind==='glass')initGlass(list);if(kind==='battle')initBattle(list);if(kind==='rocket')initRocket(list);status.textContent='진행 중';cancelAnimationFrame(altRaf);altRaf=requestAnimationFrame(altLoop); }

  function finishAlt(ranking){
    if(!altRunning)return; altRunning=false; const final=ranking||getAltRanking(); renderAltResults(final,true); const top=final[0];
    if(top){winnerName.textContent=top.name;winner.querySelector('small').textContent=mode==='battle'?'LAST SURVIVOR':'THE WINNER IS';winner.classList.add('show');beep(790,.12,.05);setTimeout(()=>beep(990,.12,.04),110);status.textContent=`완료 · 1등 ${top.name}`}else status.textContent='완료';
    progress.textContent='FINISH';setControlsLocked(false);start.disabled=parse().out.length<2;start.textContent='AGAIN';modeTabs.forEach(b=>b.disabled=false);
  }

  function altLoop(now){ const rawDt=Math.min((now-altLast)/1000,.035),rate=fastForward?3:1,dt=rawDt*rate;altLast=now;if(mode==='glass')stepGlass(dt,now);if(mode==='battle')stepBattle(dt,now);if(mode==='rocket')stepRocket(dt,now);drawAlt(now);if(altRunning)altRaf=requestAnimationFrame(altLoop); }

  function updateAltRank(ranking){
    if(!liveRankList)return;const r=ranking||[];if(!r.length){liveRankList.innerHTML='<div class="liveRankEmpty">대기 중</div>';return}liveRankList.innerHTML='';
    r.slice(0,7).forEach((b,i)=>{const row=document.createElement('div');row.className='liveRankRow'+(i===0?' leader':'');const tc=ballTextColor(b.c);row.innerHTML=`<span class="liveRankNo" style="background:${b.c};color:${tc};border:1px solid rgba(255,255,255,.24)">${i+1}</span><i class="liveRankDot" style="background:${b.c}"></i><span class="liveRankName"></span>`;row.querySelector('.liveRankName').textContent=b.name;liveRankList.appendChild(row)});
    if(r.length>7){const more=document.createElement('div');more.className='liveRankMore';more.textContent=`+${r.length-7}명`;liveRankList.appendChild(more)}
  }

  function renderAltResults(ranking,final=false){
    meta.textContent=`${final?ranking.length:(state?.finish?.length||0)} / ${state?.racers?.length||parse().out.length}`;results.innerHTML='';if(!ranking.length){results.innerHTML='<div class="empty">아직 순위가 없습니다.</div>';return}
    ranking.forEach((b,i)=>{const el=document.createElement('div');el.className='result';const suffix=final?(mode==='battle'?(i===0?'생존':'탈락'):(b.t?`${b.t.toFixed(2)}s`:'')):'';el.innerHTML=`<span class="rank">${i+1}</span><i class="colorDot" style="background:${b.c}"></i><span class="rname"></span><span class="time"></span>`;el.querySelector('.rname').textContent=b.name;el.querySelector('.time').textContent=suffix;results.appendChild(el)});
  }
  function getAltRanking(){if(!state)return[];if(mode==='glass')return glassRanking();if(mode==='battle')return battleRanking();if(mode==='rocket')return rocketRanking();return[]}

  function initGlass(list){const steps=Math.max(11,Math.min(16,10+Math.ceil(list.length/2))),safe=Array.from({length:steps},()=>Math.random()<.5?0:1);state={kind:'glass',ready:false,steps,safe,revealed:Array(steps).fill(false),racers:list.map((name,i)=>({id:i,name,c:color(name),step:0,displayStep:0,choice:i%2,penalty:0,fall:0,done:false,t:0})),finish:[],tick:0,nextMove:.28};showEvent('유리다리 시작 · 안전 발판은 첫 시도 후 공개됩니다');updateAltRank(glassRanking())}
  function glassRanking(){const done=[...state.finish],ids=new Set(done.map(x=>x.id)),active=state.racers.filter(r=>!ids.has(r.id)).sort((a,b)=>b.step-a.step||a.penalty-b.penalty||b.displayStep-a.displayStep);return[...done,...active]}
  function stepGlass(dt,now){
    const elapsed=(now-altT0)/1000;for(const r of state.racers){r.displayStep+=(r.step-r.displayStep)*Math.min(1,dt*7);r.fall=Math.max(0,r.fall-dt*1.7)}state.nextMove-=dt;
    if(state.nextMove<=0){state.nextMove=.5+Math.random()*.16;state.tick++;const order=mix(state.racers.filter(r=>!r.done));for(const r of order){if(r.penalty>0){r.penalty--;continue}const idx=Math.min(state.steps-1,r.step);r.choice=Math.random()<.5?0:1;state.revealed[idx]=true;if(r.choice===state.safe[idx]){const jump=Math.random()<.075?2:1;r.step=Math.min(state.steps,r.step+jump);if(jump===2)showEvent(`🚀 ${r.name} 연속 안전 발판! 2칸 점프`)}else{r.fall=1;r.penalty=1+(Math.random()<.28?1:0);if(Math.random()<.32)r.step=Math.max(0,r.step-1);if(Math.random()<.55)showEvent(`💥 ${r.name} 추락! 우회로로 재합류`);beep(160,.04,.012)}if(r.step>=state.steps&&!r.done){r.done=true;r.t=elapsed;state.finish.push(r);beep(530+state.finish.length*35,.05,.02);showEvent(`🏁 ${state.finish.length}위 ${r.name} 유리다리 통과!`)}}
      const rank=glassRanking();updateAltRank(rank);renderAltResults(state.finish,false);const lead=rank.find(r=>!r.done)||rank[0],pct=lead?Math.round(Math.min(1,lead.step/state.steps)*100):100;progress.textContent=`1등 진행 ${pct}%`;if(state.finish.length===state.racers.length)finishAlt(glassRanking())}
    if(elapsed>55&&altRunning){for(const r of state.racers.filter(r=>!r.done).sort((a,b)=>b.step-a.step)){r.done=true;r.t=elapsed;state.finish.push(r)}finishAlt(glassRanking())}
  }
  function drawGlass(){
    drawAltBackground('#153b4a','#081f2a');const steps=state?.steps||13,marginTop=66,marginBottom=42,gap=(altH-marginTop-marginBottom)/steps,tileW=Math.min(118,altW*.18),tileH=Math.max(15,Math.min(28,gap*.64)),cx=altW/2,sep=Math.min(85,altW*.12);actx.textAlign='center';actx.textBaseline='middle';
    for(let i=0;i<steps;i++){const y=altH-marginBottom-(i+.5)*gap;for(let side=0;side<2;side++){const x=cx+(side?1:-1)*sep-tileW/2;let fill='rgba(108,198,235,.18)',stroke='rgba(167,229,255,.35)';if(state&&state.revealed?.[i]){if(side===state.safe[i]){fill='rgba(69,212,131,.30)';stroke='rgba(113,245,164,.92)'}else{fill='rgba(255,77,90,.18)';stroke='rgba(255,107,120,.65)'}}actx.fillStyle=fill;actx.strokeStyle=stroke;actx.lineWidth=1.5;actx.beginPath();actx.roundRect(x,y-tileH/2,tileW,tileH,6);actx.fill();actx.stroke();if(state&&state.revealed?.[i]&&side!==state.safe[i]){actx.strokeStyle='rgba(255,180,185,.55)';actx.lineWidth=1;actx.beginPath();actx.moveTo(x+tileW*.25,y-tileH*.3);actx.lineTo(x+tileW*.5,y);actx.lineTo(x+tileW*.7,y-tileH*.25);actx.stroke()}}actx.fillStyle='rgba(255,255,255,.26)';actx.font='800 8px system-ui';actx.fillText(String(i+1).padStart(2,'0'),cx,y)}
    actx.fillStyle='rgba(255,255,255,.82)';actx.font='900 11px system-ui';actx.fillText('FINISH',cx,27);actx.strokeStyle='rgba(182,223,102,.85)';actx.lineWidth=3;actx.beginPath();actx.moveTo(cx-sep-tileW*.6,45);actx.lineTo(cx+sep+tileW*.6,45);actx.stroke();if(!state?.racers?.length)return;const grouped={};for(const r of state.racers.filter(r=>!r.done)){const key=Math.round(r.displayStep*2)/2;(grouped[key]||=[]).push(r)}for(const group of Object.values(grouped)){group.forEach((r,j)=>{const y=altH-marginBottom-(r.displayStep+.5)*gap+(r.fall>0?Math.sin((1-r.fall)*Math.PI)*32:0),baseX=cx+(r.choice?1:-1)*sep,x=baseX+(j-(group.length-1)/2)*Math.min(18,tileW/(group.length+1));drawBallLabel(r,x,y,9.5)})}
  }

  function initBattle(list){const cx=altW/2,cy=altH/2+10,maxR=Math.min(altW,altH)*.39;state={kind:'battle',ready:false,cx,cy,startR:maxR,ringR:maxR,finish:[],eliminated:[],shock:0,nextShock:1.25,racers:list.map((name,i)=>{const a=(i/list.length)*Math.PI*2+Math.random()*.3,r=maxR*(.25+Math.random()*.32);return{id:i,name,c:color(name),x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r,vx:(Math.random()-.5)*120,vy:(Math.random()-.5)*120,r:Math.max(8,Math.min(12,12-list.length*.025)),alive:true,t:0,flash:0}})};showEvent('배틀로얄 시작 · 링 밖으로 밀려나면 탈락!');updateAltRank(battleRanking())}
  function battleRanking(){const alive=state.racers.filter(r=>r.alive).sort((a,b)=>{const da=(a.x-state.cx)**2+(a.y-state.cy)**2,db=(b.x-state.cx)**2+(b.y-state.cy)**2;return da-db});return[...alive,...[...state.eliminated].reverse()]}
  function eliminateBattle(r,elapsed){if(!r.alive)return;r.alive=false;r.t=elapsed;state.eliminated.push(r);r.flash=1;beep(120,.06,.022);showEvent(`💨 ${r.name} 링 아웃! · ${state.racers.filter(x=>x.alive).length}명 생존`)}
  function stepBattle(dt,now){
    const elapsed=(now-altT0)/1000,totalDuration=26,shrink=Math.min(1,elapsed/totalDuration);state.ringR=state.startR*(1-.53*shrink);state.nextShock-=dt;
    if(state.nextShock<=0){state.nextShock=Math.max(.65,1.65-elapsed*.025)+Math.random()*.45;const alive=state.racers.filter(r=>r.alive);if(alive.length>1){const target=alive[Math.floor(Math.random()*alive.length)],dx=target.x-state.cx,dy=target.y-state.cy,d=Math.hypot(dx,dy)||1,force=180+Math.random()*180+elapsed*4;target.vx+=(dx/d)*force+(Math.random()-.5)*120;target.vy+=(dy/d)*force+(Math.random()-.5)*120;target.flash=1;state.shock=.9;if(Math.random()<.75)showEvent(`⚡ 충격파! ${target.name} 바깥쪽으로 밀려납니다`);beep(250,.025,.01)}}state.shock=Math.max(0,state.shock-dt*1.8);
    const alive=state.racers.filter(r=>r.alive);for(const r of alive){const dx=state.cx-r.x,dy=state.cy-r.y,d=Math.hypot(dx,dy)||1;r.vx+=dx/d*10*dt+(Math.random()-.5)*28*dt;r.vy+=dy/d*10*dt+(Math.random()-.5)*28*dt;const maxV=250+elapsed*3,v=Math.hypot(r.vx,r.vy);if(v>maxV){r.vx=r.vx/v*maxV;r.vy=r.vy/v*maxV}r.vx*=Math.pow(.997,dt*60);r.vy*=Math.pow(.997,dt*60);r.x+=r.vx*dt;r.y+=r.vy*dt;r.flash=Math.max(0,r.flash-dt*3)}
    for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){const a=alive[i],b=alive[j],dx=b.x-a.x,dy=b.y-a.y,rr=a.r+b.r,d2=dx*dx+dy*dy;if(d2<=.01||d2>=rr*rr)continue;const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=rr-d;a.x-=nx*ov/2;a.y-=ny*ov/2;b.x+=nx*ov/2;b.y+=ny*ov/2;const rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rel<0){const impulse=-rel*.92+32+Math.random()*28;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny}}
    for(const r of alive){const d=Math.hypot(r.x-state.cx,r.y-state.cy);if(d-r.r>state.ringR)eliminateBattle(r,elapsed)}const survivors=state.racers.filter(r=>r.alive);progress.textContent=`생존 ${survivors.length} / ${state.racers.length}`;updateAltRank(battleRanking());if(survivors.length<=1){if(survivors[0])survivors[0].t=elapsed;finishAlt(battleRanking());return}if(elapsed>38){const forced=battleRanking();forced.forEach((r,i)=>{if(r.alive&&i>0){r.alive=false;state.eliminated.unshift(r)}});finishAlt(forced)}
  }
  function drawBattle(){drawAltBackground('#182c3b','#08141e');const cx=state?.cx||altW/2,cy=state?.cy||altH/2,ringR=state?.ringR||Math.min(altW,altH)*.39;actx.fillStyle='rgba(255,255,255,.025)';actx.beginPath();actx.arc(cx,cy,ringR,0,Math.PI*2);actx.fill();actx.strokeStyle=state?.shock>0?'rgba(255,217,61,.95)':'rgba(69,212,131,.88)';actx.lineWidth=4;actx.beginPath();actx.arc(cx,cy,ringR,0,Math.PI*2);actx.stroke();actx.strokeStyle='rgba(255,255,255,.07)';actx.lineWidth=1;for(let k=.25;k<1;k+=.25){actx.beginPath();actx.arc(cx,cy,ringR*k,0,Math.PI*2);actx.stroke()}actx.fillStyle='rgba(255,255,255,.58)';actx.font='900 10px system-ui';actx.textAlign='center';actx.fillText('SURVIVAL ZONE',cx,cy+4);for(const r of state?.racers||[]){if(!r.alive)continue;if(r.flash>0){actx.strokeStyle=`rgba(255,217,61,${r.flash})`;actx.lineWidth=3;actx.beginPath();actx.arc(r.x,r.y,r.r+8*(1-r.flash),0,Math.PI*2);actx.stroke()}drawBallLabel(r,r.x,r.y,r.r)}}

  function initRocket(list){state={kind:'rocket',ready:false,finish:[],nextEvent:.65,stars:Array.from({length:90},()=>({x:Math.random(),y:Math.random(),s:.5+Math.random()*1.5})),racers:list.map((name,i)=>({id:i,name,c:color(name),p:0,displayP:0,base:.036+Math.random()*.018,speed:.04+Math.random()*.014,boost:0,stall:0,hit:0,done:false,t:0,phase:Math.random()*10}))};showEvent('로켓 레이스 시작 · 터보, 운석, 웜홀 이벤트 ON');updateAltRank(rocketRanking())}
  function rocketRanking(){const done=[...state.finish],ids=new Set(done.map(r=>r.id)),active=state.racers.filter(r=>!ids.has(r.id)).sort((a,b)=>b.p-a.p||b.speed-a.speed);return[...done,...active]}
  function rocketEvent(){const active=state.racers.filter(r=>!r.done);if(!active.length)return;const r=active[Math.floor(Math.random()*active.length)],roll=Math.random();if(roll<.25){r.boost=1.5;r.speed+=.022;showEvent(`🔥 ${r.name} TURBO! 폭발적인 가속`);beep(620,.04,.018)}else if(roll<.45){r.stall=.85+Math.random()*.7;showEvent(`⚠️ ${r.name} 엔진 과열! 잠시 감속`);beep(170,.05,.012)}else if(roll<.62){r.hit=1;r.p=Math.max(0,r.p-(.035+Math.random()*.045));showEvent(`☄️ ${r.name} 운석 충돌! 순위 하락`);beep(130,.05,.014)}else if(roll<.80&&active.length>1){const pool=active.filter(x=>x!==r),other=pool[Math.floor(Math.random()*pool.length)],tmp=r.p;r.p=other.p;other.p=tmp;r.hit=other.hit=.65;showEvent(`🌀 웜홀! ${r.name} ↔ ${other.name} 위치 교환`);beep(440,.06,.018)}else{r.speed+=.01;r.p=Math.min(.98,r.p+.028+Math.random()*.035);showEvent(`⛽ ${r.name} 연료 보급! 앞으로 점프`);beep(520,.035,.015)}}
  function stepRocket(dt,now){const elapsed=(now-altT0)/1000;state.nextEvent-=dt;if(state.nextEvent<=0){state.nextEvent=.68+Math.random()*.6;rocketEvent()}for(const r of state.racers){r.displayP+=(r.p-r.displayP)*Math.min(1,dt*7);r.boost=Math.max(0,r.boost-dt);r.stall=Math.max(0,r.stall-dt);r.hit=Math.max(0,r.hit-dt*2);if(r.done)continue;const jitter=Math.sin(elapsed*1.6+r.phase)*.003,eff=(r.speed+jitter+(r.boost>0?.027:0))*(r.stall>0?.18:1);r.p+=Math.max(.006,eff)*dt;r.speed+=(r.base-r.speed)*dt*.8;if(r.p>=1){r.p=1;r.displayP=1;r.done=true;r.t=elapsed;state.finish.push(r);showEvent(`🚀 ${state.finish.length}위 ${r.name} 우주정거장 도착!`);beep(600+state.finish.length*35,.05,.022)}}const rank=rocketRanking();updateAltRank(rank);renderAltResults(state.finish,false);const leader=rank.find(r=>!r.done)||rank[0];progress.textContent=`1등 진행 ${Math.round((leader?.p||1)*100)}%`;if(state.finish.length===state.racers.length)finishAlt(rank);if(elapsed>48&&altRunning){for(const r of rank.filter(r=>!r.done)){r.done=true;r.t=elapsed;state.finish.push(r)}finishAlt(rocketRanking())}}
  function drawRocket(){drawAltBackground('#09172d','#030812');for(const st of state?.stars||[]){actx.globalAlpha=.35+st.s*.22;actx.fillStyle='#fff';actx.fillRect(st.x*altW,st.y*altH,st.s,st.s)}actx.globalAlpha=1;const racers=state?.racers||[];if(!racers.length)return;const top=70,bottom=altH-60,trackH=bottom-top;actx.strokeStyle='rgba(182,223,102,.8)';actx.lineWidth=3;actx.beginPath();actx.moveTo(24,top);actx.lineTo(altW-24,top);actx.stroke();actx.fillStyle='rgba(255,255,255,.78)';actx.font='900 10px system-ui';actx.textAlign='center';actx.fillText('ORBITAL STATION · FINISH',altW/2,top-17);const laneW=altW/racers.length;racers.forEach((r,i)=>{const x=laneW*(i+.5),y=bottom-r.displayP*trackH;actx.strokeStyle='rgba(255,255,255,.055)';actx.lineWidth=1;actx.beginPath();actx.moveTo(x,top);actx.lineTo(x,bottom);actx.stroke();if(r.done)return;const flame=12+(r.boost>0?18:0)+Math.sin(performance.now()/55+r.phase)*3;actx.fillStyle=r.boost>0?'rgba(255,217,61,.8)':'rgba(255,145,70,.68)';actx.beginPath();actx.moveTo(x-4,y+11);actx.lineTo(x,y+11+flame);actx.lineTo(x+4,y+11);actx.fill();actx.save();actx.translate(x,y);actx.fillStyle=r.c;actx.beginPath();actx.moveTo(0,-14);actx.lineTo(8,4);actx.lineTo(7,13);actx.lineTo(-7,13);actx.lineTo(-8,4);actx.closePath();actx.fill();actx.strokeStyle='rgba(255,255,255,.72)';actx.lineWidth=1.2;actx.stroke();actx.fillStyle='#dff7ff';actx.beginPath();actx.arc(0,-2,3,0,Math.PI*2);actx.fill();actx.restore();if(r.hit>0){actx.strokeStyle=`rgba(176,92,255,${r.hit})`;actx.lineWidth=2;actx.beginPath();actx.arc(x,y,19+8*(1-r.hit),0,Math.PI*2);actx.stroke()}actx.fillStyle='rgba(255,255,255,.9)';actx.font=`800 ${racers.length>14?7:9}px system-ui`;actx.textAlign='center';actx.fillText(r.name,x,y-22,Math.max(34,laneW-4))})}

  function drawAltBackground(topColor,bottomColor){actx.clearRect(0,0,altW,altH);const gr=actx.createLinearGradient(0,0,0,altH);gr.addColorStop(0,topColor);gr.addColorStop(1,bottomColor);actx.fillStyle=gr;actx.fillRect(0,0,altW,altH);actx.globalAlpha=.045;actx.strokeStyle='#fff';actx.lineWidth=1;for(let x=-altH;x<altW+altH;x+=48){actx.beginPath();actx.moveTo(x,0);actx.lineTo(x-altH,altH);actx.stroke()}actx.globalAlpha=1}
  function drawBallLabel(r,x,y,rad=10){actx.shadowColor='rgba(0,0,0,.28)';actx.shadowBlur=7;actx.shadowOffsetY=2;actx.fillStyle=r.c;actx.beginPath();actx.arc(x,y,rad,0,Math.PI*2);actx.fill();actx.shadowColor='transparent';actx.strokeStyle='rgba(255,255,255,.7)';actx.lineWidth=1.1;actx.stroke();actx.fillStyle=ballTextColor(r.c);actx.font=`900 ${Math.max(6,rad*.58)}px system-ui`;actx.textAlign='center';actx.textBaseline='middle';actx.fillText(r.name,x,y+.4,rad*1.7)}
  function drawReady(){const info=modeInfo[mode];drawAltBackground(mode==='rocket'?'#09172d':mode==='battle'?'#182c3b':'#153b4a',mode==='rocket'?'#030812':mode==='battle'?'#08141e':'#081f2a');actx.fillStyle='rgba(255,255,255,.82)';actx.font='950 24px system-ui';actx.textAlign='center';actx.fillText(mode==='glass'?'GLASS BRIDGE':mode==='battle'?'BATTLE ROYALE':'ROCKET RACE',altW/2,altH*.42);actx.fillStyle='rgba(255,255,255,.43)';actx.font='600 11px system-ui';actx.fillText(info.sub,altW/2,altH*.42+27);actx.fillText('START를 누르면 참가자 전원이 동시에 시작합니다',altW/2,altH*.42+48)}
  function drawAlt(now){if(!state||state.ready){drawReady();return}if(mode==='glass')drawGlass();if(mode==='battle')drawBattle();if(mode==='rocket')drawRocket();if(lastEvent&&now>lastEventUntil){lastEvent='';eventFeed.innerHTML=''}}
  function handleNames(){update();if(mode!=='pinball'&&!altRunning&&!altCounting){makeReadyState();drawAlt(performance.now())}}

  modeTabs.forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.mode)));window.addEventListener('resize',()=>setTimeout(resizeAlt,30));courseLegend.innerHTML=legendHtml(modeInfo.pinball.legend);resizeAlt();window.SB365Multi={startSelected,setMode,handleNames,get mode(){return mode}};
})();

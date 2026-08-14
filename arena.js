(() => {
  const altCanvas = document.querySelector('#altGame');
  const actx = altCanvas.getContext('2d');
  const modeTabs = [...document.querySelectorAll('.modeTab')];
  const eventFeed = document.querySelector('#eventFeed');
  const gameSub = document.querySelector('#gameSub');
  const arenaTitleText = document.querySelector('#arenaTitleText');

  let mode = 'pinball';
  let altW = 900;
  let altH = 720;
  let altDpr = 1;

  const modeInfo = {
    pinball: { game: '1등 당첨', status: '대기 중 · 1등 당첨', arena: 'PINBALL LONG ARENA' },
    battle: { game: '마지막 생존자가 1등', status: '대기 중 · BATTLE ROYALE', arena: 'BOXING BATTLE ROYALE' }
  };

  function resizeAlt(){
    const r = board.getBoundingClientRect();
    altW = Math.max(320, r.width);
    altH = Math.max(440, r.height);
    altDpr = Math.min(devicePixelRatio || 1, 2);
    altCanvas.width = Math.round(altW * altDpr);
    altCanvas.height = Math.round(altH * altDpr);
    altCanvas.style.width = `${altW}px`;
    altCanvas.style.height = `${altH}px`;
    actx.setTransform(altDpr,0,0,altDpr,0,0);
    if(mode === 'battle') drawBattleReadyFallback();
  }

  function drawBattleReadyFallback(){
    actx.clearRect(0,0,altW,altH);
    const gr = actx.createLinearGradient(0,0,0,altH);
    gr.addColorStop(0,'#182c3b');
    gr.addColorStop(1,'#07131d');
    actx.fillStyle = gr;
    actx.fillRect(0,0,altW,altH);
    const cx=altW/2, cy=altH/2, rx=altW*.42, ry=altH*.37;
    actx.fillStyle='rgba(255,255,255,.025)';
    actx.beginPath();actx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);actx.fill();
    actx.strokeStyle='rgba(69,212,131,.95)';actx.lineWidth=5;
    actx.beginPath();actx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);actx.stroke();
    actx.fillStyle='rgba(255,255,255,.78)';actx.font='950 24px system-ui';actx.textAlign='center';
    actx.fillText('BOXING BATTLE ROYALE',cx,cy-8);
    actx.fillStyle='rgba(255,255,255,.45)';actx.font='650 11px system-ui';
    actx.fillText('START를 누르면 참가자 전원이 동시에 시작합니다',cx,cy+22);
  }

  function setMode(next){
    if(!modeInfo[next] || next === mode) return;
    if(run || counting){ pop('게임이 끝난 뒤 모드를 변경할 수 있습니다.'); return; }
    mode = next;
    modeTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    const info = modeInfo[mode];
    gameSub.textContent = info.game;
    arenaTitleText.textContent = info.arena;
    board.classList.toggle('altMode', mode === 'battle');
    winner.classList.remove('show');
    results.innerHTML = '<div class="empty">START를 누르면 순위가 표시됩니다.</div>';
    meta.textContent = `0 / ${parse().out.length}`;
    status.textContent = info.status;
    progress.textContent = mode === 'pinball' ? '진행 0%' : 'READY';
    start.textContent = 'START';
    eventFeed.innerHTML = '';
    if(mode === 'pinball'){
      cameraY = 0;
      setWaiting(parse().out);
      draw();
    }else{
      resizeAlt();
    }
  }

  function handleNames(){
    update();
    if(mode === 'battle'){
      meta.textContent = `0 / ${parse().out.length}`;
      resizeAlt();
    }
  }

  function startSelected(){
    if(mode === 'pinball') startGame();
  }

  modeTabs.forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.mode)));
  window.addEventListener('resize',()=>setTimeout(resizeAlt,30));
  resizeAlt();
  window.SB365Multi={startSelected,setMode,handleNames,get mode(){return mode;}};
})();

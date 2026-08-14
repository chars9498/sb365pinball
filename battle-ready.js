(() => {
  const canvas = document.querySelector('#altGame');
  const board = document.querySelector('#board');
  const names = document.querySelector('#names');
  const progress = document.querySelector('#progress');
  const status = document.querySelector('#status');
  if (!canvas || !board || !names || !progress || !status) return;

  const ctx = canvas.getContext('2d');
  const palette = ['#ff6b62','#ffd166','#45d483','#5bbcff','#a78bfa','#ff8cc8','#74d7c4','#f59e0b','#7dd3fc','#fb7185'];
  let lastFrame = 0;

  function hash(str){
    let h = 2166136261;
    for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619); }
    return h >>> 0;
  }

  function colorFor(name, i){ return palette[(hash(name) + i) % palette.length]; }

  function parseNames(){
    const out=[];
    for(const raw of names.value.split(/[\n,]+/)){
      const s=raw.trim(); if(!s) continue;
      const m=s.match(/^(.*?)(?:\*(\d+))?$/);
      const name=(m?.[1]||s).trim();
      const weight=Math.max(1,Math.min(8,Number(m?.[2]||1)));
      for(let i=0;i<weight;i++) out.push(name);
    }
    return out.slice(0,24);
  }

  function isBattleWaiting(){
    return window.SB365Multi?.mode === 'battle' && status.textContent.includes('대기 중');
  }

  function resize(){
    const r=board.getBoundingClientRect();
    const d=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(320,r.width), h=Math.max(440,r.height);
    const pw=Math.round(w*d), ph=Math.round(h*d);
    if(canvas.width!==pw || canvas.height!==ph){
      canvas.width=pw; canvas.height=ph;
      canvas.style.width=w+'px'; canvas.style.height=h+'px';
    }
    ctx.setTransform(d,0,0,d,0,0);
    return {w,h};
  }

  function background(w,h){
    const g=ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#182c3b'); g.addColorStop(1,'#07131d');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.save(); ctx.globalAlpha=.04; ctx.strokeStyle='#fff'; ctx.lineWidth=1;
    for(let x=-h;x<w+h;x+=48){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x-h,h); ctx.stroke(); }
    ctx.restore();
  }

  function glove(x,y,a,ext=0,alpha=1){
    ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.globalAlpha=alpha; ctx.translate(ext,0);
    ctx.fillStyle='#ff5f57'; ctx.strokeStyle='rgba(255,255,255,.78)'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.roundRect(-2,-7,13,14,5); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#d7423d'; ctx.fillRect(-7,-4,7,8); ctx.restore();
  }

  function draw(now){
    const {w,h}=resize(); background(w,h);
    const list=parseNames();
    const cx=w/2, cy=h/2+8;
    const rx=w*.42, ry=h*.37;
    const pulse=1+Math.sin(now/850)*.012;

    ctx.fillStyle='rgba(255,255,255,.025)';
    ctx.beginPath(); ctx.ellipse(cx,cy,rx*pulse,ry*pulse,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(69,212,131,.95)'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.ellipse(cx,cy,rx*pulse,ry*pulse,0,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.065)'; ctx.lineWidth=1;
    for(const k of [.25,.5,.75]){ ctx.beginPath(); ctx.ellipse(cx,cy,rx*k,ry*k,0,0,Math.PI*2); ctx.stroke(); }

    const bombA=now/2900;
    const bx=cx+Math.cos(bombA)*rx*.42, by=cy+Math.sin(bombA*.88)*ry*.36;
    const br=Math.min(76,ry*.22)*(1+.05*Math.sin(now/100));
    ctx.fillStyle='rgba(255,70,65,.055)'; ctx.strokeStyle='rgba(255,202,75,.82)'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#171717'; ctx.beginPath(); ctx.arc(bx,by,12,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffca4b'; ctx.font='900 11px system-ui'; ctx.textAlign='center'; ctx.fillText('💣',bx,by+4);

    const sa=-now/3400+1.2;
    const sx=cx+Math.cos(sa)*rx*.52, sy=cy+Math.sin(sa)*ry*.42;
    const sr=13+Math.sin(now/120)*2;
    ctx.fillStyle='rgba(91,188,255,.14)'; ctx.strokeStyle='#5bbcff'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#e2f7ff'; ctx.font='950 10px system-ui'; ctx.fillText('S',sx,sy+3);

    if(list.length){
      list.forEach((name,i)=>{
        const base=(i/list.length)*Math.PI*2 + (hash(name)%100)/350;
        const orbit=base + Math.sin(now/1800+i*.73)*.08;
        const lane=.25+((i*37)%55)/100;
        const x=cx+Math.cos(orbit)*rx*lane;
        const y=cy+Math.sin(orbit)*ry*lane;
        const r=Math.max(10,Math.min(14,14-list.length*.05));
        const face=orbit + Math.PI/2 + Math.sin(now/1200+i)*.45;
        const perp=face+Math.PI/2;
        glove(x+Math.cos(perp)*7,y+Math.sin(perp)*7,face,4+Math.max(0,Math.sin(now/420+i*1.9))*5);
        glove(x-Math.cos(perp)*7,y-Math.sin(perp)*7,face,0,.72);
        ctx.fillStyle=colorFor(name,i); ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,.78)'; ctx.lineWidth=1.2; ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font=`800 ${list.length>15?7:9}px system-ui`; ctx.textAlign='center';
        ctx.fillText(name,x,y+r+13,64);
      });
    }

    ctx.textAlign='center';
    ctx.fillStyle='rgba(255,255,255,.18)'; ctx.font='1000 58px system-ui'; ctx.fillText('READY',cx,cy+18);
    ctx.fillStyle='rgba(255,255,255,.82)'; ctx.font='950 23px system-ui'; ctx.fillText('BOXING BATTLE ROYALE',cx,cy-20);
    ctx.fillStyle='rgba(255,255,255,.5)'; ctx.font='650 11px system-ui';
    ctx.fillText(list.length ? `${list.length}명 대기 중 · START를 누르면 동시에 난투 시작` : '참가자를 입력하면 링 안에 미리 표시됩니다',cx,cy+42);
  }

  function loop(now){
    if(isBattleWaiting() && now-lastFrame>33){ draw(now); lastFrame=now; }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

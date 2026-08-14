function step(dt,now){
 const g=665,elapsed=Math.max(0,(now-t0)/1000);let alive=0,activeYs=[];
 for(const s of spinners)s.ang+=s.omega*dt;for(const r of rotors)r.hit=Math.max(0,(r.hit||0)-dt*4.8);
 for(const gate of gates){const a=elapsed*gate.freq*Math.PI*2+gate.phase;gate.gapX=clamp(W/2+Math.sin(a)*gate.ampW,gate.gapW/2+24,W-gate.gapW/2-24);gate.vx=Math.cos(a)*gate.ampW*gate.freq*Math.PI*2}
 for(const f of flippers){const a=elapsed*f.freq*Math.PI*2+f.phase;f.ang=f.base+Math.sin(a)*f.amp;f.omega=Math.cos(a)*f.amp*f.freq*Math.PI*2}
 for(const b of balls){
  if(b.done)continue;alive++;if(elapsed<b.release)continue;activeYs.push(b.y);
  b.vy+=g*dt;b.vx*=Math.pow(.9975,dt*60);b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.x-b.r<0){b.x=b.r;b.vx=Math.abs(b.vx)*.66}if(b.x+b.r>W){b.x=W-b.r;b.vx=-Math.abs(b.vx)*.66}
  for(const p of pegs)if(collideCircle(b,p,.84)&&Math.random()<.028)beep(185+Math.random()*65,.014,.0035);
  for(const s of rails)collideSegment(b,s,0,0,.81);
  for(const sp of spinners){const sg=spinnerSegment(sp),mx=(sg.x1+sg.x2)/2,my=(sg.y1+sg.y2)/2,rx=b.x-mx,ry=b.y-my,evx=-sp.omega*ry*.5,evy=sp.omega*rx*.5;if(collideSegment(b,sg,evx,evy,.84)&&Math.random()<.10)beep(300,.018,.005)}
  for(const r of rotors)if(collideRotor(b,r)&&Math.random()<.08)beep(265,.018,.0045);
  for(const gate of gates)for(const sg of gateSegments(gate))collideSegment(b,sg,gate.vx,0,.78);
  for(const f of flippers){const sg=flipperSegment(f),rx=b.x-f.x,ry=b.y-f.y,evx=-f.omega*ry*.62,evy=f.omega*rx*.62;if(collideSegment(b,sg,evx,evy,.88)&&Math.random()<.13)beep(340,.02,.006)}
  if(trail&&Math.random()<.24){b.tr.push({x:b.x,y:b.y,a:1});if(b.tr.length>16)b.tr.shift()}
  if(b.y-b.r>finishY)finishBall(b,now)
 }
 for(let i=0;i<balls.length;i++){const a=balls[i];if(a.done)continue;for(let j=i+1;j<balls.length;j++){const b=balls[j];if(b.done)continue;const dx=a.x-b.x,dy=a.y-b.y,rr=a.r+b.r-1.4,d2=dx*dx+dy*dy;if(d2<=.01||d2>=rr*rr)continue;const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=(rr-d)/2;a.x+=nx*ov;a.y+=ny*ov;b.x-=nx*ov;b.y-=ny*ov;const rel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(rel<0){const imp=-rel*.31;a.vx+=imp*nx;a.vy+=imp*ny;b.vx-=imp*nx;b.vy-=imp*ny}}}
 for(const b of balls)for(const t of b.tr)t.a*=.86;for(const q of conf){q.vy+=q.g*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.rot+=dt*5;q.a-=dt*.55}conf=conf.filter(q=>q.a>0);
 updateLiveRank();
 if(!manualCameraHeld){const leader=currentLeader();if(leader){const ly=leader.done?finishY:leader.y,target=clamp(ly-H*.38,0,worldH-H);cameraY+=(target-cameraY)*Math.min(1,dt*5.2)}}
 const leader=currentLeader(),leaderY=leader?(leader.done?finishY:leader.y):(cameraY+H*.42);const pct=clamp(Math.round((leaderY/finishY)*100),0,100);progress.textContent=`1등 진행 ${pct}%`;mapPct.textContent=`${pct}%`;
 if(alive===0&&balls.length)end()
}
function loop(now){const rate=fastForward?3:1,dt=Math.min((now-last)/1000,.03)*rate;last=now;const parts=Math.max(1,Math.min(10,Math.ceil(dt/.0095))),sub=dt/parts;for(let i=0;i<parts;i++)step(sub,now-(parts-1-i)*sub*1000);draw();if(run||conf.length)raf=requestAnimationFrame(loop)}
function render(){updateLiveRank();meta.textContent=`${fin.length} / ${balls.length}`;results.innerHTML='';for(const [i,b] of fin.entries()){const el=document.createElement('div');el.className='result';el.innerHTML=`<span class="rank">${i+1}</span><i class="colorDot" style="background:${b.c}"></i><span class="rname"></span><span class="time">${b.t.toFixed(2)}s</span>`;el.querySelector('.rname').textContent=b.name;results.appendChild(el)}}
function rr(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function sy(y){return y-cameraY}
function drawRail(s,c=ctx,miniMode=false,scale=1,ox=0,oy=0){const x1=ox+s.x1*scale,y1=oy+s.y1*scale,x2=ox+s.x2*scale,y2=oy+s.y2*scale;c.lineCap='round';c.lineWidth=Math.max(1,(s.w||7)*scale);const colors={split:'rgba(248,190,92,.94)',guide:'rgba(182,223,102,.92)',slot:'rgba(118,205,255,.92)',stair:'rgba(174,151,255,.92)',final:'rgba(255,142,177,.94)',gate:'rgba(255,214,105,.95)'};c.strokeStyle=colors[s.type]||'rgba(135,171,255,.9)';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}

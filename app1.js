
const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d'),mini=$('#minimap'),mctx=mini.getContext('2d'),board=$('#board'),names=$('#names'),start=$('#start'),shuffleBtn=$('#shuffle'),fastBtn=$('#fastBtn'),status=$('#status'),results=$('#results'),meta=$('#meta'),winner=$('#winner'),winnerName=$('#winnerName'),toast=$('#toast'),countdown=$('#countdown'),progress=$('#progress'),mapPct=$('#mapPct');
const unique=$('#unique'),total=$('#total'),liveRankList=$('#liveRankList');
const palette=['#ff4d5a','#ff9f43','#ffd93d','#45d483','#4da3ff','#4b5bdc','#b05cff'];
let W=900,H=720,dpr=1,worldH=3600,finishY=3480,cameraY=0,balls=[],pegs=[],rails=[],spinners=[],rotors=[],gates=[],flippers=[],courseMarks=[],fin=[],conf=[],run=false,counting=false,last=0,t0=0,raf=0,prepared=null,sound=true,trail=true,audio=null,winnerShown=false,manualCameraHeld=false,manualPointerId=null,fastForward=false,fastPointerId=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function parse(){const raw=names.value.split(/[\n,]+/).map(x=>x.trim()).filter(Boolean),out=[],u=new Set;for(const token of raw){const m=token.match(/^(.*?)(?:\*(\d+))?$/),label=(m?.[1]||'').trim();if(!label)continue;const n=clamp(parseInt(m?.[2]||'1')||1,1,30);u.add(label);for(let i=0;i<n&&out.length<180;i++)out.push(label)}return{out,u:[...u]}}
function currentRanking(){
 const finished=[...fin];
 const doneIds=new Set(finished.map(b=>b.id));
 const racing=balls.filter(b=>!b.done&&!doneIds.has(b.id)).sort((a,b)=>{
  if(a.waiting&&b.waiting)return a.id-b.id;
  if(a.waiting!==b.waiting)return a.waiting?1:-1;
  return b.y-a.y;
 });
 return [...finished,...racing];
}
function currentLeader(){const r=currentRanking();return r[0]||null}
function updateLiveRank(){
 if(!liveRankList)return;
 const r=currentRanking();
 if(!r.length){liveRankList.innerHTML='<div class="liveRankEmpty">대기 중</div>';return}
 const max=7;liveRankList.innerHTML='';
 r.slice(0,max).forEach((b,i)=>{const row=document.createElement('div');row.className='liveRankRow'+(i===0?' leader':'');const numColor=ballTextColor(b.c);row.innerHTML=`<span class="liveRankNo" style="background:${b.c};color:${numColor};border:1px solid rgba(255,255,255,.24)">${i+1}</span><i class="liveRankDot" style="background:${b.c}"></i><span class="liveRankName"></span>`;row.querySelector('.liveRankName').textContent=b.name;liveRankList.appendChild(row)});
 if(r.length>max){const more=document.createElement('div');more.className='liveRankMore';more.textContent=`+${r.length-max}명`;liveRankList.appendChild(more)}
}
function update(stage=true){const p=parse();unique.textContent=p.u.length;total.textContent=p.out.length;start.disabled=run||counting||p.out.length<2;if(stage&&!run&&!counting){cameraY=0;setWaiting(p.out)}save()}
function save(){localStorage.setItem('sb365v3.names',names.value);localStorage.setItem('sb365v3.sound',sound?'1':'0')}
function load(){let v;if(v=localStorage.getItem('sb365v3.names')){names.value=v;if(v.replace(/\s/g,'')==='임정훈,김희승,이범석,이세임')names.value='임정훈, 김희승, 이범석, 이세임, 이현우'}sound=localStorage.getItem('sb365v3.sound')!=='0';syncToggles()}
function syncToggles(){$('#soundBtn').textContent=sound?'🔊 효과음 ON':'🔇 효과음 OFF'}
function pop(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(pop.t);pop.t=setTimeout(()=>toast.classList.remove('show'),1500)}
function mix(a){for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function color(name){const u=parse().u,i=u.indexOf(name);return palette[(i<0?0:i)%palette.length]}
function ballTextColor(hex){const h=hex.replace('#',''),r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return r*.299+g*.587+b*.114<145?'#fff':'#17342d'}
function addPegGrid(y0,y1,rowGap=88,colGap=88){for(let y=y0,row=0;y<=y1;y+=rowGap,row++){const off=(row%2)*colGap*.5;for(let x=42+off;x<W-28;x+=colGap)pegs.push({x,y,r:7})}}
function addRail(x1,y1,x2,y2,w=7,type='rail'){rails.push({x1,y1,x2,y2,w,type})}
function addSpinner(x,y,len=150,ang=0,omega=1.7,w=10){spinners.push({x,y,len,ang,omega,w})}
function addRotor(x,y,r=82){rotors.push({x,y,r})}
function addGate(y,gapW=105,amp=.26,freq=.13){gates.push({y,gapW,ampW:W*amp,freq,phase:Math.random()*Math.PI*2,gapX:W/2,vx:0,w:12})}
function addFlipper(x,y,len,base,amp=.46,freq=.72,phase=0){flippers.push({x,y,len,base,amp,freq,phase,ang:base,omega:0,w:13})}
function mark(y,label){courseMarks.push({y,label})}
function buildCourse(){pegs=[];rails=[];spinners=[];rotors=[];gates=[];flippers=[];courseMarks=[];worldH=clamp(H*4.9,3400,4700);finishY=worldH-105;
 // 1. warm-up peg forest
 addPegGrid(145,480,86,88);mark(120,'PEG FOREST');
 // 2. visible Y split: central wedge sends balls left/right, outer guides merge them again
 const splitY=610;addRail(W*.5,splitY,W*.25,splitY+300,10,'split');addRail(W*.5,splitY,W*.75,splitY+300,10,'split');
 addRail(20,splitY+210,W*.24,splitY+430,9,'split');addRail(W-20,splitY+210,W*.76,splitY+430,9,'split');
 addRail(W*.24,splitY+430,W*.42,splitY+520,8,'split');addRail(W*.76,splitY+430,W*.58,splitY+520,8,'split');mark(splitY-45,'Y SPLIT');
 // 3. large rotating cross gate
 const gy=1240;addSpinner(W*.5,gy,Math.min(300,W*.58),0,1.18,12);addSpinner(W*.5,gy,Math.min(300,W*.58),Math.PI/2,1.18,12);mark(gy-95,'ROTATING GATE');
 // 4. big solid rotor: visible disc, no invisible force
 const ry=1560;addRotor(W*.5,ry,Math.min(92,W*.12));
 addRail(35,ry-115,W*.31,ry-25,8,'guide');addRail(W-35,ry-115,W*.69,ry-25,8,'guide');mark(ry-135,'ROUND BUMPER');
 // 5. pinball flippers
 const fy=1940;addFlipper(W*.18,fy,Math.min(190,W*.29),-.12,.42,.68,0);addFlipper(W*.82,fy,Math.min(190,W*.29),Math.PI+.12,.42,.68,Math.PI);
 addPegGrid(fy-250,fy-95,78,92);mark(fy-285,'AUTO FLIPPERS');
 // 6. four-lane slot section
 const sy0=2215,sy1=2520;for(const x of [W*.2,W*.4,W*.6,W*.8])addRail(x,sy0,x,sy1,9,'slot');
 addPegGrid(sy0-150,sy0-30,72,86);mark(sy0-185,'4-LANE SLOT');
 // 7. moving wall with one clearly visible moving gap
 const gateY=2780;addGate(gateY,Math.max(100,W*.14),.27,.11);mark(gateY-115,'MOVING GATE');
 // 8. staircase scramble
 const stairY=2980;addRail(W*.06,stairY,W*.45,stairY+90,8,'stair');addRail(W*.94,stairY+145,W*.55,stairY+235,8,'stair');
 addRail(W*.08,stairY+300,W*.43,stairY+380,8,'stair');mark(stairY-80,'STAIR SCRAMBLE');
 // 9. final three-way reversal zone based on finish position
 const fs=Math.max(stairY+500,finishY-610);
 addRail(W*.34,fs,W*.34,fs+230,9,'final');addRail(W*.66,fs,W*.66,fs+230,9,'final');
 pegs.push({x:W*.5,y:fs-25,r:9},{x:W*.25,y:fs+75,r:8},{x:W*.5,y:fs+130,r:8},{x:W*.75,y:fs+75,r:8});
 addPegGrid(fs+275,Math.max(fs+275,finishY-120),70,78);mark(fs-75,'FINAL CHAOS · 3 WAY');
}
function setWaiting(list){const r=Math.max(9,Math.min(13,13-Math.max(0,list.length-24)*.045)),n=list.length;if(!n){balls=[];draw();return}const maxCols=Math.max(2,Math.min(10,Math.floor((W-70)/(r*4.1)))),cols=Math.min(n,maxCols),rows=Math.ceil(n/cols),gapX=Math.min(70,(W-90)/Math.max(1,cols-1)),startX=W/2-gapX*(cols-1)/2,startY=91,rowGap=r*3.2;balls=list.map((name,i)=>{const row=Math.floor(i/cols),col=i%cols,items=Math.min(cols,n-row*cols),rowStart=W/2-gapX*(items-1)/2;return{id:i,name,c:color(name),r,x:rowStart+gapX*col,y:startY+row*rowGap,vx:0,vy:0,done:false,t:0,tr:[],release:999,waiting:true}});updateLiveRank();draw()}
function resize(){const r=board.getBoundingClientRect();const oldW=W;W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);mini.width=Math.round(130*dpr);mini.height=Math.round(260*dpr);mctx.setTransform(dpr,0,0,dpr,0,0);buildCourse();cameraY=clamp(cameraY,0,worldH-H);if(!run&&!counting&&balls.some(b=>b.waiting))setWaiting(parse().out);else if(oldW&&oldW!==W&&balls.length){const sx=W/oldW;for(const b of balls)b.x*=sx}draw()}
function mkBalls(list){const r=Math.max(8.5,Math.min(12.5,12.5-Math.max(0,list.length-32)*.035));balls=list.map((name,i)=>({id:i,name,c:color(name),r,x:W/2+(Math.random()-.5)*Math.min(120,W*.2),y:62-(i%9)*1.25,vx:(Math.random()-.5)*62,vy:Math.random()*8,done:false,t:0,tr:[],release:(i/list.length)*.72+Math.random()*.08,waiting:false}));updateLiveRank()}
function beep(freq=420,d=.035,vol=.025){if(!sound)return;try{audio ||= new (AudioContext||webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;o.type='sine';g.gain.value=vol;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+d);o.stop(audio.currentTime+d)}catch{}}
function startGame(){const p=parse();if(counting||run)return;if(p.out.length<2)return pop('참가자를 2명 이상 입력하세요.');winner.classList.remove('show');winnerShown=false;conf=[];fin=[];results.innerHTML='';const list=prepared?[...prepared]:mix([...p.out]);prepared=null;counting=true;names.disabled=shuffleBtn.disabled=true;start.disabled=true;start.textContent='START';status.textContent='준비 중';meta.textContent=`0 / ${list.length}`;cameraY=0;setWaiting(list);let n=3;countdown.textContent=n;countdown.classList.add('show');beep(560,.07,.035);const timer=setInterval(()=>{n--;if(n>0){countdown.textContent=n;beep(560+(3-n)*90,.07,.035);return}clearInterval(timer);countdown.textContent='GO!';beep(860,.1,.045);setTimeout(()=>{countdown.classList.remove('show');countdown.textContent='';counting=false;mkBalls(list);run=true;t0=last=performance.now();status.textContent='진행 중';cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)},380)},650)}
function showWinner(target,lastMode=false){if(!target||winnerShown)return;winnerShown=true;winnerName.textContent=target.name;winner.querySelector('small').textContent=lastMode?'THE LAST IS':'THE WINNER IS';winner.classList.add('show');burst(target.c);beep(780,.12,.05);setTimeout(()=>beep(990,.12,.04),120)}
function end(){run=false;counting=false;names.disabled=shuffleBtn.disabled=false;fastForward=false;fastBtn.classList.remove('active');const target=fin[0];showWinner(target,false);status.textContent=target?`완료 · 1등 ${target.name}`:'완료';start.textContent='AGAIN';update(false)}
function burst(c){const sy=clamp(70+cameraY,cameraY+50,cameraY+H*.4);for(let i=0;i<85;i++)conf.push({x:W/2,y:sy,vx:(Math.random()-.5)*360,vy:-80-Math.random()*280,g:450,a:1,s:3+Math.random()*5,c:i%3?c:palette[i%palette.length],rot:Math.random()*6})}
function finishBall(b,now){b.done=true;b.t=(now-t0)/1000;fin.push(b);render();beep(360+Math.min(fin.length,10)*30,.03,.018);if(fin.length===1){showWinner(b,false);status.textContent=`1등 도착 · ${b.name} · 순위 집계 중`}}
function collideCircle(b,o,restitution=.88){const dx=b.x-o.x,dy=b.y-o.y,rr=Math.max(0,b.r+o.r-1.15),d2=dx*dx+dy*dy;if(d2>=rr*rr||d2<.001)return false;const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=rr-d;b.x+=nx*ov;b.y+=ny*ov;const rel=b.vx*nx+b.vy*ny;if(rel<0){b.vx-=(1+restitution)*rel*nx;b.vy-=(1+restitution)*rel*ny}return true}
function collideSegment(b,s,extraVx=0,extraVy=0,restitution=.84){const vx=s.x2-s.x1,vy=s.y2-s.y1,l2=vx*vx+vy*vy;if(!l2)return false;let t=((b.x-s.x1)*vx+(b.y-s.y1)*vy)/l2;t=clamp(t,0,1);const px=s.x1+t*vx,py=s.y1+t*vy,dx=b.x-px,dy=b.y-py,rr=Math.max(0,b.r+(s.w||7)/2-1.15),d2=dx*dx+dy*dy;if(d2>=rr*rr||d2<.001)return false;const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=rr-d;b.x+=nx*ov;b.y+=ny*ov;const rel=(b.vx-extraVx)*nx+(b.vy-extraVy)*ny;if(rel<0){b.vx-=(1+restitution)*rel*nx;b.vy-=(1+restitution)*rel*ny;b.vx+=extraVx*.08;b.vy+=extraVy*.08}return true}
function spinnerSegment(s){const ca=Math.cos(s.ang),sa=Math.sin(s.ang),h=s.len/2;return{x1:s.x-ca*h,y1:s.y-sa*h,x2:s.x+ca*h,y2:s.y+sa*h,w:s.w}}
function flipperSegment(f){return{x1:f.x,y1:f.y,x2:f.x+Math.cos(f.ang)*f.len,y2:f.y+Math.sin(f.ang)*f.len,w:f.w}}
function gateSegments(g){const half=g.gapW/2,drop=Math.max(82,Math.min(125,W*.11)),edgeY=g.y-drop,gapY=g.y+18;return[{x1:0,y1:edgeY,x2:Math.max(0,g.gapX-half),y2:gapY,w:g.w,type:'gate'},{x1:Math.min(W,g.gapX+half),y1:gapY,x2:W,y2:edgeY,w:g.w,type:'gate'}]}
function collideRotor(b,r){const dx=b.x-r.x,dy=b.y-r.y,rr=Math.max(0,b.r+r.r-1.1),d2=dx*dx+dy*dy;if(d2>=rr*rr||d2<.001)return false;const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=rr-d;b.x+=nx*ov;b.y+=ny*ov;const rel=b.vx*nx+b.vy*ny;if(rel<0){b.vx-=(1+1.55)*rel*nx;b.vy-=(1+1.55)*rel*ny}const outward=b.vx*nx+b.vy*ny,minKick=1050;if(outward<minKick){const kick=minKick-outward;b.vx+=nx*kick;b.vy+=ny*kick}r.hit=1;return true}

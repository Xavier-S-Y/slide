import {Board,COLS,ROWS,COLORS} from './core.mjs';
const $=id=>document.getElementById(id);
const ui={menu:$('menu'),game:$('game'),pause:$('pauseModal'),over:$('gameOverModal'),canvas:$('board'),score:$('score'),lines:$('lines'),hintTitle:$('hintTitle'),hintText:$('hintText')};
const ctx=ui.canvas.getContext('2d');
let board=new Board(),selected=null,dragStart=null,dragGhost=null,startCol=0,score=0,lines=0,startedAt=0,paused=false,busy=false,nextBatch=[],visualRows=null,visualAlpha=null,clearRows=null,clearProgress=0;

function show(el,on){el.classList.toggle('hidden',!on)}
function resize(){const box=ui.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);ui.canvas.width=Math.round(box.width*dpr);ui.canvas.height=Math.round(box.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
function metrics(){const w=ui.canvas.clientWidth,h=ui.canvas.clientHeight,pad=7,top=48;return{w,h,pad,top,cell:(w-pad*2)/COLS,rowH:(h-top-pad)/ROWS};}
function roundRect(x,y,w,h,r,fill,stroke=null,alpha=1,dash=[],shadow=false){ctx.save();ctx.globalAlpha=alpha;if(shadow){ctx.shadowColor='#77213d66';ctx.shadowBlur=7;ctx.shadowOffsetY=4}ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.shadowColor='transparent';ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.setLineDash(dash);ctx.stroke()}ctx.restore();}
function draw(){if(!ui.canvas.width)return;const m=metrics();ctx.clearRect(0,0,m.w,m.h);roundRect(0,0,m.w,m.h,18,'#f5dfc5');ctx.fillStyle='#e8375522';ctx.fillRect(m.pad,10,m.w-m.pad*2,30);ctx.strokeStyle='#df3c59';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.beginPath();ctx.moveTo(m.pad,40);ctx.lineTo(m.w-m.pad,40);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#c52f4c';ctx.font='bold 10px sans-serif';ctx.textAlign='right';ctx.fillText('触碰顶部即结束',m.w-m.pad-4,29);
  ctx.strokeStyle='#b98f7448';ctx.lineWidth=1;for(let c=1;c<COLS;c++){ctx.beginPath();ctx.moveTo(m.pad+c*m.cell,m.top);ctx.lineTo(m.pad+c*m.cell,m.h-m.pad);ctx.stroke()}for(let r=1;r<ROWS;r++){ctx.beginPath();ctx.moveTo(m.pad,m.top+r*m.rowH);ctx.lineTo(m.w-m.pad,m.top+r*m.rowH);ctx.stroke()}
  if(dragGhost){const gx=m.pad+dragGhost.col*m.cell+3,gy=m.top+dragGhost.row*m.rowH+3,gw=dragGhost.length*m.cell-6,gh=m.rowH-6;ctx.save();ctx.strokeStyle='#9a5368';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.globalAlpha=.82;ctx.beginPath();ctx.roundRect(gx,gy,gw,gh,8);ctx.stroke();ctx.restore();}
  for(const s of board.sliders){const row=visualRows?.get(s.id)??s.row;if(row<-.9)continue;const x=m.pad+s.col*m.cell+2,y=m.top+row*m.rowH+2,w=s.length*m.cell-4,h=m.rowH-4,alpha=visualAlpha?.get(s.id)??1;ctx.save();if(selected?.id===s.id&&!busy){roundRect(x-4,y-4,w+8,h+8,11,'#ffe06a',null,.42*alpha);const d=board.fallDistance(s);if(d)roundRect(x,y+d*m.rowH,w,h,9,COLORS[s.colorId],COLORS[s.colorId],.22*alpha,[6,5]);}roundRect(x,y,w,h,9,COLORS[s.colorId],'#fff8eb',alpha,[],true);ctx.globalAlpha=alpha*.28;ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(x+5,y+4,Math.max(0,w-10),Math.max(3,h*.22),5);ctx.fill();ctx.restore();}
  if(clearRows){ctx.save();for(const row of clearRows){const y=m.top+row*m.rowH;ctx.globalAlpha=Math.sin(clearProgress*Math.PI)*.65;ctx.fillStyle='#fff7b0';ctx.fillRect(m.pad,y,m.w-m.pad*2,m.rowH);}ctx.restore();}
}
function sliderAt(clientX,clientY){const rect=ui.canvas.getBoundingClientRect(),m=metrics(),x=clientX-rect.left,y=clientY-rect.top,col=Math.floor((x-m.pad)/m.cell),row=Math.floor((y-m.top)/m.rowH);return board.sliders.find(s=>s.row===row&&col>=s.col&&col<s.col+s.length);}
function select(s){if(busy||paused)return;selected=s;ui.hintTitle.textContent=s?'已选择滑块 · 左右拖动':'选择滑块 · 左右拖动';draw();}
function renderPreview(){const el=$('nextBatch');el.replaceChildren();for(const p of nextBatch){const piece=document.createElement('i');piece.className='next-piece';piece.style.gridColumn=`${p.col+1} / span ${p.length}`;piece.style.gridRow='1';piece.style.background=COLORS[p.colorId];piece.title=`长度 ${p.length}`;el.appendChild(piece)}}
function tween(ms,update){return new Promise(resolve=>{const begin=performance.now();const frame=now=>{const raw=Math.min(1,(now-begin)/ms),t=1-Math.pow(1-raw,3);update(t,raw);draw();raw<1?requestAnimationFrame(frame):resolve()};requestAnimationFrame(frame)})}
async function animateRows(from,to,entering=new Set(),duration=260){visualRows=new Map();visualAlpha=new Map();await tween(duration,(t)=>{for(const s of board.sliders){const a=entering.has(s.id)?ROWS+.8:(from.get(s.id)??s.row),b=to.get(s.id)??s.row;visualRows.set(s.id,a+(b-a)*t);visualAlpha.set(s.id,entering.has(s.id)?Math.min(1,t*1.8):1)}});visualRows=null;visualAlpha=null;draw()}
function applyClear(result){if(result.total){lines+=result.total;score+=result.total*100*Math.max(1,result.chains);ui.lines.textContent=lines;ui.score.textContent=score;}}
async function animateClearChains(){let total=0,chains=0;while(true){const full=board.fullRows();if(!full.length)break;chains++;total+=full.length;const rows=new Set(full),clearing=new Set(board.sliders.filter(s=>rows.has(s.row)).map(s=>s.id));clearRows=rows;visualAlpha=new Map(board.sliders.map(s=>[s.id,1]));await tween(380,(t,raw)=>{clearProgress=raw;for(const id of clearing)visualAlpha.set(id,raw<.42?1:Math.max(0,1-(raw-.42)/.58))});board.sliders=board.sliders.filter(s=>!clearing.has(s.id));visualAlpha=null;clearRows=null;clearProgress=0;draw();const before=new Map(board.sliders.map(s=>[s.id,s.row]));board.settleAll();const after=new Map(board.sliders.map(s=>[s.id,s.row]));await animateRows(before,after,new Set(),260);}const result={total,chains};applyClear(result);return result;}
async function spawnPreviewBatch(){
  const batchToSpawn=nextBatch;
  ui.hintTitle.textContent='原最后一行上移';
  const beforeLift=new Map(board.sliders.map(s=>[s.id,s.row]));
  board.liftBottomRow();
  const afterLift=new Map(board.sliders.map(s=>[s.id,s.row]));
  await animateRows(beforeLift,afterLift,new Set(),260);

  ui.hintTitle.textContent='新滑块生成中…';
  const idsBefore=new Set(board.sliders.map(s=>s.id));
  board.addBatch(batchToSpawn);
  const spawnedRows=new Map(board.sliders.map(s=>[s.id,s.row]));
  const entering=new Set(board.sliders.filter(s=>!idsBefore.has(s.id)).map(s=>s.id));
  await animateRows(afterLift,spawnedRows,entering,300);

  ui.hintTitle.textContent='无支撑滑块自然下落';
  const beforeFall=new Map(board.sliders.map(s=>[s.id,s.row]));
  board.settleAll();
  const afterFall=new Map(board.sliders.map(s=>[s.id,s.row]));
  await animateRows(beforeFall,afterFall,new Set(),300);
  nextBatch=board.generateBatch();
  renderPreview();
}
async function commit(){if(!selected||busy||selected.col===startCol)return;busy=true;ui.hintTitle.textContent='1/3  滑块下落';const d=board.fallDistance(selected);if(d){const from=new Map([[selected.id,selected.row]]),target=selected.row+d;selected.row=target;await animateRows(from,new Map([[selected.id,target]]),new Set(),Math.min(700,360+d*90));ui.hintTitle.textContent='1/3  已落位';await new Promise(resolve=>setTimeout(resolve,280));}else await new Promise(resolve=>setTimeout(resolve,160));ui.hintTitle.textContent='2/3  检查并消除';const moveClear=await animateClearChains();await new Promise(resolve=>setTimeout(resolve,moveClear.total?180:140));await new Promise(resolve=>requestAnimationFrame(resolve));ui.hintTitle.textContent='3/3  生成新滑块';await spawnPreviewBatch();if(board.fullRows().length){ui.hintTitle.textContent='生成凑满一行，立即消除';await animateClearChains();if(board.sliders.length===0){ui.hintTitle.textContent='棋盘已清空，自动再生成';await new Promise(resolve=>setTimeout(resolve,180));await spawnPreviewBatch();}}if(board.isGameOver()){finish();return;}selected=null;busy=false;ui.hintTitle.textContent='选择滑块 · 左右拖动';}
function start(){board=new Board();board.seed();nextBatch=board.generateBatch();renderPreview();selected=null;score=0;lines=0;busy=false;paused=false;startedAt=Date.now();ui.score.textContent='0';ui.lines.textContent='0';show(ui.menu,false);show(ui.game,true);show(ui.pause,false);show(ui.over,false);requestAnimationFrame(resize);}
function home(){show(ui.menu,true);show(ui.game,false);show(ui.pause,false);show(ui.over,false);paused=false;}
function togglePause(on){if(!ui.game.classList.contains('hidden')&&!busy){paused=on;show(ui.pause,on)}}
function finish(){busy=true;const seconds=Math.floor((Date.now()-startedAt)/1000),best=Math.max(score,Number(localStorage.getItem('turkish-blocks-best')||0));localStorage.setItem('turkish-blocks-best',String(best));$('finalScore').textContent=score;$('finalLines').textContent=lines;$('finalTime').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;$('bestScore').textContent=best;show(ui.over,true);}

ui.canvas.addEventListener('pointerdown',e=>{const s=sliderAt(e.clientX,e.clientY);if(!s)return;select(s);dragStart=e.clientX;startCol=s.col;dragGhost={row:s.row,col:s.col,length:s.length};ui.canvas.setPointerCapture(e.pointerId);draw()});
ui.canvas.addEventListener('pointermove',e=>{if(!selected||dragStart===null||busy)return;const m=metrics(),delta=Math.round((e.clientX-dragStart)/m.cell),target=Math.max(0,Math.min(COLS-selected.length,startCol+delta));selected.col=board.legalCol(selected,target);draw()});
ui.canvas.addEventListener('pointerup',()=>{if(dragStart===null)return;dragStart=null;dragGhost=null;draw();commit()});
ui.canvas.addEventListener('pointercancel',()=>{dragStart=null;dragGhost=null;draw()});
function nudge(dir){if(!selected||busy)return;if(dragStart===null)startCol=selected.col;selected.col=board.legalCol(selected,selected.col+dir);draw()}
$('startButton').onclick=start;$('restartButton').onclick=start;$('homeButton').onclick=home;$('pauseHomeButton').onclick=home;$('pauseButton').onclick=()=>togglePause(true);$('resumeButton').onclick=()=>togglePause(false);$('leftButton').onclick=()=>nudge(-1);$('rightButton').onclick=()=>nudge(1);$('confirmButton').onclick=commit;
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')nudge(-1);if(e.key==='ArrowRight')nudge(1);if(e.key==='Enter'||e.key===' ')commit();if(e.key==='Escape')togglePause(!paused)});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!ui.game.classList.contains('hidden'))togglePause(true)});window.addEventListener('resize',resize);

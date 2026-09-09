import {Board,COLS,ROWS,COLORS} from './core.mjs';
const $=id=>document.getElementById(id);
const ui={menu:$('menu'),game:$('game'),pause:$('pauseModal'),over:$('gameOverModal'),canvas:$('board'),score:$('score'),lines:$('lines'),hintTitle:$('hintTitle'),hintText:$('hintText')};
const ctx=ui.canvas.getContext('2d');
let board=new Board(),selected=null,dragStart=null,dragGhost=null,startCol=0,score=0,lines=0,startedAt=0,paused=false,busy=false,nextBatch=[],visualRows=null,visualAlpha=null,clearRows=null,clearProgress=0;

function show(el,on){if(el)el.classList.toggle('hidden',!on)}
function resize(){const box=ui.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);ui.canvas.width=Math.round(box.width*dpr);ui.canvas.height=Math.round(box.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
function metrics(){const w=ui.canvas.clientWidth,h=ui.canvas.clientHeight,pad=0,top=0;return{w,h,pad,top,cell:w/COLS,rowH:h/ROWS};}
function roundRect(x,y,w,h,r,fill,stroke=null,alpha=1,dash=[],shadow=false){ctx.save();ctx.globalAlpha=alpha;if(shadow){ctx.shadowColor='#74a8a64d';ctx.shadowBlur=4;ctx.shadowOffsetY=2}ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.shadowColor='transparent';ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.setLineDash(dash);ctx.stroke()}ctx.restore();}
function draw(){if(!ui.canvas.width)return;const m=metrics();ctx.clearRect(0,0,m.w,m.h);ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,m.w,m.h);
  ctx.strokeStyle='#b7ddd8aa';ctx.lineWidth=1;for(let c=1;c<COLS;c++){ctx.beginPath();ctx.moveTo(c*m.cell,0);ctx.lineTo(c*m.cell,m.h);ctx.stroke()}for(let r=1;r<ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*m.rowH);ctx.lineTo(m.w,r*m.rowH);ctx.stroke()}
  if(dragGhost){const gx=m.pad+dragGhost.col*m.cell+3,gy=m.top+dragGhost.row*m.rowH+3,gw=dragGhost.length*m.cell-6,gh=m.rowH-6;ctx.save();ctx.strokeStyle='#72b8b0';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.globalAlpha=.82;ctx.beginPath();ctx.roundRect(gx,gy,gw,gh,8);ctx.stroke();ctx.restore();}
  for(const s of board.sliders){const row=visualRows?.get(s.id)??s.row;if(row<-.9)continue;const x=s.col*m.cell,y=row*m.rowH,w=s.length*m.cell,h=m.rowH,alpha=visualAlpha?.get(s.id)??1;ctx.save();if(selected?.id===s.id&&!busy){roundRect(x,y,w,h,6,'#fff1a8',null,.38*alpha);const d=board.fallDistance(s);if(d)roundRect(x,y+d*m.rowH,w,h,6,COLORS[s.colorId],'#82c7bf',.2*alpha,[5,4]);}roundRect(x,y,w,h,6,COLORS[s.colorId],'#fffdf7',alpha,[],true);ctx.restore();}
  if(clearRows){ctx.save();for(const row of clearRows){const y=m.top+row*m.rowH;ctx.globalAlpha=Math.sin(clearProgress*Math.PI)*.65;ctx.fillStyle='#fff7b0';ctx.fillRect(m.pad,y,m.w-m.pad*2,m.rowH);}ctx.restore();}
}
function sliderAt(clientX,clientY){const rect=ui.canvas.getBoundingClientRect(),m=metrics(),x=clientX-rect.left,y=clientY-rect.top,col=Math.floor((x-m.pad)/m.cell),row=Math.floor((y-m.top)/m.rowH);return board.sliders.find(s=>s.row===row&&col>=s.col&&col<s.col+s.length);}
function select(s){if(busy||paused)return;selected=s;ui.hintTitle.textContent=s?'已选择滑块 · 左右拖动':'选择滑块 · 左右拖动';draw();}
function renderPreview(){const el=$('nextBatch');el.replaceChildren();for(const p of nextBatch){const piece=document.createElement('i');piece.className='next-piece';piece.style.gridColumn=`${p.col+1} / span ${p.length}`;piece.style.gridRow='1';piece.style.background=COLORS[p.colorId];piece.title=`长度 ${p.length}`;el.appendChild(piece)}}
function tween(ms,update){return new Promise(resolve=>{const begin=performance.now();const frame=now=>{const raw=Math.min(1,(now-begin)/ms),t=1-Math.pow(1-raw,3);update(t,raw);draw();raw<1?requestAnimationFrame(frame):resolve()};requestAnimationFrame(frame)})}
async function animateRows(from,to,entering=new Set(),duration=260){visualRows=new Map();visualAlpha=new Map();await tween(duration,(t)=>{for(const s of board.sliders){const a=entering.has(s.id)?ROWS+.8:(from.get(s.id)??s.row),b=to.get(s.id)??s.row;visualRows.set(s.id,a+(b-a)*t);visualAlpha.set(s.id,entering.has(s.id)?Math.min(1,t*1.8):1)}});visualRows=null;visualAlpha=null;draw()}
function applyClear(result){if(result.total){lines+=result.total;score+=result.total*100*Math.max(1,result.chains);ui.lines.textContent=lines;ui.score.textContent=score;}}
async function animateClearRows(full){const rows=new Set(full),clearing=new Set(board.sliders.filter(s=>rows.has(s.row)).map(s=>s.id));clearRows=rows;visualAlpha=new Map(board.sliders.map(s=>[s.id,1]));await tween(380,(t,raw)=>{clearProgress=raw;for(const id of clearing)visualAlpha.set(id,raw<.42?1:Math.max(0,1-(raw-.42)/.58))});board.sliders=board.sliders.filter(s=>!clearing.has(s.id));visualAlpha=null;clearRows=null;clearProgress=0;draw();}
async function animateSettleAll(){const before=new Map(board.sliders.map(s=>[s.id,s.row]));board.settleAll();const after=new Map(board.sliders.map(s=>[s.id,s.row]));const moved=board.sliders.some(s=>before.get(s.id)!==after.get(s.id));if(moved){ui.hintTitle.textContent='连锁下落中…';await animateRows(before,after,new Set(),300);}return moved;}
async function resolveUntilStable(){let total=0,chains=0;while(true){const full=board.fullRows();let cleared=false;if(full.length){ui.hintTitle.textContent='消除判定 · 满行消除';chains++;total+=full.length;cleared=true;await animateClearRows(full);}const moved=await animateSettleAll();if(!cleared&&!moved)break;}const result={total,chains};applyClear(result);return result;}
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
  await animateSettleAll();
  nextBatch=board.generateBatch();
  renderPreview();
}
async function commit(){if(!selected||busy||selected.col===startCol)return;busy=true;ui.hintTitle.textContent='1/3  滑块下落';const d=board.fallDistance(selected);if(d){const from=new Map([[selected.id,selected.row]]),target=selected.row+d;selected.row=target;await animateRows(from,new Map([[selected.id,target]]),new Set(),Math.min(700,360+d*90));ui.hintTitle.textContent='1/3  已落位';await new Promise(resolve=>setTimeout(resolve,280));}else await new Promise(resolve=>setTimeout(resolve,160));ui.hintTitle.textContent='2/3  连锁结算';const moveClear=await resolveUntilStable();await new Promise(resolve=>setTimeout(resolve,moveClear.total?180:140));await new Promise(resolve=>requestAnimationFrame(resolve));ui.hintTitle.textContent='3/3  生成新滑块';await spawnPreviewBatch();if(board.fullRows().length){ui.hintTitle.textContent='生成凑满一行，立即消除';await resolveUntilStable();if(board.sliders.length===0){ui.hintTitle.textContent='棋盘已清空，自动再生成';await new Promise(resolve=>setTimeout(resolve,180));await spawnPreviewBatch();}}if(board.isGameOver()){finish();return;}selected=null;busy=false;ui.hintTitle.textContent='选择滑块 · 左右拖动';}
function start(){board=new Board();board.seed();nextBatch=board.generateBatch();renderPreview();selected=null;score=0;lines=0;busy=false;paused=false;startedAt=Date.now();ui.score.textContent='0';ui.lines.textContent='0';show(ui.menu,false);show(ui.game,true);show(ui.pause,false);show(ui.over,false);resize();requestAnimationFrame(resize);}
function home(){show(ui.menu,true);show(ui.game,false);show(ui.pause,false);show(ui.over,false);paused=false;}
function togglePause(on){if(!ui.game.classList.contains('hidden')&&!busy){paused=on;show(ui.pause,on)}}
function finish(){busy=true;const seconds=Math.floor((Date.now()-startedAt)/1000),best=Math.max(score,Number(localStorage.getItem('turkish-blocks-best')||0));localStorage.setItem('turkish-blocks-best',String(best));$('finalScore').textContent=score;$('finalLines').textContent=lines;$('finalTime').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;$('bestScore').textContent=best;show(ui.over,true);}

ui.canvas.addEventListener('pointerdown',e=>{const s=sliderAt(e.clientX,e.clientY);if(!s)return;select(s);dragStart=e.clientX;startCol=s.col;dragGhost={row:s.row,col:s.col,length:s.length};ui.canvas.setPointerCapture(e.pointerId);draw()});
ui.canvas.addEventListener('pointermove',e=>{if(!selected||dragStart===null||busy)return;const m=metrics(),delta=Math.round((e.clientX-dragStart)/m.cell),target=Math.max(0,Math.min(COLS-selected.length,startCol+delta));selected.col=board.legalCol(selected,target);draw()});
function finishDrag(){if(dragStart===null)return;dragStart=null;dragGhost=null;draw();commit()}
ui.canvas.addEventListener('pointerup',finishDrag);
ui.canvas.addEventListener('pointercancel',finishDrag);
ui.canvas.addEventListener('lostpointercapture',finishDrag);
function nudge(dir){if(!selected||busy)return;if(dragStart===null)startCol=selected.col;selected.col=board.legalCol(selected,selected.col+dir);draw()}
$('restartButton').onclick=start;$('homeButton').onclick=start;$('pauseHomeButton').onclick=start;$('pauseButton').onclick=()=>togglePause(true);$('resumeButton').onclick=()=>togglePause(false);$('leftButton').onclick=()=>nudge(-1);$('rightButton').onclick=()=>nudge(1);$('confirmButton').onclick=commit;
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')nudge(-1);if(e.key==='ArrowRight')nudge(1);if(e.key==='Enter'||e.key===' ')commit();if(e.key==='Escape')togglePause(!paused)});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!ui.game.classList.contains('hidden'))togglePause(true)});window.addEventListener('resize',resize);new ResizeObserver(resize).observe($('boardWrap'));start();

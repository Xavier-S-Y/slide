import {Board,COLS} from './core.mjs';

export const DIFFICULTY_PROFILES=[
  {minScore:0,name:'轻松',candidates:4,ease:[55,100],total:[3,5],doubleChance:0,doubleTotals:null},
  {minScore:1000,name:'普通',candidates:6,ease:[40,75],total:[4,6],doubleChance:0,doubleTotals:null},
  {minScore:2500,name:'困难',candidates:8,ease:[25,60],total:[5,7],doubleChance:.03,doubleTotals:[[4,5],[3,5]]},
  {minScore:4500,name:'专家',candidates:10,ease:[15,45],total:[6,7],doubleChance:.05,doubleTotals:[[4,6],[4,5]]},
  {minScore:7000,name:'极限',candidates:12,ease:[10,35],total:[7,7],doubleChance:.08,doubleTotals:[[5,6],[4,6]]}
];

export function difficultyIndex(score){let index=0;for(let i=1;i<DIFFICULTY_PROFILES.length;i++)if(score>=DIFFICULTY_PROFILES[i].minScore)index=i;return index}
export function createDifficultyState(){return{doubleCooldown:0,lowEaseStreak:0,noMoveStreak:0}}

function cloneBoard(source){const copy=new Board(source.random);copy.sliders=source.sliders.map(s=>({...s}));copy.nextId=source.nextId;return copy}
function gapLengths(cells){const gaps=[];let run=0;for(const occupied of cells){if(!occupied)run++;else if(run){gaps.push(run);run=0}}if(run)gaps.push(run);return gaps}

export function evaluateBatch(board,batch){
  const sim=cloneBoard(board);sim.insertBatch(batch);const immediate=sim.fullRows().length;
  const map=sim.cells();let nearOne=0,nearTwo=0,gapMatch=false;
  const lengths=new Set(sim.sliders.map(s=>s.length));
  for(let row=0;row<map.length;row++){
    const filled=map[row].filter(Boolean).length;
    if(filled===7)nearOne++;
    if(filled===6&&gapLengths(map[row].map(Boolean)).includes(2))nearTwo++;
    if(gapLengths(map[row].map(Boolean)).some(g=>lengths.has(g)))gapMatch=true;
  }
  let oneMove=0,mobility=0;
  for(const slider of sim.sliders){
    let positions=0;
    for(let col=0;col+slider.length<=COLS;col++){
      if(col===slider.col||sim.legalCol(slider,col)!==col)continue;
      positions++;
      if(oneMove<3){const moved=cloneBoard(sim),target=moved.sliders.find(s=>s.id===slider.id);target.col=col;target.row+=moved.fallDistance(target);if(moved.fullRows().length)oneMove++}
    }
    mobility+=positions;
  }
  const averageMobility=sim.sliders.length?mobility/sim.sliders.length:0;
  const ease=Math.min(100,immediate*40+oneMove*12+Math.min(20,nearOne*10)+Math.min(12,nearTwo*6)+(gapMatch?10:0)+(averageMobility>=3?8:0));
  return{ease,oneMove,immediate};
}

function chooseBatch(board,profile,state,totalRange,random){
  const candidates=[];
  for(let i=0;i<profile.candidates;i++){
    const batch=board.generateBatch(totalRange[0],totalRange[1]);
    const rating=evaluateBatch(board,batch);
    candidates.push({batch,...rating});
  }
  const danger=board.sliders.some(s=>s.row<=2);
  let min=profile.ease[0],max=profile.ease[1];
  if(state.lowEaseStreak>=2||danger)min=Math.max(min,30);
  let pool=candidates.filter(c=>c.ease>=min&&c.ease<=max);
  if(state.noMoveStreak>=3){const playable=pool.filter(c=>c.oneMove>0);if(playable.length)pool=playable}
  if(!pool.length){const midpoint=(min+max)/2;pool=[...candidates].sort((a,b)=>Math.abs(a.ease-midpoint)-Math.abs(b.ease-midpoint)).slice(0,Math.max(1,Math.ceil(candidates.length/3)))}
  const selected=pool[Math.floor(random()*pool.length)];
  state.lowEaseStreak=selected.ease<20?state.lowEaseStreak+1:0;
  state.noMoveStreak=selected.oneMove===0?state.noMoveStreak+1:0;
  return selected.batch;
}

function simulateEventStep(board,batch){const sim=cloneBoard(board);sim.insertBatch(batch);sim.clearChains();return sim}

export function planGenerationEvent(board,score,state=createDifficultyState(),random=Math.random){
  const profile=DIFFICULTY_PROFILES[difficultyIndex(score)],danger=board.sliders.some(s=>s.row<=2);
  const canDouble=profile.doubleChance>0&&state.doubleCooldown===0&&!danger;
  const double=canDouble&&random()<profile.doubleChance;
  if(state.doubleCooldown>0)state.doubleCooldown--;
  if(double)state.doubleCooldown=4;
  const ranges=double?profile.doubleTotals:[profile.total],batches=[];
  let simulated=cloneBoard(board);
  for(const range of ranges){const batch=chooseBatch(simulated,profile,state,range,random);batches.push(batch);simulated=simulateEventStep(simulated,batch)}
  return{batches,level:difficultyIndex(score),name:profile.name,double};
}

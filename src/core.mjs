export const COLS=8;
export const ROWS=12;
const COLORS=['#ef5776','#ff9f43','#f7d154','#5ac8b0','#6bb6e8'];

export class Board {
  constructor(random=Math.random){this.random=random;this.sliders=[];this.nextId=1;}
  add(row,col,length,colorId=Math.floor(this.random()*COLORS.length),itemType=null){const s={id:String(this.nextId++),row,col,length,colorId,itemType};this.sliders.push(s);return s;}
  cells(exceptId=null){const map=Array.from({length:ROWS},()=>Array(COLS).fill(null));for(const s of this.sliders){if(s.id===exceptId)continue;for(let c=s.col;c<s.col+s.length;c++)if(s.row>=0&&s.row<ROWS)map[s.row][c]=s.id;}return map;}
  canPlace(slider,row,col){if(col<0||col+slider.length>COLS||row<0||row>=ROWS)return false;const map=this.cells(slider.id);for(let c=col;c<col+slider.length;c++)if(map[row][c])return false;return true;}
  legalCol(slider,target){const dir=Math.sign(target-slider.col);let col=slider.col;while(col!==target){const next=col+dir;if(!this.canPlace(slider,slider.row,next))break;col=next;}return col;}
  fallDistance(slider){const map=this.cells(slider.id);let row=slider.row;while(row<ROWS-1){let free=true;for(let c=slider.col;c<slider.col+slider.length;c++)if(map[row+1][c]){free=false;break;}if(!free)break;row++;}return row-slider.row;}
  settleAll(){let moved=true;while(moved){moved=false;const ordered=[...this.sliders].sort((a,b)=>b.row-a.row);for(const s of ordered){const d=this.fallDistance(s);if(d){s.row+=d;moved=true;}}}}
  fullRows(){const map=this.cells();const rows=[];for(let r=0;r<ROWS;r++)if(map[r].every(Boolean))rows.push(r);return rows;}
  clearChains(){let total=0,chains=0;while(true){const rows=this.fullRows();if(!rows.length)break;const set=new Set(rows);this.sliders=this.sliders.filter(s=>!set.has(s.row));total+=rows.length;chains++;this.settleAll();}return {total,chains};}
  generateBatch(){const total=3+Math.floor(this.random()*5);let remaining=total;const lengths=[];while(remaining){const len=1+Math.floor(this.random()*Math.min(4,remaining));lengths.push(len);remaining-=len;}const occupied=Array(COLS).fill(false);const placements=[];for(const length of lengths.sort((a,b)=>b-a)){const options=[];for(let col=0;col+length<=COLS;col++){let ok=true;for(let c=col;c<col+length;c++)if(occupied[c])ok=false;if(ok)options.push(col);}if(!options.length)continue;const col=options[Math.floor(this.random()*options.length)];for(let c=col;c<col+length;c++)occupied[c]=true;placements.push({col,length,colorId:Math.floor(this.random()*COLORS.length)});}return placements;}
  liftBottomRow(){
    const pushed=new Set();
    const pushUp=(slider)=>{
      if(pushed.has(slider.id))return;pushed.add(slider.id);
      const targetRow=slider.row-1;
      const blockers=this.sliders.filter(other=>other.id!==slider.id&&other.row===targetRow&&other.col<slider.col+slider.length&&other.col+other.length>slider.col);
      for(const blocker of blockers)pushUp(blocker);
      slider.row=targetRow;
    };
    const bottomBlockers=this.sliders.filter(s=>s.row===ROWS-1);
    for(const blocker of bottomBlockers)pushUp(blocker);
    return bottomBlockers;
  }
  addBatch(batch){
    for(const item of batch)this.add(ROWS-1,item.col,item.length,item.colorId,item.itemType||null);
    return batch;
  }
  insertBatch(batch=this.generateBatch()){
    this.liftBottomRow();
    this.addBatch(batch);
    this.settleAll();
    return batch;
  }
  isGameOver(){return this.sliders.some(s=>s.row<=0);}
  seed(){this.sliders=[];this.add(11,0,3,0);this.add(11,4,2,1);this.add(10,0,2,2);this.add(10,4,2,3);this.add(9,1,3,1);this.add(9,5,1,4);this.settleAll();}
}
export {COLORS};

export const TOOL_DEFS={move:{icon:'↗',name:'单块移动',weight:35},single:{icon:'✦',name:'单块消除',weight:30},row:{icon:'━',name:'一行消除',weight:15},color:{icon:'●',name:'同色消除',weight:20}};

export function decorateBatch(batch,noItemBatches=0,random=Math.random){
  const getsItem=noItemBatches>=3||random()<.3;
  if(!getsItem||!batch.length)return{batch,noItemBatches:noItemBatches+1};
  const roll=random()*100;
  let total=0,itemType='color';
  for(const[type,data]of Object.entries(TOOL_DEFS)){total+=data.weight;if(roll<total){itemType=type;break}}
  batch[Math.floor(random()*batch.length)].itemType=itemType;
  return{batch,noItemBatches:0};
}

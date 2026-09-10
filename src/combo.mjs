export function comboMultiplier(combo){
  if(combo>=5)return 2.5;
  if(combo===4)return 2;
  if(combo===3)return 1.5;
  if(combo===2)return 1.2;
  return 1;
}

export function advanceCombo(currentCombo,clearedRows){
  return clearedRows>0?currentCombo+clearedRows:0;
}

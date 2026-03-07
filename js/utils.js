export function shuffle(array){

for(let i=array.length-1;i>0;i--){

const j=Math.floor(Math.random()*(i+1))

[array[i],array[j]]=[array[j],array[i]]

}

return array

}

export function mafiaCount(playerCount){

return Math.max(1,Math.floor(playerCount/5))

}
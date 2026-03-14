export const roles = {

villager:{
team:"village",
nightAction:null,
receivesNightResult:false,
description:"You have no special ability. Find the mafia."
},

mafia:{
team:"mafia",
nightAction:"kill",
receivesNightResult:false,
description:"Work with the mafia to eliminate villagers each night."
},

doctor:{
team:"village",
nightAction:"save",
receivesNightResult:false,
description:"Choose one player each night to protect from being killed."
},

sheriff:{
team:"village",
nightAction:"investigate",
receivesNightResult:true,
description:"Investigate a player each night to learn if they are suspicious."
},

mayor:{
team:"village",
nightAction:null,
receivesNightResult:false,
description:"You have no night action, but your vote counts as 2."
},

jester:{
team:"neutral",
nightAction:null,
receivesNightResult:false,
description:"You win if the town votes you out."
},

executioner:{
team:"neutral",
nightAction:null,
receivesNightResult:false,
description:"You win if your assigned target is voted out by the town."
}

}

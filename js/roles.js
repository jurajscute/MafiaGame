export const roles = {

villager:{
team:"village",
nightAction:null,
receivesNightResult:false,
noResultText:"You dream about a big carrot.",
description:"You have no special ability. Find the mafia."
},

doctor:{
team:"village",
nightAction:"save",
receivesNightResult:false,
noResultText:"Your pacient didn't need any help tonight.",
description:"Choose one player each night to protect from being killed."
},

mafia:{
team:"mafia",
nightAction:"kill",
receivesNightResult:false,
noResultText:"Kill successful...",
description:"Work with the mafia to eliminate villagers each night."
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
noResultText:"You're fast asleep.",
description:"You have no night action, but your vote counts as 2."
},

jester:{
team:"neutral",
nightAction:null,
receivesNightResult:false,
noResultText:"You're thinking of a way to trick the town.",
description:"You win if the town votes you out."
},

executioner:{
team:"neutral",
nightAction:null,
receivesNightResult:false,
noResultText:"The hate for your target grows.",
description:"You win if your assigned target is voted out by the town."
}

}

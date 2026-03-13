export const roles = {

villager:{
team:"village",
nightAction:null,
description:"You have no special ability. Find the mafia."
},

mafia:{
team:"mafia",
nightAction:"kill",
description:"Work with the mafia to eliminate villagers each night."
},

doctor:{
team:"village",
nightAction:"save",
description:"Choose one player each night to protect from being killed."
},

sheriff:{
team:"village",
nightAction:"investigate",
description:"Investigate a player each night to learn if they are suspicious."
},


mayor:{
team:"village",
nightAction:null,
description:"You have no night action, but your vote counts as 2."
},

jester:{
team:"neutral",
nightAction:null,
description:"You win if the town votes you out."
},

executioner:{
team:"neutral",
nightAction:null,
description:"You win if your assigned target is voted out by the town."
}

}

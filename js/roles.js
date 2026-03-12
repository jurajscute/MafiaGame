export const roles = {

villager:{
team:"village",
nightAction:null
},

mafia:{
team:"mafia",
nightAction:"kill"
},

doctor:{
team:"village",
nightAction:"save"
},

sheriff:{
team:"village",
nightAction:"investigate"
},

jester:{
team:"neutral",
nightAction:null
}

}

export const roles = {

mafia:{
nightAction:"kill",
description:"Work with the mafia to eliminate villagers each night."
},

doctor:{
nightAction:"save",
description:"Choose one player each night to protect from being killed."
},

sheriff:{
nightAction:"investigate",
description:"Investigate a player each night to learn if they are suspicious."
},

jester:{
description:"You win if the town votes you out."
},

villager:{
description:"You have no special ability. Find the mafia."
}

}
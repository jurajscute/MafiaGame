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
noResultText:"Your snoring echos through the town.",
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
noResultText:"The hate towards your target grows stronger.",
description:"You win if your assigned target is voted out by the town."
},

spirit:{
team:"village",
nightAction:null,
receivesNightResult:true,
noResultText:"You drift into the realm of dreams.",
description:"If you are killed at night and not saved, you may reveal one player's role to the town before morning."
},

}

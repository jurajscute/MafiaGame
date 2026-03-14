export const roles = {

villager:{
team:"village",
nightAction:null,
receivesNightResult:false,
noResultTexts:[
"You dream about a big carrot.",
"'Maybe the mafia isn't so bad?' you think to yourself...",
"Seeing a person die isn't something you really want.",
"This is the best sleep you've ever had.",
"Being in this village, you learned: 'Life isn't fair.'.",
"The night is suspiciously quiet...",
"You had a dream about a giat loaf of bread.",
"You woke up and noticed you drooled.",
"You wonder why everyone keeps calling you dumb :(",
"There's only so many people the mafia can kill, you're safe right?",
"Being a villager isn't easy, but atleast... nevermind, it's the worst.",
"Good thing you are such a deep sleeper, you didn't hear any of the screams.",
"You had a dream about the juciest apple ever.",
"Dreaming is for losers, you just see darkness."],
description:"You have no special ability. Find the mafia."
},

doctor:{
team:"village",
nightAction:"save",
receivesNightResult:false,
noResultTexts:[
"Your patient didn't need any help tonight.",
"Nothing major with the patient tonight.",
"All seems in order with your patient.",
"Other than the weird rash, your patient seems fine.",
"Your patient seems to have an allergy to peanuts, other than that they're fine.",
"You failed to protect the right person, guilt consumes you.",
"While catering to your patient you hear a scream somewhere else..."],
description:"Choose one player each night to protect from being killed."
},

mafia:{
team:"mafia",
nightAction:"kill",
receivesNightResult:false,
noResultTexts:[
"Kill successful...",
"Your target has been killed.",
"Blood drips from the end of your knife.",
"There's still blood on your clothes.",
"You've successfully killed them.",
"Murder, sleep, eat, repeat.",
"The mafia will be proud of you."],
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
noResultTexts:[
"Your snoring echos through the town.",
"You sleep comfortably in your rich bed.",
"The town depends on you, remember that!",
"You dream about how rich you are.",
"It's hard sleeping with so many coins in your pockets.",
"You dream about being even more powerful.",
"'I am the best!' you think to yourself."],
description:"You have no night action, but your vote counts as 2."
},

jester:{
team:"neutral",
nightAction:null,
receivesNightResult:false,
noResultTexts:[
"You're thinking of a way to trick the town.",
"You try to sleep, but you're too excited!",
"You can't stop giggling to yourself.",
"The jingles from your suit are keeping you up.",
"Everyone seems to think you're crazy... prove them right.",
"No one understands the struggle of being insane.",
"You've been laughing at your joke for the last 5 hours."],
description:"You win if the town votes you out."
},

executioner:{
team:"neutral",
nightAction:null,
receivesNightResult:false,
noResultTexts:[
"The hate towards your target grows stronger.",
"You want them out, now.",
"If it was legal you'd kill your target yourself.",
"The thought of having to spend even one more day with your target drives you mad.",
"Get. Them. Out.",
"You dream of a beautiful world where your target is dead.",
"Why does everyone like them so much!?"],
description:"You win if your assigned target is voted out by the town."
},

spirit:{
team:"village",
nightAction:null,
receivesNightResult:true,
noResultTexts:[
"You drift into the realm of dreams.",
"You enter the spirit realm.",
"It feels nice being so spiritually connected.",
"As you descend into dreams, you feel... free.",
"You just want peace.",
"You came to terms with the possibility that you'll die.",
"Why can't everyone just be friends?"],
description:"If you are killed at night and not saved, you may reveal one player's role to the town before morning."
},

}

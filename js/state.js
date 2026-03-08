export const state = {

phase:"home",

players:[],

night:0,

nightTurnIndex: 0,

rolesEnabled:{
doctor:true,
sheriff:true,
jester:true
},

votes:{},

roleWeights: {
doctor: 50,
sheriff: 50,
jester: 50
},

nightActions:{
kill:null,
save:null,
investigate:null
}

}

export function resetVotes(){

state.votes={}

}

export function resetNightActions(){

state.nightActions={
kill:null,
save:null,
investigate:null
}

}


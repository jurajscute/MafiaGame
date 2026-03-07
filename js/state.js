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

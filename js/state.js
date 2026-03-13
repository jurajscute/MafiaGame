export const state = {

phase:"home",

players:[],

gameStarted: false,

doctorRevealSave: false,

doctorExtraOpen: false,

sheriffExactReveal: false,
sheriffExtraOpen: false,

mafiaCountOverride: 0,

rolesSectionOpen: true,

presetsSectionOpen: false,

gameLog: [],
gameStats: {
nights: 0,
votesCast: 0,
eliminations: 0
},
hostMode: false,

night:0,

nightTurnIndex: 0,

rolesEnabled:{
doctor:true,
sheriff:true,
jester:true
},

executionerTargets: {},

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
},

roleCounts:{
doctor:1,
sheriff:1,
jester:1
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

export function resetGameTracking(){
state.gameLog = []
state.gameStats = {
nights: 0,
votesCast: 0,
eliminations: 0
}
}

export function addLogEntry(text){
state.gameLog.push(text)
}

window.toggleHostMode = function(enabled){

state.hostMode = enabled

localStorage.setItem(
"mafiaHostMode",
JSON.stringify(enabled)
)

}

const ACTION_SELECTION = "ActionSelection";
const BIDDING = "Bidding";
const PAY_PASS = "PayPass";
const TARGETING = "Targeting";
const VERSUS = "Versus";

const STATUS_OFFLINE = "Offline";
const STATUS_ONLINE = "Online";

const STACK_SIZE = 4;
const BIDDING_TIME = 10;


function shuffle(array) {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

const ITEMS_ALL = shuffle(
  ["ice", "rock", "bread", "carrot", "pill", "fish", "log", "cherry", "water", "sauce", "juice", "mold"]
);
const ITEMS = ITEMS_ALL.slice(0, 12);

function PotValue(state, playerName){
  const pot = state.players[playerName].pot;
  return pot.v5 * 5 + pot.v10 * 10 + pot.v25 * 25 + pot.v50 * 50;
}

function PotEmpty(state, playerName){
  const pot = state.players[playerName].pot;
  return (pot.v0 + pot.v5 + pot.v10 + pot.v25 + pot.v50) === 0;
}

function canTarget(state, name, item){
  if(item in state.players[state.turn].items && state.players[state.turn].items[item] > 0 && state.players[state.turn].items[item] < STACK_SIZE){
    if(item in state.players[name].items && state.players[name].items[item] > 0 && state.players[name].items[item] < STACK_SIZE){
      if(name !== state.turn){
        return true;
      }
    }
  }
  return false;
}

export { 
  ACTION_SELECTION,
  BIDDING,
  PAY_PASS,
  TARGETING,
  VERSUS,
  STATUS_OFFLINE,
  STATUS_ONLINE,
  STACK_SIZE,
  BIDDING_TIME,
  ITEMS,
  PotValue,
  canTarget,
  PotEmpty,
};
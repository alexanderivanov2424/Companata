const ACTION_SELECTION = "ActionSelection";
const BIDDING = "Bidding";
const PAY_PASS = "PayPass";
const TARGETING = "Targeting";
const VERSUS = "Versus";
const VERSUS_HOLD = "VersusHold";

const STATUS_OFFLINE = "Offline";
const STATUS_ONLINE = "Online";

const STACK_SIZE = 4;
const BIDDING_TIME = 10;
const VERSUS_HOLD_TIME = 3;


function shuffle(array) {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

const ITEM_TO_HOVER = {
  ice: "Ice",
  rock: "Rock",
  bread: "Bread",
  carrot: "Carrot",
  pill: "Pill",
  fish: "Fish",
  log: "Log",
  cherry: "Cherry",
  water: "Water",
  sauce: "Sauce",
  juice: "Juice",
  mold: "Mold",
  kettle: "Kettle",
  virus: "The Rona",
  leg: "Chicken Leg",
}

const ITEMS_ALL = shuffle([...Object.keys(ITEM_TO_HOVER)]);
const ITEMS = ITEMS_ALL;
// const ITEMS = ITEMS_ALL.slice(0, 1);

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

function getBidWinner(state, lobby){
  var highestBid = -1;
  var highestBidder = state.turn;
  lobby.forEach( (playerName) => {
    if(state.confirms.includes(playerName)){
      return;
    }
    const potValue = PotValue(state, playerName);
    if(!PotEmpty(state, playerName)){
      if(potValue > highestBid || (potValue === highestBid && state.biddingOrder.indexOf(playerName) < state.biddingOrder.indexOf(highestBidder))){
        highestBid = potValue;
        highestBidder = playerName;

      }
    }
  });
  return highestBidder;
}

export { 
  ACTION_SELECTION,
  BIDDING,
  PAY_PASS,
  TARGETING,
  VERSUS,
  VERSUS_HOLD,
  STATUS_OFFLINE,
  STATUS_ONLINE,
  STACK_SIZE,
  BIDDING_TIME,
  VERSUS_HOLD_TIME,
  ITEMS,
  ITEM_TO_HOVER,
  PotValue,
  canTarget,
  PotEmpty,
  getBidWinner,
};
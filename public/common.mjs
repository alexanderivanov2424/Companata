const DEBUG = false;
const ACTION_SELECTION = 'ActionSelection';
const BIDDING = 'Bidding';
const PAY_PASS = 'PayPass';
const TARGETING = 'Targeting';
const VERSUS = 'Versus';
const VERSUS_HOLD = 'VersusHold';

const STATUS_OFFLINE = 'Offline';
const STATUS_ONLINE = 'Online';

const STACK_SIZE = 4;
const BIDDING_TIME = 10;
const VERSUS_HOLD_TIME = 3;
const STACKS_TO_WIN = 4;

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
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
  virus: "Virus",
  leg: "Chicken Leg",
  sushi: "Sushi",
  brick: "Brick",
  computer: "Computer",
  mellon: "Mellon",
  spaghetti: "Spaphetti",
  onigiri: "Onigiri",
  shrimp: "Shrimp",
  gear: "Gear",
  light: "Light Bulb",
  shirt: "Shirt",
  tools: "Tool Box",
  present: "Present",
  tree: "Tree",
  wreath: "Wreath",
  turkey: "Turkey",
  pumpkin: "Pumpkin",
  leaf: "Leaf",
  magnet: "Magnet",
  ant: "Ant",
  anthill: "Ant Hill",
  bee: "Bee",
  beehive: "Bee Hive",
  soccer: "Soccer",
  cast: "cast",
  tooth: "tooth",
  incognito: "Incognito",
  hat: "Hat",
  soup: "Soup",
  banana: "Banana",
  mario: "Mario",
  minecraft: "Minecraft",
  tetris: "Tetris",
  sun: "Sun",
  galaxy: "Galaxy",
  planet: "Planet",
  comet: "Comet",
  satellite: "Satellite",
  gasoline: "Gasoline",
  house: "House",
  strawberry: "Strawberry",
  blueberry: "Blueberry",
  dango: "Dango",
  cake: "Cake",
  cookie: "Cookie",
  chocolate: "Chocolate",
  rot: "Rot",
  poop: "Poop",
  soap: "Soap",
  toothbrush: "Toothbrush",
  milk: "Milk",
  butter: "Butter",
  grass: "Grass",
  plane: "Plane",
  car: "Car",
  paper: "Paper",
  pencil: "Pencil",
  blackberry: "Blackberry",
  pong: "Pong",
  universe: "Universe",
  motorcycle: "Motorcycle",
  tornado: "Tornado",
  wine: "Wine",
  cheese: "Cheese",
  clouds: "Clouds",
  dice: "Dice",
}

// const ITEMS_ALL = [...Object.keys(ITEM_TO_HOVER)]
const ITEMS_ALL = shuffle([...Object.keys(ITEM_TO_HOVER)]);

//const ITEMS = ITEMS_ALL;
const ITEMS = ITEMS_ALL.slice(0, 10);
//const ITEMS = ITEMS_ALL.slice(58, 80);

function GetWinner(state){
  for (const [playerName, data] of Object.entries(state.players)) {
    var fullStacks = 0;
    for( const [item, count] of Object.entries(data.items) ){
      if(count >= STACK_SIZE){
        fullStacks ++;
      }
    }
    if(fullStacks >= STACKS_TO_WIN){
      return playerName;
    }
  }
  return null;
}

function PotValue(state, playerName) {
  const pot = state.players[playerName].pot;
  return pot.v5 * 5 + pot.v10 * 10 + pot.v25 * 25 + pot.v50 * 50;
}

function PotEmpty(state, playerName) {
  const pot = state.players[playerName].pot;
  return pot.v0 + pot.v5 + pot.v10 + pot.v25 + pot.v50 === 0;
}

function canTarget(state, name, item) {
  if (
    item in state.players[state.turn].items &&
    state.players[state.turn].items[item] > 0 &&
    state.players[state.turn].items[item] < STACK_SIZE
  ) {
    if (
      item in state.players[name].items &&
      state.players[name].items[item] > 0 &&
      state.players[name].items[item] < STACK_SIZE
    ) {
      if (name !== state.turn) {
        return true;
      }
    }
  }
  return false;
}

function getBidWinner(state, lobby) {
  var highestBid = -1;
  var highestBidder = state.turn;
  lobby.forEach((playerName) => {
    if (state.confirms.includes(playerName)) {
      return;
    }
    const potValue = PotValue(state, playerName);
    if (!PotEmpty(state, playerName)) {
      if (
        potValue > highestBid ||
        (potValue === highestBid &&
          state.biddingOrder.indexOf(playerName) <
            state.biddingOrder.indexOf(highestBidder))
      ) {
        highestBid = potValue;
        highestBidder = playerName;
      }
    }
  });
  return highestBidder;
}

export {
  DEBUG,
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
  GetWinner,
  PotValue,
  canTarget,
  PotEmpty,
  getBidWinner,
};

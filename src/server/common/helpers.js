import { EXPECTED_PLAYERS, DIFFICULTY, STACKS_TO_WIN } from './settings.js';

export const DEBUG = false;

export const ACTION_SELECTION = 'ActionSelection';
export const BIDDING = 'Bidding';
export const PAY_PASS = 'PayPass';
export const TARGETING = 'Targeting';
export const VERSUS = 'Versus';
export const VERSUS_HOLD = 'VersusHold';

/*
Phases:
ActionSelection - select if next phase is Bidding (big for what is on the stand) or Targeting (target another players item)
Bidding - new item is added to stand, everyone except current turn bids for item(s) on stand
PayPass - current turn either buys item on stand or gives it to target but takes money
Targeting - current turn selects whos item they want to target
Versus - current turn and target each place bids for items on stand
*/

export const STATUS_OFFLINE = 'Offline';
export const STATUS_ONLINE = 'Online';

export const BIDDING_TIME = 10 + Math.ceil(10 * DIFFICULTY);
export const VERSUS_HOLD_TIME = 3;

export const NUM_ITEMS =
  EXPECTED_PLAYERS * (STACKS_TO_WIN - 1) +
  Math.ceil(DIFFICULTY * EXPECTED_PLAYERS);

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

export const ITEM_TO_HOVER = {
  ice: 'Ice',
  rock: 'Rock',
  bread: 'Bread',
  carrot: 'Carrot',
  pill: 'Pill',
  fish: 'Fish',
  log: 'Log',
  cherry: 'Cherry',
  water: 'Water',
  sauce: 'Sauce',
  juice: 'Juice',
  mold: 'Mold',
  kettle: 'Kettle',
  virus: 'Virus',
  leg: 'Chicken Leg',
  sushi: 'Sushi',
  brick: 'Brick',
  computer: 'Computer',
  mellon: 'Mellon',
  spaghetti: 'Spaphetti',
  onigiri: 'Onigiri',
  shrimp: 'Shrimp',
  gear: 'Gear',
  light: 'Light Bulb',
  shirt: 'Shirt',
  tools: 'Tool Box',
  present: 'Present',
  tree: 'Tree',
  wreath: 'Wreath',
  turkey: 'Turkey',
  pumpkin: 'Pumpkin',
  leaf: 'Leaf',
  magnet: 'Magnet',
  ant: 'Ant',
  anthill: 'Ant Hill',
  bee: 'Bee',
  beehive: 'Bee Hive',
  soccer: 'Soccer',
  cast: 'cast',
  tooth: 'tooth',
  incognito: 'Incognito',
  hat: 'Hat',
  soup: 'Soup',
  banana: 'Banana',
  mario: 'Mario',
  minecraft: 'Minecraft',
  tetris: 'Tetris',
  sun: 'Sun',
  galaxy: 'Galaxy',
  planet: 'Planet',
  comet: 'Comet',
  satellite: 'Satellite',
  gasoline: 'Gasoline',
  house: 'House',
  strawberry: 'Strawberry',
  blueberry: 'Blueberry',
  dango: 'Dango',
  cake: 'Cake',
  cookie: 'Cookie',
  chocolate: 'Chocolate',
  rot: 'Rot',
  poop: 'Poop',
  soap: 'Soap',
  toothbrush: 'Toothbrush',
  milk: 'Milk',
  butter: 'Butter',
  grass: 'Grass',
  plane: 'Plane',
  car: 'Car',
  paper: 'Paper',
  pencil: 'Pencil',
  blackberry: 'Blackberry',
  pong: 'Pong',
  universe: 'Universe',
  motorcycle: 'Motorcycle',
  tornado: 'Tornado',
  wine: 'Wine',
  cheese: 'Cheese',
  clouds: 'Clouds',
  dice: 'Dice', //
  icecream: 'Icecream',
  bike: 'Bike',
  skateboard: 'Stakeboard',
  baseball: 'Baseball',
  basketball: 'Basketball',
  borshe: 'Borshe',
  Pierogi: 'Pierogi',
  matzah: 'Matzah',
  paella: 'Paella',
  taco: 'Taco',
  burger: 'Burger',
  football: 'Football',
  lollipop: 'Lollipop',
  fork: 'Fork',
  knife: 'Knife',
  spoon: 'Spoon',
  clock: 'Clock',
  cactus: 'Cactus',
  boat: 'Boat',
  helicopter: 'Helicopter',
  rocket: 'Rocket',
  penguin: 'Penguin',
  bell: 'Bell',
  medal: 'Medal',
  bitcoin: 'Bitcoin',
  map: 'Map',
  top: 'Spinning Top',
  birthday: 'Birthday Hat',
  kite: 'Kite',
  needle: 'Needle',
  thimble: 'Thimble',
  syringe: 'syringe',
  thread: 'Thread',
  teddy: 'Teady Bear',
  tophat: 'Top Hat',
  heels: 'Heels',
  fries: 'Fries',
  diamond: 'Diamond',
  microphone: 'Microphone',
  sax: 'Saxophone',
  tuba: 'Tuba',
  violin: 'Violin',
  ring: 'Ring',
  handbag: 'Handbag',
  backpack: 'Backpack',
  phone: 'Phone',
  camera: 'Camera',
  candle: 'Candle',
  book: 'Book',
  dune: 'Dune',
  looking: 'Looking Glass',
  flashlight: 'Flashlight',
  glasses: 'Glasses',
  saw: 'Saw',
  scissors: 'Scissors',
  squirrel: 'Squirrel',
  broccoli: 'Broccoli',
  stool: 'Stool',
  toilet: 'Toilet',
  bandaid: 'Bandaid',
  microscope: 'Microsope',
  telescope: 'Telescope',
};

export const ITEMS_ALL = shuffle([...Object.keys(ITEM_TO_HOVER)]);
//export const ITEMS_ALL = [...Object.keys(ITEM_TO_HOVER)];

export const ITEMS = ITEMS_ALL.slice(0, NUM_ITEMS);
//export const ITEMS = ITEMS_ALL.slice(120, 145);

export function GetWinnerName(state) {
  return (
    Object.values(state.players).find((player) => player.isWinner())?.name ??
    null
  );
}

export function getBidWinner(state) {
  var highestBid = -1;
  var highestBidder = state.currentPlayer;
  for (const player of Object.values(state.players)) {
    if (state.confirms.includes(player)) {
      continue;
    }
    const potValue = player.potValue();
    if (!player.pot.isEmpty()) {
      if (
        potValue > highestBid ||
        (potValue === highestBid &&
          state.biddingOrder.indexOf(player) <
            state.biddingOrder.indexOf(highestBidder))
      ) {
        highestBid = potValue;
        highestBidder = player;
      }
    }
  }
  return highestBidder;
}

export function canPlayerTarget(state, player) {
  return [...player.items.keys()].some((item) =>
    [...Object.values(state.players)].some((targetPlayer) =>
      player.canTarget(targetPlayer, item)
    )
  );
}

export function CanSomeoneBid(state) {
  return [...Object.values(state.players)].some(
    (player) =>
      player !== state.currentPlayer &&
      !state.confirms.includes(player.name) &&
      player.coinCount() > 0
  );
}

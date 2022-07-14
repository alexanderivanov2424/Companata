export const DEBUG = false;
export const ACTION_SELECTION = 'ActionSelection';
export const BIDDING = 'Bidding';
export const PAY_PASS = 'PayPass';
export const TARGETING = 'Targeting';
export const VERSUS = 'Versus';
export const VERSUS_HOLD = 'VersusHold';

export const STATUS_OFFLINE = 'Offline';
export const STATUS_ONLINE = 'Online';

export const STACK_SIZE = 4;
export const BIDDING_TIME = 10;
export const VERSUS_HOLD_TIME = 3;
export const STACKS_TO_WIN = 4;

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
  dice: 'Dice',
};

export const ITEMS_ALL = shuffle([...Object.keys(ITEM_TO_HOVER)]);

export const ITEMS = ITEMS_ALL.slice(0, 10);

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
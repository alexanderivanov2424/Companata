const e = React.createElement;

const state = {
  players: [
    {
      name: "Joe",
      wallet: {
        0: 1, // 0s
        5: 2, // 5s
        10: 3, // 10s
        25: 4, // 25s
        50: 5, // 50s
      },
      items: {
        ice: 4,
      }
    },
    {
      name: "Bob",
      wallet: {
        0: 0, // 0s
        5: 0, // 5s
        10: 0, // 10s
        25: 0, // 25s
        50: 0, // 50s
      },
      items: {},
    },
    {
      name: "Alice",
      wallet: {
        0: 0, // 0s
        5: 0, // 5s
        10: 0, // 10s
        25: 0, // 25s
        50: 0, // 50s
      },
      items: {},
    },
    {
      name: "Willy",
      wallet: {
        v0: 0, // 0s
        v5: 0, // 5s
        v10: 0, // 10s
        v25: 0, // 25s
        v50: 0, // 50s
      },
      items: {},
    },
  ],
}

function Coin({ value, i }){
  // TODO: use i for position of coin in stack
  return e('div', { className: `coin_${value}` });
}

function CoinStack({ value, amount, i }) {
  // TODO: use i for position of stack in wallet
  return new Array(amount).map((_, i) => e(Coin, { value, i, key: i }));
}

function Wallet({ v0, v5, v10, v25, v50 }) {
  return [
    e(CoinStack, { value: 0, amount: v0, i: 0, key: 0 }),
    e(CoinStack, { value: 5, amount: v5, i: 1, key: 1 }),
    e(CoinStack, { value: 10, amount: v10, i: 2, key: 2 }),
    e(CoinStack, { value: 25, amount: v25, i: 3, key: 3 }),
    e(CoinStack, { value: 50, amount: v50, i: 4, key: 4 }),
  ];
}

function Item({ item, i }){
  // TODO: use i for position of item in stack
  return e('div', { className: `item_${value}`, key: i });
}

function ItemStack({ item, amount, i }){
  // TODO: use i for position of stack in pouch
  return new Array(amount).map((_, i) => e(Item, { item, i }));
}

function Pouch(itemProps){
  return Object.entries(itemProps).map(([item, amount], i) => e(ItemStack, { item, amount, i, key: i }));
}

function PlayerName({ name }){
  return e('span', { className: 'player_name'}, name);
}

function Player({ name, wallet, items, x, y, angle }) {
  return e(
    'div',
    {
      className: 'player-name',
      id: 'table',
      style: { //TODO do this properly with a container 
        transform: `translate(0px,20px) rotate(${angle}rad)`,
      },
    },
    e(PlayerName, { name }),
    e(Wallet, wallet),
    e(Pouch, items),
  );
}

function GameScreen({ players }) {
  angleShift = -(2 * Math.PI) / players.length;
  const radius = 200;
  const x = Math.round(width/2 + radius * Math.cos(angle));
  const y = Math.round(height/2 + radius * Math.sin(angle));
  //const radius = 200;
  //const x = Math.round(width/2 + radius * Math.cos(angle));
  //const y = Math.round(height/2 + radius * Math.sin(angle));
  return e(
    'div',
    { id: 'table' },
    players.map((playerProps, i) => e(Player, { ...playerProps, angle: (i * angleShift), key: i })),
  );
}

const domContainer = document.querySelector('#root');
const root = ReactDOM.createRoot(domContainer);
root.render(e(GameScreen, state));
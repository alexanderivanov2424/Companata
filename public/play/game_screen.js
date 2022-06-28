const state = {
  players: [
    {
      name: "Joe",
      wallet: {
        v0: 1,
        v5: 2,
        v10: 3,
        v25: 4,
        v50: 5,
      },
      items: {
        ice: 4,
      }
    },
    {
      name: "Bob",
      wallet: {
        v0: 0,
        v5: 0,
        v10: 0,
        v25: 0,
        v50: 0,
      },
      items: {},
    },
    {
      name: "Alice",
      wallet: {
        v0: 0,
        v5: 0,
        v10: 0,
        v25: 0,
        v50: 0,
      },
      items: {},
    },
    {
      name: "Willy",
      wallet: {
        v0: 0,
        v5: 0,
        v10: 0,
        v25: 0,
        v50: 0,
      },
      items: {},
    },
  ],
}

function Coin({ value }) {
  return <div className={`coin coin-${value}`}>{value}</div>;
}

function CoinStack({ value, amount }) {
  return new Array(amount).fill().map((_, i) => (
    <Coin value={value} key={i} />
  ));
}

function Wallet({ v0, v5, v10, v25, v50 }) {
  return (
    <div className="wallet">
      <CoinStack value={0} amount={v0} />
      <CoinStack value={5} amount={v5} />
      <CoinStack value={10} amount={v10} />
      <CoinStack value={25} amount={v25} />
      <CoinStack value={50} amount={v50} />
    </div>
  );
}

function Item({ item }) {
  return <div className="item">{item}</div>;
}

function ItemStack({ item, amount }) {
  return new Array(amount).fill().map((_, i) => (
    <Item item={item} key={i} />
  ));
}

function Pouch({ items }) {
  return (
    <div className="pouch">
      {Object.entries(items).map(([item, amount], i) => (
        <ItemStack item={item} amount={amount} key={i} />
      ))}
    </div>
  );
}

function PlayerName({ name }) {
  return <span className="player-name">{name}</span>;
}

function Player({ name, wallet, items }) {
  return (
    <div className="player">
      <Wallet wallet={wallet} />
      <PlayerName name={name} />
      <Pouch items={items} />
    </div>
  );
}

function GameScreen({ players }) {
  const radius = 200;

  return (
    <div id="table">
      {players.map((playerProps, i) => {
        const angle = (2 * Math.PI) / players.length * i;

        return (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transformOrigin: '0 0',
              transform: `rotate(${angle}rad) translateY(${radius}px)`,
            }}
            key={i}
          >
            <Player {...playerProps} />
          </div>
        );
      })}
    </div>
  );
}

const domContainer = document.querySelector('#root');
const root = ReactDOM.createRoot(domContainer);
root.render(<GameScreen {...state} />);

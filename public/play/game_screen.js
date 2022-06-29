/*
Phases:
ActionSelection - select if next phase is Bidding (big for what is on the stand) or Targeting (target another players item)
Bidding - if stand emtpy new item is added, everyone except current turn bids for item(s) on stand
PayPass - current turn either buys item on stand or gives it to target but takes money
Targeting - current turn selects whos item they want to target
Versus - current turn and target each place bids for items on stand

maybe some explicit animation phases so that there is time to play animations? these can probably be added later as needed.

*/


const state = {
  turn: "Alice",
  phase: "ActionSelection",
  stand: [ //can be 1 or two things
    "ice" 
  ],
  target: "", //person who bid the most or target in Targeting phase
  timer: 0,
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
        bread: 2
      },
      pot: {
        v0: 1,
        v5: 2,
        v10: 3,
        v25: 4,
        v50: 5,
      },
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
      items: {
        rock: 2,
        bread: 2
      },
      pot: {
        v0: 0,
        v5: 0,
        v10: 0,
        v25: 0,
        v50: 0,
      },
    },
    {
      name: "Alice",
      wallet: {
        v0: 0,
        v5: 0,
        v10: 4,
        v25: 0,
        v50: 0,
      },
      items: {},
      pot: {
        v0: 0,
        v5: 0,
        v10: 0,
        v25: 0,
        v50: 0,
      },
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
      pot: {
        v0: 0,
        v5: 0,
        v10: 0,
        v25: 0,
        v50: 0,
      },
    },
  ],
}

//TODO buttons need to be hidden / shown on respective phases
function TargetingButton({}){} //button to enter Targeting phase

function SubmitBidButton({}){} //button to submit secret bid amount in Targeting phase

function BiddingButton({}){} //button to ender Bidding phase

function PayBidButton({}){} //pay bid amount for item

function TakePotButton({}){} //take bid amount but no item

function CancelBid({}){} //button to retract bid (durring Bidding phase)

function Stand({}){ // where items in question are placed
 //TODO horizontal box, will only ever hold one or two items
}

function Middle({}){ // the middle of the table
 //TODO ring of wallets around to represent what everyone is bidding
 //TODO stand in the middle to attach items to
}

function Coin({ value, pos}) {
  return <div className={`coin coin-${value}`}>{value}</div>;
}

function CoinStack({ value, amount }) { //TODO need to overlap coins to fit
  return (
    <div className="coin-stack">
      {new Array(amount).fill().map((_, i) => (
          <Coin value={value} key={i} />
        ))}
    </div>
  );  
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

function Item({ item , amount}) {
  return <div className={`item ${item}`}>{amount}</div>;
}

function Pouch({ items }) {
  return (
    <div className="pouch">
      {Object.entries(items).map(([item, amount], i) => (
        <Item item={item} amount={amount} key={i} />
      ))}
    </div>
  );
}

function PlayerName({ name }) {
  return <span className="player-name">{name}</span>;
}

function Player({ name, wallet, items }) {
  console.log(wallet);
  return (
    <div className="player">
      <Wallet v0={wallet.v0} v5={wallet.v5} v10={wallet.v10} v25={wallet.v25} v50={wallet.v50}/>
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

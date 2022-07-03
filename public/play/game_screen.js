/*
Phases:
ActionSelection - select if next phase is Bidding (big for what is on the stand) or Targeting (target another players item)
Bidding - new item is added to stand, everyone except current turn bids for item(s) on stand
PayPass - current turn either buys item on stand or gives it to target but takes money
Targeting - current turn selects whos item they want to target
Versus - current turn and target each place bids for items on stand

maybe some explicit animation phases so that there is time to play animations? these can probably be added later as needed.

*/
const ACTION_SELECTION = "ActionSelection"
const BIDDING = "Bidding"
const PAY_PASS = "PayPass"
const TARGETING = "Targeting"
const VERSUS = "Versus"

const owner = "Joe";


//TODO add to state:
// turn counter
// items in the stash
// visibility for versus
// targeting highlight items you can take

// Extra features
// visibility (later)
// animations
// legend for the items (maybe hover text)


const state = {
  turn: "Alice",
  phase: ACTION_SELECTION,
  stand: [ //can be 1 or two things
    "ice", "ice",
  ],
  target: "", //person who bid the most or target in Targeting phase
  timer: 0,
  confirms: [],
  players: {
    "Joe" : {
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
    "Bob" : {
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
    "Alice" : {
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
    "Willy" : {
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
  },
}

// TODO: buttons need to be hidden / shown on respective phases
function TargetingButton() { // button to enter Targeting phase
  return <button className="button button-targeting">Targeting</button>;
}

function SubmitBidButton() { // button to submit secret bid amount in Targeting phase
  return <button className="button button-submit">Submit</button>;
}

function BiddingButton() { // button to ender Bidding phase
  return <button className="button button-bidding">Bidding</button>;
}

function PayButton() { // pay bid amount for item
  return <button className="button button-pay">Pay</button>;
}

function PassButton() { // take bid amount but no item
  return <button className="button button-pass">Pass</button>;
}

function CancelBid() { // button to retract bid (during Bidding or Versus phase)
  return <button className="button button-cancel">Cancel</button>;
}

function ButtonBox({ owner, phase, turn, target }) { // horizontal box to hold buttons
  let buttons = [];
  switch (phase) {
    case ACTION_SELECTION:
      if (owner === turn) {
        buttons = [<TargetingButton />, <BiddingButton />];
      }
      break;
    case BIDDING:
      if (owner === turn || owner === target) {
        buttons = [<CancelBid />];
      }
      break;
    case PAY_PASS:
      if (owner === turn) {
        buttons = [<PayButton />, <PassButton />];
      }
      break;
    case TARGETING:
      // TODO: buttons for items?
      break;
    case VERSUS:
      if (owner === turn || owner === target) {
        buttons = [<CancelBid />];
      }
      break;
    default:
      console.error(`unrecognized phase ${phase}`);
      break;
  }

  return (
    <div className="button-box">
      {buttons}
    </div>
  );
} 

function Stand({ stand }) { // where items in question are placed
  return (
    <div className="stand">
      {stand.map((item, i) => (
        <Item item={item} amount={""} key={i} />
      ))}
    </div>
  );
}

function Middle({ players }) { // the middle of the table
  return (
    <div className="middle">
      {[...Object.keys(players)].map((key, i) => (
        <Seat
          inner radius={100}
          angle={(2 * Math.PI) / Object.keys(players).length * i}
          key={i}
        >
          <Wallet {...players[key].pot} />
        </Seat>
      ))}
    </div>
  );
}

function Timer({ timer}){
  return (
    <p className="timer">{timer}</p>
  );
}

function Coin({ value }) {
  return <div className={`coin coin-${value}`}>{value}</div>;
}

function CoinStack({ value, amount }) { // TODO: need to overlap coins to fit
  const coinSize = 20;
  const maxStackSize = 80;
  const shift = amount > 4 ? (maxStackSize - amount * coinSize) / (amount - 1) : 0;
  return (
    <div className="coin-stack">
      {new Array(amount).fill().map((_, i) => (
        <div style={{ marginTop: i === 0 ? 0 : shift }} key={i}>
          <Coin value={value} />
        </div>
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
  return (
    <div className="player">
      <Wallet {...wallet} />
      <PlayerName name={name} />
      <Pouch items={items} />
    </div>
  );
}

function Seat({ inner, radius, angle, children }) {
  return (
    <div
      className="seat"
      style={{
        transform: `rotate(${angle}rad) translate(-50%, ${radius}px) ${inner ? '' : 'translateY(-100%)'}`,
      }}
    >
      {children}
    </div>
  );
}

function GameScreen({ turn, phase, stand, target, timer, players }) {
  return (
    <div className="room">
      <div className="table">
        {[...Object.keys(players)].map((key, i) => (
          <Seat
            radius={400}
            angle={(2 * Math.PI) / Object.keys(players).length * i}
            key={i}
          >
            <Player {...players[key]} />
          </Seat>
        ))}
        <Middle players={players} />
        <Stand stand={stand}/>
        <Timer timer={timer}/>
      </div>
      <ButtonBox owner={owner} phase={phase} turn={turn} target={target} />
    </div>
  );
}

const domContainer = document.querySelector('#root');
const root = ReactDOM.createRoot(domContainer);
root.render(<GameScreen {...state} />);

const socket = io();
socket.on('game.update.state', (state) => {
  state = state;
});
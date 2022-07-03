


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


//TODO add to state:
// turn counter
// items in the stash
// visibility for versus
// targeting highlight items you can take

// Extra features
// visibility (later)
// animations
// legend for the items (maybe hover text)


function PotValue(playerName){
  const pot = state.players[playerName].pot;
  return pot.v5 * 5 + pot.v10 * 10 + pot.v25 * 25 + pot.v50 * 50;
}

function canTarget(name, item){
  if(item in state.players[state.turn].items && state.players[state.turn].items[item] > 0 && state.players[state.turn].items[item] < 4){
    if(item in state.players[name].items && state.players[name].items[item] > 0 && state.players[name].items[item] < 4){
      return true;
    }
  }
  return false;
}

function TargetingButton() { // button to enter Targeting phase
  return (
    <button
      className="button button-targeting"
      onClick={() => socket.emit('game.action.target_phase')}
    >
      Targeting
    </button>
  );
}

function SubmitBidButton() { // button to submit secret bid amount in Targeting phase
  return (
    <button
      className="button button-submit"
      onClick={() => socket.emit('game.action.confirm_bid_versus', owner)}
    >
      Submit
    </button>
  );
}

function BiddingButton() { // button to ender Bidding phase
  return (
    <button
      className="button button-bidding"
      onClick={() => socket.emit('game.action.bidding_phase')}
    >
      Bidding
    </button>
  );
}

function PayButton() { // pay bid amount for item
  return (
    <button
      className="button button-pay"
      onClick={() => socket.emit('game.action.choose_pay', owner)}
    >
      Pay
    </button>
  );
}

function PassButton() { // take bid amount but no item
  return (
    <button
      className="button button-pass"
      onClick={() => socket.emit('game.action.choose_pass', owner)}
    >
      Pass
    </button>
  );
}

function CancelBid() { // button to retract bid (during Bidding or Versus phase)
  return (
    <button
      className="button button-cancel"
      onClick={() => socket.emit('game.action.cancel_bid', owner)}
    >
      Cancel
    </button>
  );
}

function ButtonBox({ owner, phase, turn, target }) { // horizontal box to hold buttons
  let buttons = [];
  switch (phase) {
    case ACTION_SELECTION:
      if (owner === turn) {
        buttons = [<TargetingButton key="TargetingButton" />, <BiddingButton key="BiddingButton" />];
      }
      break;
    case BIDDING:
      if(!state.confirms.includes(owner) && PotValue(owner) > 0){
        buttons = [<CancelBid key="CancelBid"/>];
      }
      break;
    case PAY_PASS:
      if (owner === turn) {
        buttons = [<PayButton key="PayButton" />, <PassButton key="PassButton" />];
      }
      break;
    case TARGETING:
      // TODO: buttons for items?
      break;
    case VERSUS:
      if (owner === turn || owner === target) {
        buttons = [<CancelBid key="CancelBid" />];
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
        <Item name={""} item={item} amount={""} key={i} />
      ))}
    </div>
  );
}

function Middle({ players }) { // the middle of the table
  if(Object.keys(players).length != lobby.length){
    return (<div className="middle" />);
  }
  return (
    <div className="middle">
      {lobby.map((key, i) => (
        <Seat
          inner radius={100}
          angle={(2 * Math.PI) / lobby.length * (i - lobby.indexOf(owner))}
          key={i}
        >
          <Wallet isPot {...players[key].pot} />
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

function PotCoin({ value }) {
  return (
    <div className={`coin coin-${value}`}>
      {value}
    </div>
  );
}

function Coin({ value }) {
  return (
    <div
      className={`coin coin-${value}`}
      onClick={() => socket.emit('game.action.bid', owner, value)}
    >
      {value}
    </div>
  );
}

function CoinStack({ value, amount, isPot }) { // TODO: need to overlap coins to fit
  const coinSize = 20;
  const maxStackSize = 80;
  const shift = amount > 4 ? (maxStackSize - amount * coinSize) / (amount - 1) : 0;
  return (
    <div className="coin-stack">
      {new Array(amount).fill().map((_, i) => (
        <div style={{ marginTop: i === 0 ? 0 : shift }} key={i}>
          {isPot ? <PotCoin value={value} /> : <Coin value={value} />}
        </div>
      ))}
    </div>
  );
}

function Wallet({ v0, v5, v10, v25, v50, isPot }) {
  return (
    <div className="wallet">
      <CoinStack value={0} amount={v0} isPot={isPot} />
      <CoinStack value={5} amount={v5} isPot={isPot} />
      <CoinStack value={10} amount={v10} isPot={isPot} />
      <CoinStack value={25} amount={v25} isPot={isPot} />
      <CoinStack value={50} amount={v50} isPot={isPot} />
    </div>
  );
}

function Item({ name, item , amount}) {
  if(name === "" || state.turn !== owner || state.phase !== TARGETING || !canTarget(name, item)){
    return <div className={`item ${item}`}> {amount} </div>;
  }
  return <div 
    className={`item ${item}`}
    onClick={() => socket.emit('game.action.target', name, item)}
    >
      {amount}
    </div>;
}

function Pouch({ name, items }) {
  if(items === undefined){
    return (<div className="pouch"/>);
  }
  return (
    <div className="pouch">
      {Object.entries(items).map(([item, amount], i) => (
        <Item name = {name} item={item} amount={amount} key={i} />
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
      <Pouch name={name} items={items} />
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

const initState = {
  turn: "",
  phase: ACTION_SELECTION,
  stand: [],
  target: "", //person who bid the most or target in Targeting phase
  timer: 0,
  confirms: [],
  players:{},
}

const { useState, useEffect } = React;
const socket = io();

let owner = '';
let lobby = [];
let state = initState;

function GameScreen() {
  const [, updateState] = React.useState();
  const forceUpdate = React.useCallback(() => updateState({}), []);

  useEffect(() => {
    socket.on('game.update.state', (newState) => {
      //console.log('got state', newState);
      state = newState;
      forceUpdate();
    });
    socket.on('game.update.username', (username) => {
      //console.log('got username', username);
      owner = username;
      forceUpdate();
    });
    socket.on('game.update.lobby', (newLobby) => {
      //console.log('got lobby', newLobby);
      lobby = newLobby;
      forceUpdate();
    });
    socket.emit('game.action.get_username');
    socket.emit('game.action.get_lobby');
  }, []);

  const { turn, phase, stand, target, timer, players } = state;

  return (
    <div className="room">
      <div className="table">
        {lobby.map((key, i) => (
          <Seat
            radius={400}
            angle={(2 * Math.PI) / lobby.length * (i - lobby.indexOf(owner))}
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
root.render(<GameScreen />);

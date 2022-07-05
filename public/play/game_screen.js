import { 
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
  ITEM_TO_HOVER,
  PotValue,
  canTarget,
  PotEmpty,
  getBidWinner,
} from './common.mjs';


//TODO:
// P1: 
// owner not being set properly (ToggleScreenButton needs this)
// add win condition and win screen

// P2:
// animations

// P3:
// redo button box logic (very messy)
// legend for the items (maybe hover text)

/*
Phases:
ActionSelection - select if next phase is Bidding (big for what is on the stand) or Targeting (target another players item)
Bidding - new item is added to stand, everyone except current turn bids for item(s) on stand
PayPass - current turn either buys item on stand or gives it to target but takes money
Targeting - current turn selects whos item they want to target
Versus - current turn and target each place bids for items on stand
*/

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

function ToggleScreenButton() {
  return (
    <button
      className={`button button-screen ${(false && state.players[owner].hidden) ? "button-toggle" : ""}`}
      onClick={() => socket.emit('game.action.toggle_screen', owner)}
    >
      Screen
    </button>
  );
}

function ButtonBox({ owner, phase, turn, target }) { // horizontal box to hold buttons
  let buttons = [];
  switch (phase) {
    case ACTION_SELECTION:
      if (owner === turn) {
        if(!state.stashEmpty){
          buttons = [<BiddingButton key="BiddingButton" />];
        }
        buttons.push(<TargetingButton key="TargetingButton" />);
      }
      break;
    case BIDDING:
      if(!state.confirms.includes(owner) && !PotEmpty(state, owner)){
        buttons = [<CancelBid key="CancelBid"/>];
      }
      break;
    case PAY_PASS:
      if (owner === turn) {
        buttons = [<PayButton key="PayButton" />, <PassButton key="PassButton" />];
      }
      break;
    case TARGETING:
      break;
    case VERSUS:
      if (owner === turn || owner === target) {
        if(!PotEmpty(state, owner)){
          buttons = [<SubmitBidButton key="SubmitBidButton" />];
        }
        buttons.push(<CancelBid key="CancelBid" />);
      }
      break;
    default:
      console.error(`unrecognized phase ${phase}`);
      break;
  }
  buttons.push(<ToggleScreenButton owner={owner} key="ToggleScreenButton" />)
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
      {lobby.map((name, i) => (
        <Seat
          inner radius={100}
          angle={(2 * Math.PI) / lobby.length * (i - lobby.indexOf(owner))}
          key={i}
        >
          <Wallet name={name} {...players[name].pot} isPot/>
        </Seat>
      ))}
    </div>
  );
}

function Timer({ timer}){
  if(state.phase !== BIDDING){
    return null;
  }
  return (
    <p className="timer">{timer}</p>
  );
}

function Role({ roleType }){
  return (
    <img className="role" src={`./icons/${roleType}.png`} alt={`${roleType}`}></img>
  )
}

function StatusBox ({ name }){
  if(Object.keys(state.players).length != lobby.length){
    return null;
  }
  var statusList = [];
  if(state.players[name].status === STATUS_OFFLINE){
    statusList.push(<Role roleType="offline" key="offline"/>);
  }
  if(state.turn === name){
    statusList.push(<Role roleType="turn" key="turn"/>);
  }
  if(state.target === name && (state.phase === VERSUS || state.phase === PAY_PASS)){
    statusList.push(<Role roleType="target" key="target"/>);
  }
  if(state.phase === VERSUS && state.confirms.includes(name)){
    statusList.push(<Role roleType="submitted" key="submitted"/>);
  }
  if(state.phase === BIDDING && state.confirms.includes(name)){
    statusList.push(<Role roleType="canceled" key="canceled"/>);
  }
  if((state.phase === BIDDING || state.phase === PAY_PASS) && name === getBidWinner(state, lobby)){
    statusList.push(<Role roleType="highest-bidder" key="highest-bidder"/>);
  }
  return (<div className="status-box">
    {statusList}
  </div>
  )
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
    <div className={`coin-stack ${isPot ? "coin-stack-pot" : ""}`}>
      {new Array(amount).fill().map((_, i) => (
        <div style={{ marginTop: i === 0 ? 0 : shift }} key={i}>
          {isPot ? <PotCoin value={value} /> : <Coin value={value} />}
        </div>
      ))}
    </div>
  );
}

function Wallet({ name, v0, v5, v10, v25, v50, isPot }) {
  var hideWallet = false;
  if(state.phase === VERSUS){
    if(owner === state.target && name === state.turn){
      hideWallet = true;
    }
    if(owner === state.turn && name === state.target){
      hideWallet = true;
    }
  }
  if(!isPot && state.players[name].hidden){
    hideWallet = true;
  }
  if(hideWallet){
    if(owner === name){
      return (
        <div className="wallet wallet-hidden own-hidden">
          <CoinStack value={0} amount={v0} isPot={isPot} />
          <CoinStack value={5} amount={v5} isPot={isPot} />
          <CoinStack value={10} amount={v10} isPot={isPot} />
          <CoinStack value={25} amount={v25} isPot={isPot} />
          <CoinStack value={50} amount={v50} isPot={isPot} />
        </div>
      );
    } else {
      return (
        <div className="wallet wallet-hidden">
          <img className="wallet-hidden-icon" src="./icons/hidden.png"></img>
        </div>
      );
    }
  } else {
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
  
}

function Item({ name, item , amount}) {
  const hoverText = ITEM_TO_HOVER[item];
  if(name === "" || state.phase !== TARGETING || !canTarget(state, name, item)){
    return <div 
      title={hoverText}
      className={`item-box item ${item}`}
      >
        <img className="item-box item-icon" src={`./icons/items/${item}.png`}/>
        <div className={"item-box item-text"}>{amount}</div>
      </div>;
  }
  if(state.turn === owner){ //click event and highlight if owning player
    return <div 
    title={hoverText} 
    className={`item-box item ${item} targetable`}
    onClick={() => socket.emit('game.action.target', name, item)}
    >
      <img className="item-box item-icon" src={`./icons/items/${item}.png`}/>
      <div className={"item-box item-text"}>{amount}</div>
    </div>;
  } else { //otherwise only highlight
    return <div
      title={hoverText}
      className={`item-box item ${item} targetable`}
      >
        <img className="item-box item-icon" src={`./icons/items/${item}.png`}/>
        <div className={"item-box item-text"}>{amount}</div>
      </div>;
  }
  
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
      <StatusBox name={name} />
      <Wallet name={name} {...wallet} />
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
  turnCounter: 0,
  phase: ACTION_SELECTION,
  stand: [],
  target: "", //person who bid the most or target in Targeting phase
  timer: 0,
  confirms: [],
  players:{},
  stashEmpty: false,
}

const { useState, useEffect } = React;
const socket = io();

let owner = '';
let lobby = [];
let state = initState;

var tableTypeIndex = 0;
const tableTypes = ["none", "wood", "metal", "plastic"];

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
      <div className="table" >
        <img className="table-texture" src={`./icons/table/${tableTypes[tableTypeIndex]}.jpg`}></img>
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

const button = document.getElementById("secret");
button.onclick = function () {
  tableTypeIndex += 1;
  tableTypeIndex %= tableTypes.length;
};

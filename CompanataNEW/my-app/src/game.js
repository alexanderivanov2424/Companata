import { useState, useEffect } from "react";

import {
  ClientGameStateContext,
  useOwner,
  useLobby,
  useGameState,
} from "./context_hooks.mjs";

import { Player as MPlayer, Bag } from "./model.mjs";
import { socket } from "./socket.mjs";

import {
  ACTION_SELECTION,
  BIDDING,
  PAY_PASS,
  TARGETING,
  VERSUS,
  STATUS_OFFLINE,
  ITEM_TO_HOVER,
  getBidWinner,
} from "./common.mjs";

function TargetingButton() {
  // button to enter Targeting phase
  return (
    <button
      className="button button-targeting"
      onClick={() => socket.emit("game.action.target_phase")}
    >
      Targeting
    </button>
  );
}

function SubmitBidButton() {
  // button to submit secret bid amount in Targeting phase
  return (
    <button
      className="button button-submit"
      onClick={() => socket.emit("game.action.confirm_bid_versus")}
    >
      Submit
    </button>
  );
}

function BiddingButton() {
  // button to ender Bidding phase
  return (
    <button
      className="button button-bidding"
      onClick={() => socket.emit("game.action.bidding_phase")}
    >
      Bidding
    </button>
  );
}

function PayButton() {
  // pay bid amount for item
  return (
    <button
      className="button button-pay"
      onClick={() => socket.emit("game.action.choose_pay")}
    >
      Pay
    </button>
  );
}

function PassButton() {
  // take bid amount but no item
  return (
    <button
      className="button button-pass"
      onClick={() => socket.emit("game.action.choose_pass")}
    >
      Pass
    </button>
  );
}

function CancelBid() {
  // button to retract bid (during Bidding or Versus phase)
  return (
    <button
      className="button button-cancel"
      onClick={() => socket.emit("game.action.cancel_bid")}
    >
      Cancel
    </button>
  );
}

function ToggleScreenButton() {
  const owner = useOwner();
  const state = useGameState();
  return (
    <button
      className={`button button-screen ${
        state.players[owner].hidden ? "button-toggle" : ""
      }`}
      onClick={() => socket.emit("game.action.toggle_screen")}
    >
      Screen
    </button>
  );
}

function ButtonBox({ phase, turn, target }) {
  const owner = useOwner();
  const state = useGameState();
  // horizontal box to hold buttons
  let buttons = [];
  switch (phase) {
    case ACTION_SELECTION:
      if (owner === turn) {
        if (!state.stashEmpty) {
          buttons = [<BiddingButton key="BiddingButton" />];
        }
        buttons.push(<TargetingButton key="TargetingButton" />);
      }
      break;
    case BIDDING:
      if (
        !state.confirms.includes(owner) &&
        !state.players[owner].pot.isEmpty()
      ) {
        buttons = [<CancelBid key="CancelBid" />];
      }
      break;
    case PAY_PASS:
      if (owner === turn) {
        buttons = [
          <PayButton key="PayButton" />,
          <PassButton key="PassButton" />,
        ];
      }
      break;
    case TARGETING:
      break;
    case VERSUS:
      if (owner === turn || owner === target) {
        if (!state.players[owner].pot.isEmpty()) {
          buttons = [<SubmitBidButton key="SubmitBidButton" />];
        }
        buttons.push(<CancelBid key="CancelBid" />);
      }
      break;
    default:
      console.error(`unrecognized phase ${phase}`);
      break;
  }
  buttons.push(<ToggleScreenButton key="ToggleScreenButton" />);
  return <div className="button-box">{buttons}</div>;
}

function Stand({ stand }) {
  // where items in question are placed
  return (
    <div className="stand">
      {stand.map((item, i) => (
        <Item name={""} item={item} amount={""} key={i} />
      ))}
    </div>
  );
}

function Middle({ players }) {
  const owner = useOwner();
  const lobby = useLobby();
  // the middle of the table
  return (
    <div className="middle">
      {lobby.map((name, i) => (
        <Seat
          inner
          radius={100}
          angle={((2 * Math.PI) / lobby.length) * (i - lobby.indexOf(owner))}
          key={i}
        >
          <Wallet name={name} wallet={players[name].pot} isPot />
        </Seat>
      ))}
    </div>
  );
}

function Timer({ timer }) {
  return <p className="timer">{timer}</p>;
}

function Role({ roleType }) {
  return (
    <img
      className="role"
      src={`./icons/${roleType}.png`}
      alt={`${roleType}`}
    ></img>
  );
}

function StatusBox({ name, status }) {
  const state = useGameState();
  var statusList = [];
  if (status === STATUS_OFFLINE) {
    statusList.push(<Role roleType="offline" key="offline" />);
  }
  if (state.turn === name) {
    statusList.push(<Role roleType="turn" key="turn" />);
  }
  if (
    state.target === name &&
    (state.phase === VERSUS || state.phase === PAY_PASS)
  ) {
    statusList.push(<Role roleType="target" key="target" />);
  }
  if (state.phase === VERSUS && state.confirms.includes(name)) {
    statusList.push(<Role roleType="submitted" key="submitted" />);
  }
  if (state.phase === BIDDING && state.confirms.includes(name)) {
    statusList.push(<Role roleType="canceled" key="canceled" />);
  }
  if (
    (state.phase === BIDDING || state.phase === PAY_PASS) &&
    name === getBidWinner(state).name
  ) {
    statusList.push(<Role roleType="highest-bidder" key="highest-bidder" />);
  }
  return <div className="status-box">{statusList}</div>;
}

function PotCoin({ value }) {
  return <div className={`coin coin-${value}`}>{value}</div>;
}

function Coin({ value }) {
  return (
    <div
      className={`coin coin-${value}`}
      onClick={() => socket.emit("game.action.bid", value)}
    >
      {value}
    </div>
  );
}

function CoinStack({ value, amount, isPot }) {
  const coinSize = 20;
  const maxStackSize = 80;
  const shift =
    amount > 4 ? (maxStackSize - amount * coinSize) / (amount - 1) : 0;
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

function Wallet({ name, wallet, hidden, isPot }) {
  const owner = useOwner();
  const state = useGameState();
  var hideWallet = false;
  if (state.phase === VERSUS) {
    if (owner === state.target && name === state.turn) {
      hideWallet = true;
    }
    if (owner === state.turn && name === state.target) {
      hideWallet = true;
    }
  }
  if (!isPot && hidden) {
    hideWallet = true;
  }
  if (hideWallet) {
    if (owner === name) {
      return (
        <div className="wallet wallet-hidden own-hidden">
          <CoinStack value={0} amount={wallet.get(0)} isPot={isPot} />
          <CoinStack value={5} amount={wallet.get(5)} isPot={isPot} />
          <CoinStack value={10} amount={wallet.get(10)} isPot={isPot} />
          <CoinStack value={25} amount={wallet.get(25)} isPot={isPot} />
          <CoinStack value={50} amount={wallet.get(50)} isPot={isPot} />
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
        <CoinStack value={0} amount={wallet.get(0)} isPot={isPot} />
        <CoinStack value={5} amount={wallet.get(5)} isPot={isPot} />
        <CoinStack value={10} amount={wallet.get(10)} isPot={isPot} />
        <CoinStack value={25} amount={wallet.get(25)} isPot={isPot} />
        <CoinStack value={50} amount={wallet.get(50)} isPot={isPot} />
      </div>
    );
  }
}

function Item({ name, item, amount }) {
  const owner = useOwner();
  const state = useGameState();
  const hoverText = ITEM_TO_HOVER[item];
  if (
    name === "" || // TODO: always true
    state.phase !== TARGETING ||
    !state.players[state.turn].canTarget(state.players[name], item)
  ) {
    return (
      <div title={hoverText} className={`item-box item ${item}`}>
        <img className="item-box item-icon" src={`./icons/items/${item}.png`} />
        <div className={"item-box item-text"}>{amount}</div>
      </div>
    );
  }
  if (state.turn === owner) {
    //click event and highlight if owning player
    return (
      <div
        title={hoverText}
        className={`item-box item ${item} targetable`}
        onClick={() => socket.emit("game.action.target", name, item)}
      >
        <img className="item-box item-icon" src={`./icons/items/${item}.png`} />
        <div className={"item-box item-text"}>{amount}</div>
      </div>
    );
  } else {
    //otherwise only highlight
    return (
      <div title={hoverText} className={`item-box item ${item} targetable`}>
        <img className="item-box item-icon" src={`./icons/items/${item}.png`} />
        <div className={"item-box item-text"}>{amount}</div>
      </div>
    );
  }
}

function Pouch({ name, items }) {
  if (items === undefined) {
    return <div className="pouch" />;
  }
  return (
    <div className="pouch">
      {[...items.entries()].map(([item, amount], i) => (
        <Item name={name} item={item} amount={amount} key={i} />
      ))}
    </div>
  );
}

function PlayerName({ name }) {
  return <span className="player-name">{name}</span>;
}

function Player({ name, status, hidden, wallet, items }) {
  return (
    <div className="player">
      <StatusBox name={name} status={status} />
      <Wallet name={name} wallet={wallet} hidden={hidden} />
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
        transform: `rotate(${angle}rad) translate(-50%, ${radius}px) ${
          inner ? "" : "translateY(-100%)"
        }`,
      }}
    >
      {children}
    </div>
  );
}

function Winner({ winner }) {
  return (
    <div className="winner">
      <p className="winner-text">
        {winner}
        <br />
        <br />
        Wins!
      </p>
    </div>
  );
}

export default function GameScreen() {
  const owner = useOwner();
  const lobby = useLobby();
  const [state, setState] = useState(null);

  useEffect(() => {
    // TODO: top level await before rendering?
    socket.on("game.update.state", (data) => {
      setState(
        JSON.parse(data, (key, value) => {
          switch (key) {
            case "players":
              for (const name in value) {
                value[name] = new MPlayer(value[name]);
              }
              return value;
            case "wallet":
            case "items":
            case "pot":
              return new Bag(value);
            default:
              return value;
          }
        })
      );
    });
  }, []);

  if (state === null) {
    return null;
  }

  const { turn, phase, stand, target, timer, players, winner } = state;

  return (
    <ClientGameStateContext.Provider value={state}>
      <div className="room">
        <div className="table">
          {/* <img
          className="table-texture"
          src={`./icons/table/${tableTypes[tableTypeIndex]}.jpg`}
        ></img> */}
          {lobby.map((key, i) => (
            <Seat
              radius={400}
              angle={
                ((2 * Math.PI) / lobby.length) * (i - lobby.indexOf(owner))
              }
              key={i}
            >
              <Player {...players[key]} />
            </Seat>
          ))}
          <Middle players={players} />
          <Stand stand={stand} />
          {state.phase === BIDDING && <Timer timer={timer} />}
        </div>
        {winner ? (
          <Winner winner={winner} />
        ) : (
          <ButtonBox phase={phase} turn={turn} target={target} />
        )}
      </div>
    </ClientGameStateContext.Provider>
  );
}

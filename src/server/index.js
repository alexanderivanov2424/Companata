import { createServer } from 'http';

import express from 'express';
import session from 'express-session';
import { Server } from 'socket.io';
import { serialize, parse } from 'cookie';

import {
  DEBUG,
  ACTION_SELECTION,
  BIDDING,
  PAY_PASS,
  TARGETING,
  VERSUS,
  VERSUS_HOLD,
  STATUS_OFFLINE,
  STATUS_ONLINE,
  BIDDING_TIME,
  VERSUS_HOLD_TIME,
  ITEMS,
  GetWinnerName,
  getBidWinner,
  canPlayerTarget,
  CanSomeoneBid,
} from './common/helpers.js';

import { STACK_SIZE } from './common/settings.js';

import { Player } from './common/model.js';

const app = express();
const server = createServer(app);

const sessionMiddleware = session({
  secret: 'dontcare', //TODO different secret on each startup
  resave: false,
  saveUninitialized: false,
});

// -------------- Express Middleware --------------

app.use(sessionMiddleware);

// -------------- Server State --------------------

const sessionIdToUsername = new Map();
const usernameToSessionId = new Map();

var lobby = [];
var kickVote = {};

// -------------- Game State --------------------
var GAME_STARTED = false;

var state = null;
var timerEvent = null;
var biddingTimeout = null;
var biddingStartTime = new Date().getTime();

var itemStash = [];

for (var i = 0; i < STACK_SIZE; i++) {
  itemStash.push(...ITEMS);
}

function resetGame() {
  clearTimeout(timerEvent);
  timerEvent = null;
  itemStash = [];

  for (var i = 0; i < STACK_SIZE; i++) {
    itemStash.push(...ITEMS);
  }

  state.turnCounter = 0;
  state.phase = ACTION_SELECTION;
  state.stand = [];
  state.target = '';
  state.timer = 0;
  state.confirms = [];
  for (var player of Object.values(state.players)) {
    player.reset();
  }
  state.stashEmpty = false;
  state.biddingOrder = [];
  state.winner = null;
  state.isTieGame = false;
}

function InitGameState(lobby) {
  GAME_STARTED = true;
  state = {
    turnCounter: 0,
    phase: ACTION_SELECTION,
    stand: [],
    target: '', // name of the player who bid the most or target in Targeting phase
    timer: 0,
    confirms: [],
    players: Object.fromEntries(
      lobby.map((name) => [name, new Player({ name })])
    ),
    stashEmpty: false,
    biddingOrder: [],
    winner: null,
    isTieGame: false,
    get turn() {
      return lobby[this.turnCounter % lobby.length];
    },
    get currentPlayer() {
      return this.players[this.turn];
    },
    get targetPlayer() {
      return this.players[this.target];
    },
  };

  console.log({ DEBUG, lobby, ITEMS });
  if (DEBUG) {
    for (const player of Object.values(state.players)) {
      console.log(player.name);
      for (const item of ITEMS) {
        console.log(item);
        player.items.set(item, 1);
      }
    }
  }
}

function GenerateItem() {
  const i = Math.floor(Math.random() * itemStash.length);
  const newItem = itemStash[i];
  itemStash.splice(i, 1);
  return newItem;
}

function ProgressTurn() {
  state.turnCounter++;
  state.phase = ACTION_SELECTION;
  state.stand = [];
  state.target = '';
  state.timer = 0;
  state.totalTime = 0;
  state.confirms = [];
  state.biddingOrder = [];
  if (state.turnCounter % lobby.length === 0) {
    InfuseFunds(Math.floor(state.turnCounter / lobby.length));
  }
  if (itemStash.length === 0) {
    state.stashEmpty = true;
  }
  state.winner = GetWinnerName(state);

  var gameIsTie = true;
  for (var i = 0; i < Object.values(state.players).length; i++) {
    if (!canPlayerTarget(state, state.currentPlayer) && state.stashEmpty) {
      state.turnCounter++;
    } else {
      gameIsTie = false;
      break;
    }
  }
  if (gameIsTie) {
    state.winner = 'NOT YOU';
    state.isTieGame = true;
  }
}

function ClaimStand(player) {
  for (const item of state.stand) {
    player.items.add(item);
  }
  state.stand = [];
}

function SplitStand(firstPlayer, secondPlayer) {
  if (state.stand.length !== 2) {
    console.error('Stand must be 2 items to split.');
    return;
  }
  if (state.stand[0] !== state.stand[1]) {
    console.error('Stand items must be the same to split.');
    return;
  }
  firstPlayer.items.add(state.stand[0]);
  secondPlayer.items.add(state.stand[1]);
  state.stand = [];
}

function SubmitItemToStand(player, item) {
  if (!player.items.remove(item)) {
    console.error("Adding item to stand which player doesn't have");
    return;
  }
  state.stand.push(item);
}

function clearTimers() {
  clearTimeout(timerEvent);
  timerEvent = null;
  clearTimeout(biddingTimeout);
  biddingTimeout = null;
  biddingStartTime = new Date().getTime();
}

function setTimers() {
  biddingTimeout = setTimeout(BiddingTimeout, state.timer * 1000);
  timerEvent = setInterval(UpdateTimer, 100);
  biddingStartTime = new Date().getTime();
}

function Event_StartBiddingPhase() {
  if (state.phase !== ACTION_SELECTION) {
    console.warn('Attempt to start bidding while not in action select phase');
    return;
  }
  if (state.stashEmpty) {
    console.warn('Cannot bid when stash is empty');
    return;
  }
  state.phase = BIDDING;
  state.stand.push(GenerateItem());
  if (CanSomeoneBid(state)) {
    state.timer = BIDDING_TIME;
    state.totalTime = BIDDING_TIME;
    setTimers();
  } else {
    BiddingTimeout();
  }
}

function UpdateTimer() {
  state.timer = BIDDING_TIME - (new Date().getTime() - biddingStartTime) / 1000;
}

function Event_MakeBid(thisPlayer, coin) {
  if (state.phase !== BIDDING && state.phase !== VERSUS) {
    console.warn('Attempt to bid while not in bidding or versus phase');
    return;
  }
  if (state.phase === BIDDING && thisPlayer === state.currentPlayer) {
    console.warn('turn player cannot bid in bidding phase');
    return;
  }
  if (
    state.phase === VERSUS &&
    thisPlayer !== state.currentPlayer &&
    thisPlayer !== state.targetPlayer
  ) {
    console.warn(
      'non target player, non owner player cannot bid in versus phase'
    );
    return;
  }
  if (state.confirms.includes(thisPlayer.name)) {
    console.warn('player that canceled bid cannot bid again');
    return;
  }
  if (thisPlayer.wallet.remove(coin)) {
    thisPlayer.pot.add(coin);
    //remove player from bid list and then add them at the end
    state.biddingOrder = state.biddingOrder.filter((player) => {
      return player !== thisPlayer;
    });
    state.biddingOrder.push(thisPlayer);
  }
}

function BiddingTimeout() {
  clearTimers();
  //when bidding times out
  if (state.phase !== BIDDING) {
    console.error('Bidding timeout not in bidding phase');
    return;
  }
  state.timer = 0;
  state.totalTime = 0;
  const highestBidder = getBidWinner(state);
  if (highestBidder === state.currentPlayer) {
    ClaimStand(state.currentPlayer);
    ProgressTurn();
    return;
  }
  state.target = highestBidder.name;
  for (const player of Object.values(state.players)) {
    if (player !== state.targetPlayer) {
      player.sendPot(player);
    }
  }
  state.phase = PAY_PASS;
}

function Event_StartTargetingPhase() {
  if (state.phase !== ACTION_SELECTION) {
    console.warn('Attempt to start targeting while not in action select phase');
    return;
  }
  const canTarget = canPlayerTarget(state, state.currentPlayer);
  if (!canTarget) {
    console.warn(
      'Attempt to start targeting when no available items for targeting'
    );
    return;
  }
  state.phase = TARGETING;
}

function Event_Target(targetPlayerName, item) {
  if (state.phase !== TARGETING) {
    console.warn('Attempt to start target item while not in targeting phase');
    return;
  }
  const targetPlayer = state.players[targetPlayerName];
  if (!state.currentPlayer.canTarget(targetPlayer, item)) {
    console.warn("targeting item that can't be targeted");
    return;
  }
  SubmitItemToStand(targetPlayer, item);
  SubmitItemToStand(state.currentPlayer, item);
  state.phase = VERSUS;
  state.target = targetPlayerName;
}

function Event_ConfirmBidVersus(player) {
  //who is confirming
  if (state.phase !== VERSUS) {
    console.warn('Attempt to confirm bid while not in versus phase');
    return;
  }
  if (player !== state.currentPlayer && player !== state.targetPlayer) {
    console.warn('Player not in versus tried to confirm bid');
    return;
  }
  if (state.confirms.includes(player.name)) {
    console.warn('confirming player already confirmed');
    return;
  }
  if (player.pot.isEmpty() && player.coinCount() > 0) {
    console.warn('cannot submit without bidding');
    return;
  }
  state.confirms.push(player.name);
  if (
    state.confirms.includes(state.currentPlayer.name) &&
    state.confirms.includes(state.targetPlayer.name)
  ) {
    state.phase = VERSUS_HOLD;
    setTimeout(VersusHoldTimeout, VERSUS_HOLD_TIME * 1000);
  }
}

function VersusHoldTimeout() {
  state.confirms = [];

  const targetPlayerPot = state.targetPlayer.potValue();
  const turnPlayerPot = state.currentPlayer.potValue();
  if (targetPlayerPot > turnPlayerPot) {
    ClaimStand(state.targetPlayer);
  } else if (targetPlayerPot < turnPlayerPot) {
    ClaimStand(state.currentPlayer);
  } else {
    SplitStand(state.targetPlayer, state.currentPlayer);
  }
  state.targetPlayer.sendPot(state.currentPlayer);
  state.currentPlayer.sendPot(state.targetPlayer);
  ProgressTurn();
}

function Event_ChoosePass(thisPlayer) {
  //owner player passes on new item
  if (state.phase !== PAY_PASS) {
    console.warn('Attempt to pass while not in paypass phase');
    return;
  }
  if (thisPlayer !== state.currentPlayer) {
    console.warn('Player passing on bid while it is not their turn');
    return;
  }
  state.targetPlayer.sendPot(state.currentPlayer);
  ClaimStand(state.targetPlayer);
  ProgressTurn();
}

function Event_ChoosePay(thisPlayer) {
  //owner player pays for new item
  if (state.phase !== PAY_PASS) {
    console.warn('Attempt to pay while not in paypass phase');
    return;
  }
  if (state.currentPlayer !== thisPlayer) {
    console.warn('Player paying on bid while it is not their turn');
    return;
  }
  if (state.targetPlayer.potValue() > state.currentPlayer.money()) {
    console.warn("Player doesn't have enough money to pay");
    return;
  }
  state.currentPlayer.pay(state.targetPlayer, state.targetPlayer.potValue());
  state.targetPlayer.sendPot(state.targetPlayer);
  ClaimStand(state.currentPlayer);
  ProgressTurn();
}

function Event_CancelBid(thisPlayer) {
  //remove bid from pot in bidding phase
  if (state.phase !== BIDDING) {
    console.warn('Attempt to cancel bid while not in bidding phase');
    return;
  }
  if (state.confirms.includes(thisPlayer.name)) {
    console.warn('Player already canceled bid');
    return;
  }
  state.confirms.push(thisPlayer.name);
  thisPlayer.sendPot(thisPlayer);

  if (!CanSomeoneBid(state)) {
    clearTimers();
    BiddingTimeout();
  }
}

function Event_CancelBidVersus(thisPlayer) {
  //remove bid from pot in versus phase
  if (state.phase !== VERSUS) {
    console.warn('Attempt to cancel bid while not in versus phase');
    return;
  }
  if (state.confirms.includes(thisPlayer.name)) {
    console.warn('Player cannot cancel bid after amount confirmed');
    return;
  }
  thisPlayer.sendPot(thisPlayer);
}

function Event_ToggleScreen(thisPlayer) {
  thisPlayer.hidden = !thisPlayer.hidden;
}

function InfuseFunds(level) {
  switch (level) {
    case 2:
      for (const player of Object.values(state.players)) {
        player.wallet.add(5, 3).add(10, 3).add(25, 2);
      }
      break;
    case 4:
      for (const player of Object.values(state.players)) {
        player.wallet.add(5, 3).add(10, 3).add(25, 2).add(50, 1);
      }
      break;
    case 6:
      for (const player of Object.values(state.players)) {
        player.wallet.add(0, 1).add(25, 4).add(50, 2);
      }
      break;
    default:
    // code block
  }
}

// TODO: remove if current method of filtering is working
function filterGhosts() {
  console.log(state);
  if (state.players) {
    state.players = state.players.filter(
      (player) => player.name !== undefined && player.name !== null
    );
  }
}

// -------------- Socket.IO Events ----------------

const io = new Server(server, {
  path: '/socket',
});

io.use((socket, next) => sessionMiddleware(socket.request, {}, next));

function lobbyOnConnect(socket, username, gameOnConnect) {
  if (!lobby.includes(username)) {
    lobby.push(username);
    io.emit('lobby.update.lobby_list', lobby);
  }

  socket.emit('lobby.update.client_username', username);

  socket.on('lobby.join', () => {
    if (!lobby.includes(username)) {
      lobby.push(username);
      io.emit('lobby.update.lobby_list', lobby);
    }
  });

  socket.on('lobby.voteKick', (username, badActor) => {
    if (badActor === null || badActor === undefined) {
      filterGhosts();
      io.emit('lobby.update.lobby_list', lobby);
    }
    if (lobby.includes(badActor)) {
      if (!Object.keys(kickVote).includes(badActor)) {
        kickVote[badActor] = [];
      }
      kickVote[badActor].push(username);
      if (kickVote[badActor].length > lobby.length / 2) {
        var i = lobby.indexOf(badActor);
        lobby.splice(i, 1);
        io.emit('lobby.update.lobby_list', lobby);
      }
    }
  });

  async function sendGameState() {
    for (const socket of await io.fetchSockets()) {
      socket.emit('game.update.state', JSON.stringify(state));
    }
  }

  socket.on('lobby.start_game', async () => {
    const host = lobby[0];
    if (username === host) {
      io.emit('game_started');
      InitGameState(lobby);
      setInterval(sendGameState, 100);
      for (const socket of await io.fetchSockets()) {
        gameOnConnect(socket, socket.username);
      }
    }
  });
}

function gameOnConnect(socket, username) {
  if (!lobby.includes(username)) {
    console.warn(`${username} could not join game because it already started`);
    return;
  }

  const thisPlayer = state.players[username];

  thisPlayer.status = STATUS_ONLINE;
  socket.on('disconnect', () => {
    thisPlayer.status = STATUS_OFFLINE;
  });

  socket.on('game.action.target_phase', () => {
    Event_StartTargetingPhase();
  });

  socket.on('game.action.bidding_phase', () => {
    Event_StartBiddingPhase();
  });

  socket.on('game.action.bid', (value) => {
    Event_MakeBid(thisPlayer, value);
  });

  socket.on('game.action.target', (targetPlayerName, item) => {
    Event_Target(targetPlayerName, item);
  });

  socket.on('game.action.confirm_bid_versus', () => {
    Event_ConfirmBidVersus(thisPlayer);
  });

  socket.on('game.action.choose_pay', () => {
    Event_ChoosePay(thisPlayer);
  });

  socket.on('game.action.choose_pass', () => {
    Event_ChoosePass(thisPlayer);
  });

  socket.on('game.action.cancel_bid', () => {
    if (state.phase === BIDDING) {
      Event_CancelBid(thisPlayer);
    } else if (state.phase === VERSUS) {
      Event_CancelBidVersus(thisPlayer);
    }
  });

  socket.on('game.action.toggle_screen', () => {
    Event_ToggleScreen(thisPlayer);
  });

  socket.on('game.restart', () => {
    resetGame();
  });
}

io.on('connection', (socket) => {
  const req = socket.request;
  const sessionId = req.session.id;

  function onConnect(username) {
    socket.username = username;

    console.log(`${username} connected`);
    socket.on('disconnect', () => {
      console.log(`${username} disconnected`);
    });

    socket.onAny((event, ...args) => {
      console.log(event, username + ':', args);
    });

    if (!GAME_STARTED) {
      lobbyOnConnect(socket, username, gameOnConnect);
    } else {
      gameOnConnect(socket, username);
    }
  }

  socket.on('login.submit', (username) => {
    // check if username is unique
    if (!usernameToSessionId.has(username)) {
      sessionIdToUsername.set(sessionId, username);
      usernameToSessionId.set(username, sessionId);
      socket.emit('login.success', username);
      onConnect(username);
      console.log('Logged In');
    } else {
      socket.emit('login.username_taken');
    }
  });

  socket.on('game.reconnect', (username) => {
    if (!lobby.includes(username)) {
      socket.emit('client.reset');
    } else if (
      state === null ||
      state.players[username].status === STATUS_OFFLINE
    ) {
      onConnect(username);
      console.log('Reconnected');
    }
  });
});

server.listen(8000, () => {
  console.log('listening on *:8000');
});

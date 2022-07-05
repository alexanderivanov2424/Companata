import { createServer } from 'http';

import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import { Server } from 'socket.io';

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
  PotValue,
  PotEmpty,
  getBidWinner,
} from './public/common.mjs';


const app = express();
const server = createServer(app);

const sessionMiddleware = session({
  secret: 'dontcare', //TODO different secret on each startup
  resave: false,
  saveUninitialized: false,
});

// -------------- Express Middleware --------------

app.use(sessionMiddleware);
app.use(bodyParser.urlencoded({ extended: true }));

// redirect any path under /play to login page if not logged in
app.use('/play', (req, res, next) => {
  const sessionId = req.session.id;
  const username = sessionIdToUsername.get(sessionId);

  req.session.username = username;
  if (username) {
    next();
  } else {
    console.log(`redirecting session ${sessionId} to login page`);
    res.redirect('/');
  }
});

// serve static files in /public directory
app.use(express.static('public', { extensions: ['html'] }));

// -------------- Express Routes ------------------

app.post('/login', (req, res) => {
  const sessionId = req.session.id;
  const { username } = req.body;

  if (!usernameToSessionId.has(username)) {
    console.log(`${username} logged in from session ${sessionId}`);
    sessionIdToUsername.set(sessionId, username);
    usernameToSessionId.set(username, sessionId);

    req.session.username = username;
    res.redirect('/play/lobby');
  } else {
    console.log(`username ${username} is taken`);
    res.redirect('/error');
  }
});

app.post('/logout', (req, res) => {
  const sessionId = req.session.id;
  const username = sessionIdToUsername.get(sessionId);

  console.log(`${username} logged out from session ${sessionId}`);
  sessionIdToUsername.delete(sessionId, username);
  usernameToSessionId.delete(username, sessionId);

  req.session.destroy(() => {
    // disconnect all Socket.IO connections linked to this session ID
    io.to(sessionId).disconnectSockets();
    res.status(204).end();
  });
});

// -------------- Server State --------------------

const sessionIdToUsername = new Map();
const usernameToSessionId = new Map();

var lobby = [];
var kickVote = {};

// -------------- Game State --------------------
var GAME_STARTED = false;

var state = {};
var timerEvent = null;

var itemStash = [];

for(var i = 0; i < STACK_SIZE; i++){
  itemStash.push(...ITEMS);
}


function InitGameState(lobby){
  GAME_STARTED = true;
  state = {
    turn: lobby[0],
    turnCounter: 0,
    phase: "ActionSelection",
    stand: [],
    target: "", //person who bid the most or target in Targeting phase
    timer: 0,
    confirms: [],
    players: {},
    stashEmpty: false,
    biddingOrder: [],
  }
  lobby.forEach(name => {
    state.players[name] = 
      {
        name: name,
        status: STATUS_OFFLINE,
        hidden: false,
        wallet: {
          v0: 2,
          v5: 4,
          v10: 3,
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
      }
  });
}

function GenerateItem(){
  const i = Math.floor(Math.random()*itemStash.length)
  const newItem = itemStash[i];
  itemStash.splice(i, 1);
  return newItem;
}

function ProgressTurn(){
  var i = lobby.indexOf(state.turn);
  i = (i + 1) % lobby.length;
  state.turn = lobby[i];
  state.turnCounter ++;
  state.phase = ACTION_SELECTION;
  state.stand = [];
  state.target = "";
  state.timer = 0;
  state.confirms = [];
  state.biddingOrder = [];
  if(state.turnCounter % lobby.length === 0){
    InfuseFunds(Math.floor(state.turnCounter / lobby.length));
  }
  if(itemStash.length === 0){
    state.stashEmpty = true;
  }
}

function clearPot(playerName){
  state.players[playerName].pot = {
    v0: 0,
    v5: 0,
    v10: 0,
    v25: 0,
    v50: 0,
  };
}

function SendPot(fromName, toName){
  const fromPot = state.players[fromName].pot;
  state.players[toName].wallet.v0 += fromPot.v0;
  state.players[toName].wallet.v5 += fromPot.v5;
  state.players[toName].wallet.v10 += fromPot.v10;
  state.players[toName].wallet.v25 += fromPot.v25;
  state.players[toName].wallet.v50 += fromPot.v50;
  clearPot(fromName);
}

function ClaimStand(playerName){
  for(var i = 0; i < state.stand.length; i++){
    state.players[playerName].items[state.stand[i]] = (state.players[playerName].items[state.stand[i]] || 0) + 1;
  }
  state.stand = [];
}

function SplitStand(firstPlayer, secondPlayer){
  if(state.stand.length != 2){
    console.error("Stand must be 2 items to split.");
  }
  if(state.stand[0] != state.stand[1]){
    console.error("Stand items must be the same to split.");
  }
  state.players[firstPlayer].items[state.stand[0]] = (state.players[firstPlayer].items[state.stand[0]] || 0) + 1;
  state.players[secondPlayer].items[state.stand[1]] = (state.players[secondPlayer].items[state.stand[1]] || 0) + 1;
  state.stand = [];
}

function HasItem(playerName, item){
  if(!(item in state.players[playerName].items)){
    return false;
  }
  return state.players[playerName].items[item] > 0;
}

function CanTargetItem(playerName, item){
  if(state.players[playerName].items[item] <= 0 || state.players[playerName].items[item] >= STACK_SIZE){
    return false;
  }
  return true;
}

function SubmitItemToStand(playerName, item){
  if(!HasItem(playerName, item)){
    console.error("Adding item to stand which player doesn't have");
    return;
  }
  state.players[playerName].items[item] -= 1;
  state.stand.push(item);
  if(state.players[playerName].items[item] === 0){
    delete state.players[playerName].items[item];
  }
}

function HasCoin(playerName, coin){
  return state.players[playerName].wallet[coin] > 0;
}

function PayCoin(fromPlayer, toPlayer, coin){
  if(!HasCoin(fromPlayer, coin)){
    console.error("Taking coin from player which player doesn't have");
    return;
  }
  state.players[fromPlayer].wallet[coin] -= 1;
  state.players[toPlayer].wallet[coin] += 1;
}

function GiveCoin(toPlayer, coin){
  state.players[toPlayer].wallet[coin] += 1;
}

function GiveCoins(toPlayer, coin, number){
  for(var i = 0; i < number; i++){
    state.players[toPlayer].wallet[coin] += 1;
  }
}

function playerMoney(playerName){
  const wallet = state.players[playerName].wallet;
  return wallet.v5 * 5 + wallet.v10 * 10 + wallet.v25 * 25 + wallet.v50 * 50;
}

function Pay(fromPlayer, toPlayer, amount){
  if(playerMoney(fromPlayer) < amount){
    console.error("Player paying more money than they have");
    return;
  }
  const values = [50, 25, 10, 5];
  const valueNames = ["v50", "v25", "v10", "v5"];

  for(var i = 0; i < values.length; i++){
    while(amount >= values[i] && HasCoin(fromPlayer, valueNames[i])){
      amount-=values[i];
      PayCoin(fromPlayer, toPlayer, valueNames[i]);
    }
  }
  if(amount < 0){
    console.error("Alex you dumbass go fix the Pay code");
    return;
  }
  if(amount > 0){
    for(var i = values.length - 1; i >=0; i--){ 
      if(HasCoin(fromPlayer, valueNames[i])){
        amount -= values[i];
        PayCoin(fromPlayer, toPlayer, valueNames[i]);
        break; //paying smallest coin available should be enough
      }
    }
    if(amount > 0){
      console.error("Alex you dumbass go fix the Pay code, trying to be clever smh");
    }
  }
}

function Event_StartBiddingPhase(){
  if(state.phase !== ACTION_SELECTION){
    console.warn("Attempt to start bidding while not in action select phase");
    return;
  }
  if(state.stashEmpty){
    console.warn("Cannot bid when stash is empty");
    return;
  }
  state.timer = BIDDING_TIME;
  state.stand.push(GenerateItem());
  state.phase = BIDDING;
  setTimeout(BiddingTimeout, state.timer * 1000);
  timerEvent = setInterval(UpdateTimer,1000)
}

function UpdateTimer(){
  state.timer --;
}

function Event_MakeBid(playerName, value){
  if(state.phase !== BIDDING && state.phase !== VERSUS){
    console.warn("Attempt to bid while not in bidding or versus phase");
    return;
  }
  if(state.phase === BIDDING && playerName === state.turn){
    console.warn("turn player cannot bid in bidding phase");
    return;
  }
  if(state.phase === VERSUS && playerName !== state.turn && playerName !== state.target){
    console.warn("non target player, non owner player cannot bid in versus phase");
    return;
  }
  if(state.confirms.includes(playerName)){
    console.warn("player that canceled bid cannot bid again");
    return;
  }
  if(state.players[playerName].wallet[value] > 0){
    state.players[playerName].wallet[value]--;
    state.players[playerName].pot[value]++;
    //remove player from bid list and then add them at the end
    state.biddingOrder = state.biddingOrder.filter((name) => {return name !== playerName;});
    state.biddingOrder.push(playerName);
  }
}

function Event_StartTargetingPhase(){
  if(state.phase !== ACTION_SELECTION){
    console.warn("Attempt to start targeting while not in action select phase");
    return;
  }
  var canTarget = false;
  for (const [ownItem, ownItemNumber] of Object.entries(state.players[state.turn].items)) {
    if(ownItemNumber <= 0 || ownItemNumber >= STACK_SIZE){
      continue;
    }
    lobby.forEach((otherPlayerName, i) => {
      if(otherPlayerName === state.turn){
        return;
      }
      for (const [otherItem, otherItemNumber] of Object.entries(state.players[otherPlayerName].items)) {
        if(otherItemNumber <=0 || otherItemNumber >= STACK_SIZE){
          continue;
        }
        if(otherItem === ownItem){
          canTarget = true;
          return;
        }
      }
    })
    if(canTarget){
      break;
    }
  }
  if(!canTarget){
    console.warn("Attempt to start targeting when no available items for targeting");
    return;
  }
  state.phase = TARGETING;
}

function Event_Target(targetPlayerName, item){
  if(state.phase !== TARGETING){
    console.warn("Attempt to start target item while not in targeting phase");
    return;
  }
  if(!HasItem(targetPlayerName, item)){
    console.warn("targeting item that target player doesn't have");
    return;
  }
  if(!CanTargetItem(targetPlayerName, item)){
    console.warn("targeting item that can't be targeted");
    return;
  }
  if(!HasItem(state.turn, item)){
    console.warn("targeting item that owner player doesn't have");
    return;
  }
  if(!CanTargetItem(state.turn, item)){
    console.warn("targeting item that can't be targeted");
    return;
  }
  SubmitItemToStand(targetPlayerName, item);
  SubmitItemToStand(state.turn, item);
  state.phase = VERSUS;
  state.target = targetPlayerName;
}

function Event_ConfirmBidVersus(playerName){ //who is confirming
  if(state.phase !== VERSUS){
    console.warn("Attempt to confirm bid while not in versus phase");
    return;
  }
  if(playerName !== state.turn && playerName !== state.target){
    console.warn("Player not in versus tried to confirm bid");
    return;
  }
  if(state.confirms.includes(playerName)){
    console.warn("confirming player already confirmed");
    return;
  }
  if(PotEmpty(state, playerName)){
    console.warn("cannot submit without bidding");
    return;
  }
  state.confirms.push(playerName);
  if(state.confirms.includes(state.turn) && state.confirms.includes(state.target)){
    state.confirms = [];
    
    const targetPlayerPot = PotValue(state, state.target);
    const turnPlayerPot = PotValue(state, state.turn);
    if(targetPlayerPot > turnPlayerPot){
      ClaimStand(state.target);
    } else if(targetPlayerPot < turnPlayerPot){
      ClaimStand(state.turn);
    } else {
      SplitStand(state.target, state.turn);
    }
    SendPot(state.target, state.turn);
    SendPot(state.turn, state.target);
    ProgressTurn();
  }
}

function BiddingTimeout(){ //when bidding times out
  if(state.phase !== BIDDING){
    console.error("Bidding timeout not in bidding phase");
    return;
  }
  clearTimeout(timerEvent);
  state.timer = 0;
  const highestBidder = getBidWinner(state, lobby);
  if(highestBidder === state.turn){
    ClaimStand(state.turn);
    ProgressTurn();
    return;
  }
  state.target = highestBidder;
  lobby.forEach( (playerName) => {
    if(playerName !== state.target){
      SendPot(playerName, playerName);
    }
  });
  state.phase = PAY_PASS;
}

function Event_ChoosePass(playerName){ //owner player passes on new item
  if(state.phase !== PAY_PASS){
    console.warn("Attempt to pass while not in paypass phase");
    return;
  }
  if(state.turn != playerName){
    console.warn("Player passing on bid while it is not their turn");
    return;
  }
  SendPot(state.target, state.turn);
  ClaimStand(state.target);
  ProgressTurn();
}

function Event_ChoosePay(playerName){ //owner player pays for new item
  if(state.phase !== PAY_PASS){
    console.warn("Attempt to pay while not in paypass phase");
    return;
  }
  if(state.turn != playerName){
    console.warn("Player paying on bid while it is not their turn");
    return;
  }
  if(PotValue(state, state.target) > playerMoney(state.turn)){
    console.warn("Player doesn't have enough money to pay");
    return;
  }
  Pay(state.turn, state.target, PotValue(state, state.target));
  SendPot(state.target, state.target);
  ClaimStand(state.turn);
  ProgressTurn();
}

function Event_CancelBid(playerName){ //remove bid from pot in bidding phase
  if(state.phase !== BIDDING){
    console.warn("Attempt to cancel bid while not in bidding phase");
    return;
  }
  if(state.confirms.includes(playerName)){
    console.warn("Player already canceled bid");
    return
  }
  state.confirms.push(playerName);
  SendPot(playerName, playerName);
}

function Event_CancelBidVersus(playerName){ //remove bid from pot in versus phase
  if(state.phase !== VERSUS){
    console.warn("Attempt to cancel bid while not in versus phase");
    return;
  }
  if(state.confirms.includes(playerName)){
    console.warn("Player cannot cancel bid after amount confirmed");
    return
  }
  SendPot(playerName, playerName);
}

function Event_ToggleScreen(playerName){
  console.log(playerName);
  state.players[playerName].hidden = !state.players[playerName].hidden;
}

function InfuseFunds(level){
  switch(level) {
    case 1:
      lobby.forEach((name) => {
        GiveCoins(name, "v0", 1);
        GiveCoins(name, "v5", 3);
        GiveCoins(name, "v10", 3);
        GiveCoins(name, "v25", 2);
        GiveCoins(name, "v50", 1);
      })
      break;
    case 2:
      lobby.forEach((name) => {
        GiveCoins(name, "v0", 1);
        GiveCoins(name, "v5", 3);
        GiveCoins(name, "v10", 3);
        GiveCoins(name, "v25", 2);
        GiveCoins(name, "v50", 1);
      })
      break;
    case 3:
      lobby.forEach((name) => {
        GiveCoins(name, "v0", 1);
        GiveCoins(name, "v25", 4);
        GiveCoins(name, "v50", 2);
      })
      break;
    default:
      // code block
  }
}

function filterGhosts(){
  lobby = lobby.filter(function(name) {
    return name !== undefined && name !== null;
  });
}

// -------------- Socket.IO Events ----------------

const io = new Server(server);

io.use((socket, next) => sessionMiddleware(socket.request, {}, next));

io.on('connection', (socket) => {
  const req = socket.request;
  const sessionId = req.session.id;
  const username = sessionIdToUsername.get(sessionId);

  console.log(`${username} connected`);
  if (!lobby.includes(username)) {
    filterGhosts();
    if (!GAME_STARTED) {
      lobby.push(username);
      io.emit('lobby.update.lobby_list', lobby);
    } else {
      console.warn(`${username} could not join game because it already started`);
    }
  }

  if (GAME_STARTED && state.players.hasOwnProperty(username)) {
    state.players[username].status = STATUS_ONLINE;
  }

  socket.on('disconnect', () => {
    console.log(`${username} disconnected`);
    if (GAME_STARTED && state.players.hasOwnProperty(username)) {
      state.players[username].status = STATUS_OFFLINE;
    }
  });

  socket.emit('lobby.update.client_username', username);

  socket.join(sessionId);

  socket.use((_, next) => {
    req.session.reload((err) => {
      if (err) {
        socket.disconnect();
      } else {
        next();
      }
    });
  });

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });

  socket.on('lobby.join', () => {
    if (!lobby.includes(username)) {
      lobby.push(username);
      io.emit('lobby.update.lobby_list', lobby);
    }
  });

  socket.on('lobby.voteKick', (username, badActor) => {
    if(badActor === null || badActor === undefined){
      filterGhosts();
      io.emit('lobby.update.lobby_list', lobby);
    } if (lobby.includes(badActor)) {
      if(!Object.keys(kickVote).includes(badActor)){
        kickVote[badActor] = [];
      }
      kickVote[badActor].push(username);
      if(kickVote[badActor].length > lobby.length / 2){
        i = lobby.indexOf(badActor);
        lobby.splice(i, 1);
        io.emit('lobby.update.lobby_list', lobby);
      }
    }
  })

  function sendGameState(){
    io.emit('game.update.state', state);
    
  }

  socket.on('lobby.start_game', () => {
    const host = lobby[0];
    if (username === host) {
      io.emit('redirect', '/play/game');
      InitGameState(lobby);
      setInterval(sendGameState, 100);
    }
  });

  socket.on('game.action.get_username', () =>{
    socket.emit('game.update.username', username);
  });

  socket.on('game.action.get_lobby', () => {
    console.log(lobby);
    socket.emit('game.update.lobby', lobby);
  });

  socket.on('game.action.target_phase', () => {
    Event_StartTargetingPhase();
  });

  socket.on('game.action.bidding_phase', () => {
    Event_StartBiddingPhase();
  });

  socket.on('game.action.bid', (playerName, value) => {
    Event_MakeBid(playerName, `v${value}`);
  });

  socket.on('game.action.target', (targetPlayerName, item) => {
    Event_Target(targetPlayerName, item);
  });

  socket.on('game.action.confirm_bid_versus', (playerName) => {
    Event_ConfirmBidVersus(playerName)
  });

  socket.on('game.action.choose_pay', (playerName) => {
    Event_ChoosePay(playerName)
  });

  socket.on('game.action.choose_pass', (playerName) => {
    Event_ChoosePass(playerName)
  });

  socket.on('game.action.cancel_bid', (playerName) => {
    if(state.phase === BIDDING){
      Event_CancelBid(playerName);
    } else if(state.phase === VERSUS){
      Event_CancelBidVersus(playerName);
    }
  });

  socket.on('game.action.toggle_screen', (playerName) => {
    Event_ToggleScreen(playerName);
  });

});


server.listen(8000, () => {
  console.log('listening on *:8000');
});

const path = require('path');
const { createServer } = require('http');

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');


const app = express();
const server = createServer(app);

const sessionMiddleware = session({
  secret: 'dontcare',
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
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

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

const lobby = [];

// -------------- Game State --------------------
const ACTION_SELECTION = "ActionSelection"
const BIDDING = "Bidding"
const PAY_PASS = "PayPass"
const TARGETING = "Targeting"
const VERSUS = "Versus"

var state = {}
var timerEvent = null;


function InitGameState(lobby){
  state = {
    turn: lobby[0],
    phase: "ActionSelection",
    stand: [],
    target: "", //person who bid the most or target in Targeting phase
    timer: 0,
    players: [],
  }
  lobby.forEach(name => {
    state.players[name] = 
      {
        name: name,
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

function ProgressTurn(){
  var i = lobby.indexOf(state.turn);
  i = (i + 1) % lobby.length;
  state.turn = lobby[i];
  state.phase = ACTION_SELECTION;
  state.stand = [];
  state.target = "";
  timer = 0;
  confirms = [];
}

function PotValue(playerName){
  const pot = state.players[playerName].pot;
  return pot.v5 * 5 + pot.v10 * 10 + pot.v25 * 25 + pot.v50 * 50;
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

function SubmitItemToStand(playerName, item){
  if(!HasItem(playerName, item)){
    console.error("Adding item to stand which player doesn't have");
    return;
  }
  state.players[playerName].items[item] -= 1;
  state.stand.push(item);
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
  const valueNames = [v50, v25, v10, v5];

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
  state.timer = 100; //TODO make timer
  state.stand.push("ice");
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
    return
  }
  if(state.phase === VERSUS && playerName !== state.turn && playerName !== state.target){
    console.warn("non target player, non owner player cannot bid in versus phase");
    return
  }
  if(state.players[playerName].wallet[value] > 0){
    state.players[playerName].wallet[value]--;
    state.players[playerName].pot[value]++;
  }
}

function Event_StartTargetingPhase(){
  if(state.phase !== ACTION_SELECTION){
    console.warn("Attempt to start targeting while not in action select phase");
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
  if(!HasItem(state.turn, item)){
    console.warn("targeting item that owner player doesn't have");
    return;
  }
  SubmitItemToStand(targetPlayerName, item);
  SubmitItemToStand(state.turn, item);
  state.phase = VERSUS;
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
  if(state.confirms.contains(playerName)){
    console.warn("confirming player already confirmed");
    return;
  }
  state.confirms.push(playerName);
  if(state.confirms.contains(state.turn) && state.confirms.contains(state.target)){
    state.confirms = [];
    
    const targetPlayerPot = PotValue(state.target);
    const turnPlayerPot = PotValue(state.turn);
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
  var highestBid = -1;
  var highestBidder = state.turn;
  lobby.forEach( (playerName) => {
    if(state.confirms.contains(playerName)){
      return;
    }
    if(PotValue(playerName) > highestBid){
      highestBidder = playerName;
    }
  });
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
  if(PotValue(state.target) > playerMoney(state.turn)){
    console.warn("Player doesn't have enough money to pay");
    return;
  }
  Pay(state.turn, state.target, PotValue(state.target));
  SendPot(state.target, state.target);
  ClaimStand(state.turn);
  ProgressTurn();
}

function Event_CancelBid(playerName){ //remove bid from pot in bidding phase
  if(state.phase !== BIDDING){
    console.warn("Attempt to cancel bid while not in bidding phase");
    return;
  }
  if(state.confirms.contains(playerName)){
    console.warm("Player already canceled bid");
    return
  }
  state.confirms.push(playerName);
  SendPot(playerName, playerName);
}

function InfuseFunds(){
  //TODO based on turn counter?
}

// -------------- Socket.IO Events ----------------

const io = new Server(server);

io.use((socket, next) => sessionMiddleware(socket.request, {}, next));

io.on('connection', (socket) => {
  const req = socket.request;
  const sessionId = req.session.id;
  const username = sessionIdToUsername.get(sessionId);

  console.log(`${username} connected`);

  socket.on('disconnect', () => {
    console.log(`${username} disconnected`);

    // Remove disconnected player from the lobby list if already joined
    const index = lobby.indexOf(username);
    if (index !== -1) {
      lobby.splice(index, 1);
    }
    io.emit('lobby.update.lobby_list', lobby);
  });

  socket.emit('lobby.update.client_username', username);
  io.emit('lobby.update.lobby_list', lobby);

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
  })

  function sendGameState(){
    console.log('state updated');
    io.emit('game.update.state', state);
  }

  socket.on('lobby.start_game', () => {
    const host = lobby[0];
    if (username === host) {
      io.emit('redirect', '/play/game');
      InitGameState(lobby);
      setInterval(sendGameState, 100);
    }
  })

  socket.on('game.action.target_phase', () => {
    Event_StartTargetingPhase();
  })

  socket.on('game.action.bidding_phase', () => {
    Event_StartBiddingPhase();
  })

});


server.listen(8000, () => {
  console.log('listening on *:8000');
});

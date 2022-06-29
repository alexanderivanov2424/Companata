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


function initGameState(lobby){
  state = {
    turn: lobby[0],
    phase: "ActionSelection",
    stand: [],
    target: "", //person who bid the most or target in Targeting phase
    timer: 0,
    players: [],
  }
  lobby.forEach(name => {
    players.push(
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
    )
  });
}

function StartBiddingPhase(){
  if(state.phase !== ACTION_SELECTION){
    console.warn("Attempt to start bidding while not in action select phase");
    return;
  }
  state.timer = 100; //TODO make timer
  state.phase = BIDDING;
}

function MakeBid(playerName, value){
  if(state.phase !== BIDDING && state.phase !== VERSUS){
    console.warn("Attempt to bid while not in bidding or versus phase");
    return;
  }
  var player = state.players.find(player => {
    return player.name === playerName;
  });
  if(player === undefined){
    console.warn("bidding player not found");
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
  if(player.wallet[value] > 0){
    player.wallet[value]--;
    player.pot[value]++;
  }
}

function StartTargetingPhase(){
  if(state.phase !== ACTION_SELECTION){
    console.warn("Attempt to start targeting while not in action select phase");
    return;
  }
  state.phase = TARGETING;
}

function Target(playerName, item){
  if(state.phase !== TARGETING){
    console.warn("Attempt to start target item while not in targeting phase");
    return;
  }
  var targetPlayer = state.players.find(player => {
    return player.name === playerName;
  });
  if(targetPlayer === undefined){
    console.warn("target player not found");
    return;
  }
  var ownerPlayer = state.players.find(player => {
    return player.name === playerName;
  });
  if(ownerPlayer === undefined){
    console.error("owning player not found");
    return;
  }
  if(targetPlayer.items[item] <= 0){
    console.warn("targeting item that target player doesn't have");
    return;
  }
  if(ownerPlayer.items[item] <= 0){
    console.warn("targeting item that owner player doesn't have");
    return;
  }
  targetPlayer.items[item]--;
  ownerPlayer.items[item]--;
  state.stand.push(item, item);
  state.phase = VERSUS;
}

function ConfirmBidVersus(playerName){ //who is confirming

}

function ChoosePass(){ //owner player passes on new item
  
}

function ChoosePay(){ //owner player pays for new item

}

function CancelBid(){ //remove bid from pot in bidding phase

}

function NewActionSelectPhase(){ //reset who retracted bids

}

function InfuseFunds(){
  
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

  socket.on('lobby.start_game', () => {
    const host = lobby[0];
    if (username === host) {
      io.emit('redirect', '/play/game');
    }
  })

});


server.listen(8000, () => {
  console.log('listening on *:8000');
});

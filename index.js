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
    io.emit('update lobby list', lobby);
  });

  socket.emit('update client username', username);
  io.emit('update lobby list', lobby);

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

  socket.on('join', () => {
    if (!lobby.includes(username)) {
      lobby.push(username);
      io.emit('update lobby list', lobby);
    }
  })

  socket.on('start game', () => {
    const host = lobby[0];
    if (username === host) {
      io.emit('redirect', '/play/game');
    }
  })

});


server.listen(8000, () => {
  console.log('listening on *:8000');
});

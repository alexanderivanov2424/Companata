const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const { parse, serialize } = require("cookie");
const io = new Server(server);


var PlayerIdToUsername = new Map();
var UsernameToPlayerId = new Map();


var lobby = [];
var hostUsername;


app.get('/', function (req, res) { 
    res.sendFile(__dirname + '/login.html');
});

app.get('/login', function (req, res) { 
    res.sendFile(__dirname + '/login.html');
});

app.get('/lobby', function (req, res) {
    res.sendFile(__dirname + '/lobby.html');
});

app.get('/game', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.engine.on("initial_headers", (headers, req) => {
    const cookies = parse(req.headers.cookie || "");
    if(cookies.PlayerID == undefined){
        var randomNumber=Math.random().toString();
        randomNumber=randomNumber.substring(2,randomNumber.length);
        const cookieData = serialize("PlayerID", randomNumber, { sameSite: "strict" });
        req.headers.cookie = cookieData;
        console.log('Cookie Set: ' + randomNumber);
        headers["set-cookie"] = cookieData;
    } 
});

io.on('connection', (socket) => {
    const cookies = parse(socket.request.headers.cookie || "");
    const PlayerID = cookies.PlayerID;
    
    console.log(`Connection from ${PlayerID}`);

    socket.on('disconnect', () => {
        console.log(`${PlayerID} disconnected`);

        // Lobby update
        if(PlayerIdToUsername.has(PlayerID)){
            const username = PlayerIdToUsername.get(PlayerID);
            const index = lobby.indexOf(username);
            if (index > -1) {
                lobby.splice(index, 1);
            }
            io.emit('update lobby list', lobby);
        }
    });

    socket.onAny((event, ...args) => {
        console.log(event, args);
    });

    //Login Socket Events

    socket.on('login', (username) => {
        if(PlayerIdToUsername.has(PlayerID)){
            const username = PlayerIdToUsername.get(PlayerID);
            console.log(`Login from ${PlayerID} with name ${username}`);
            socket.emit('switch to', '/game');
        } else if(UsernameToPlayerId.has(username)){
            socket.emit('error', 'username taken');
        } else {
            console.log(`Login from ${PlayerID} with name ${username}`);
            PlayerIdToUsername.set(PlayerID, username);
            UsernameToPlayerId.set(username, PlayerID);
            socket.emit('switch to', '/lobby');
        }
    });

    //Lobby Socket Events

    function isValidLogin(socket){
        if(!PlayerIdToUsername.has(PlayerID)){
            socket.emit('switch to', '/login');
            return false;
        }
        return true;
    } 

    socket.on('join', () => {
        if(!isValidLogin(socket)) return;
        username = PlayerIdToUsername.get(PlayerID);
        lobby.push(username);
        socket.emit('update client username', username);
        io.emit('update lobby list', lobby);
    })

    socket.on('start game', () => {
        if(!isValidLogin(socket)) return;
        username = PlayerIdToUsername.get(PlayerID);
        if(lobby.indexOf(username) == 0){
            socket.emit('switch to', '/game');
        }
    })

});


server.listen(8000, () => {
  console.log('listening on *:8000');
});
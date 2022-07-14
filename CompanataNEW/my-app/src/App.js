import { useState, useEffect } from 'react';

import { ClientContext } from './context_hooks.mjs';
import LoginScreen from './login.js';
import LobbyScreen from './lobby.js';
import GameScreen from './game.js';

import { socket } from './socket.mjs';

import './game.css';



function App() {
  const [owner, setOwner] = useState(null);
  const [lobby, setLobby] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    socket.on('lobby.update.lobby_list', (lobby) => {
      console.log('got lobby', lobby);
      setLobby(lobby);
    });
    socket.on('lobby.update.client_username', (owner) => {
      console.log('got owner', owner);
      setOwner(owner);
    });
    socket.on('game_started', () => {
      console.log('game started');
      setGameStarted(true);
    });
  }, []);

  if (owner === null) {
    return <LoginScreen setOwner={setOwner} />;
  } else if (!gameStarted) {
    return <LobbyScreen owner={owner} lobby={lobby}/>
  } else {
    return (
      <ClientContext.Provider value={{ owner, lobby }}>
        <GameScreen />
      </ClientContext.Provider>
    );
  }
}

export default App;


// var tableTypeIndex = 0;
// const tableTypes = ['none', 'wood', 'metal', 'plastic'];

// const button = document.getElementById('secret');
// button.onclick = function () {
//   tableTypeIndex += 1;
//   tableTypeIndex %= tableTypes.length;
// };
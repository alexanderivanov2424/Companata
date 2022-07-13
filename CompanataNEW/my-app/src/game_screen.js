/* global React, ReactDOM */
const { useState, useEffect } = React;

import { ClientContext } from './context_hooks.js';
import LoginScreen from './login.js';
import GameScreen from './game.js';

import { socket } from '../socket.mjs';

function App() {
  const [owner, setOwner] = useState(null);
  const [lobby, setLobby] = useState(null);

  useEffect(() => {
    socket.on('lobby.update.lobby_list', setLobby);
    socket.on('lobby.update.client_username', setOwner);
  }, []);

  if (owner === null || lobby === null) {
    console.warn("Owner or Lobby haven't been updated. rendering nothing");
    return null;
  }

  if (owner === null) {
    return <LoginScreen setOwner={setOwner} />;
  } else if (lobby === null) {
    //TODO game started
  } else {
    return (
      <ClientContext.Provider value={{ owner, lobby }}>
        <GameScreen />
      </ClientContext.Provider>
    );
  }
}

const domContainer = document.querySelector('#root');
const root = ReactDOM.createRoot(domContainer);
root.render(<App />);

// var tableTypeIndex = 0;
// const tableTypes = ['none', 'wood', 'metal', 'plastic'];

// const button = document.getElementById('secret');
// button.onclick = function () {
//   tableTypeIndex += 1;
//   tableTypeIndex %= tableTypes.length;
// };

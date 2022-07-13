import { useState, useEffect } from "react";

import { ClientContext } from "./context_hooks.mjs";
import LoginScreen from "./login.js";
import GameScreen from "./game.js";

import { socket } from "./socket.mjs";

import "./game.css";

function App() {
  const [owner, setOwner] = useState(null);
  const [lobby, setLobby] = useState(null);

  useEffect(() => {
    socket.on("lobby.update.lobby_list", setLobby);
    socket.on("lobby.update.client_username", setOwner);
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

export default App;

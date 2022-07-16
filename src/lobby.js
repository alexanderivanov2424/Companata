// import { useState, useEffect } from 'react';

import { socket } from './socket.js';

function StartGameButton(){ //TODO make grey if not owner
  return (
    <button onClick={() => {socket.emit("lobby.start_game");}}>
      Start Game
    </button>
  );
}

function LobbyMemeber({ name }){
  return <div>{name}</div>;
}


export default function LobbyScreen({ owner, lobby }) {
  if(lobby === null){
    return null;
  }
  return (
    <div>
      {lobby.map(name => <LobbyMemeber name={name} key={name}/>) }
      {lobby[0] === owner && <StartGameButton />}
    </div>
  );
}



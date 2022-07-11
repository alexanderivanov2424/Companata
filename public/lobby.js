import React from 'react';

import { socket } from '../socket.mjs';

function StartGameButton() {
  <button
    className="button-startgame"
    onClick={() => socket.emit('lobby.start_game')}
  >
    Start Game
  </button>;
}

function KickButton({ name, localUsername }) {
  return (
    <button
      className="button-kick"
      onClick={() => socket.emit('lobby.voteKick', localUsername, name)}
    >
      Kick
    </button>
  );
}

function User({ name }) {
  return <div> {name} </div>;
}

function Slot({ name, localUsername }) {
  return (
    <>
      <User name={name} />
      {name !== localUsername && (
        <KickButton name={name} localUsername={localUsername} />
      )}
    </>
  );
}

function Lobby({ lobby, localUsername }) {
  return (
    <>
      {lobby.map((name) => {
        return <Slot name={name} localUsername={localUsername} key={name} />;
      })}
      <StartGameButton />
    </>
  );
}

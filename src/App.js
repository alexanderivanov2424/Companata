import { useState, useEffect } from 'react';

import { ClientContext } from './context_hooks.js';
import LoginScreen from './login.js';
import LobbyScreen from './lobby.js';
import GameScreen from './game.js';

import { socket } from './socket.js';

import './game.css';

function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });
  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };
  return [storedValue, setValue];
}

function App() {
  const [owner, setOwner] = useLocalStorage('owner', null);
  const [lobby, setLobby] = useLocalStorage('lobby', null);
  const [gameStarted, setGameStarted] = useLocalStorage('gameStarted', false);

  useEffect(() => {
    if (owner !== null) {
      console.log('reconnecting');
      socket.emit('game.reconnect', owner);
    }
  }, []);

  useEffect(() => {
    socket.on('client.reset', () => {
      console.log('resetting');
      setOwner(null);
      setLobby(null);
      setGameStarted(false);
    });
    socket.on('lobby.update.lobby_list', (lobby) => {
      // console.log('got lobby', lobby);
      setLobby(lobby);
    });
    socket.on('lobby.update.client_username', (owner) => {
      // console.log('got owner', owner);
      setOwner(owner);
    });
    socket.on('game_started', () => {
      // console.log('game started');
      setGameStarted(true);
    });
  }, [setOwner, setLobby, setGameStarted]);

  if (owner === null) {
    return <LoginScreen setOwner={setOwner} />;
  } else if (!gameStarted) {
    return <LobbyScreen owner={owner} lobby={lobby} />;
  } else {
    return (
      <ClientContext.Provider value={{ owner, lobby }}>
        <GameScreen />
      </ClientContext.Provider>
    );
  }
}

export default App;

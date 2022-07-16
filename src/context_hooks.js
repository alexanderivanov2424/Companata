import React from 'react';

//initialize to null to prevent usage before initialization
export const ClientContext = React.createContext(null);

export function useOwner() {
  return React.useContext(ClientContext).owner;
}

export function useLobby() {
  return React.useContext(ClientContext).lobby;
}

export const ClientGameStateContext = React.createContext(null);

export function useGameState() {
  return React.useContext(ClientGameStateContext);
}

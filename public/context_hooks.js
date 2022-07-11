/* global React */
const { useContext } = React;

//initialize to null to prevent usage before initialization
export const ClientContext = React.createContext(null);

export function useOwner() {
  return useContext(ClientContext).owner;
}

export function useLobby() {
  return useContext(ClientContext).lobby;
}

export const ClientGameStateContext = React.createContext(null);

export function useGameState() {
  return useContext(ClientGameStateContext);
}

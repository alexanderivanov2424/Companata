import { useState, useEffect } from 'react';

import { socket } from './socket.js';

function Errors({ children }) {
  return (
    <ul>
      {children.map((error, i) => (
        <li style={{ color: 'red' }} key={i}>
          {error}
        </li>
      ))}
    </ul>
  );
}

export default function LoginScreen({ setOwner }) {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    socket.on('login.username_taken', () => setErrors(['username taken']));
    socket.on('login.success', setOwner);
  }, [setOwner]);

  const onSubmit = (event) => {
    event.preventDefault();
    socket.emit('login.submit', new FormData(event.target).get('username'));
  };

  return (
    <div>
      <form id="form" onSubmit={onSubmit}>
        <label htmlFor="username">Username:</label>
        <input type="text" name="username" required />
        <br />
        <br />
        <button>Submit</button>
      </form>
      <Errors>{errors}</Errors>
    </div>
  );
}

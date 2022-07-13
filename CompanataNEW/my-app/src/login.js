import { useState, useEffect } from "react";

import { socket } from "./socket.mjs";

function Errors({ children }) {
  return (
    <ul>
      {children.map((error, i) => (
        <li style="color: red" key={i}>
          {error}
        </li>
      ))}
    </ul>
  );
}

export default function LoginScreen({ setOwner }) {
  //TODO
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    socket.on("login.username_taken", () => setErrors(["username taken"]));
    socket.on("login.success", setOwner);
  }, []);

  const onSubmit = (event) => {
    event.preventDefault();
    socket.emit("login.submit", event.target);
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

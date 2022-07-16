import { useEffect, useRef } from 'react';

import './timer.css';

export function Timer({ timer, totalTime }) {
  const ref = useRef(null);
  console.log(timer / totalTime);

  return (
    <svg
      className="circle-container"
      viewBox="2 -2 28 36"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="circle-container__background"
        r="16"
        cx="16"
        cy="16"
      ></circle>
      <circle
        className="circle-container__progress"
        r="16"
        cx="16"
        cy="16"
        style={{ strokeDashoffset: 100 * (1 - timer / totalTime) }}
        ref={ref}
      ></circle>
    </svg>
  );
}

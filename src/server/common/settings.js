/*
The number of players expected to be playing. 
This is used to compute the number of items that will be put into circulation.

We recommend to set this value accurately.
*/
export const EXPECTED_PLAYERS = 4;

/*
The size of items stacks / how many of each item are there in game.
*/
export const STACK_SIZE = 4;

/*
The number of full item stacks needed to win.
*/
export const STACKS_TO_WIN = 4;

/*
The difficulty of the game. This increases the number of items in circulation.
For example, a difficulty of 0.0 means that there will be enough items for each player to have 
(STACKS_TO_WIN - 1) full item stacks. A difficulty of 1.0 means that there will be enough items
for each player to have (STACKS_TO_WIN) full item stacks.

Setting the EXPECTED_PLAYERS to be greater than the true number of players lowers the difficulty
and setting it to be less than the true number of players increases the difficulty.

0.0 - cut throat 
0.25 - very hard
0.5 -  hard
0.75 - normal
1.0 - easy
2.0 - childs play
*/
export const DIFFICULTY = 0.25;

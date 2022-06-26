const canvas = document.getElementById('mycanvas');
 const ctx = canvas.getContext('2d');

 const p = {
   x: 25,
   y: 25
 };
 const velo = 3;
 const corner = 50;
 const rad = 20;

 const ball = {
   x: p.x,
   y: p.y
 };

 let moveX = Math.cos(Math.PI / 180 * corner) * velo;
 let moveY = Math.sin(Math.PI / 180 * corner) * velo;

 const DrawMe = () => {
   ctx.clearRect(0, 0, 400, 300);

   if (ball.x > canvas.width - rad || ball.x < rad) moveX = -moveX;
   if (ball.y > canvas.height - rad || ball.y < rad) moveY = -moveY;

   ball.x += moveX;
   ball.y += moveY;

   ctx.beginPath();
   ctx.fillStyle = 'green';
   ctx.arc(ball.x, ball.y, rad, 0, Math.PI * 2, false);
   ctx.fill();
   ctx.closePath();
 }

 setInterval(DrawMe, 10);

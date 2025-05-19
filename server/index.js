const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { Game } = require("./scripts/game");
const { Player } = require("./scripts/player");

// Create express app
const app = express();

// Enable CORS for HTTP routes
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Enable CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // frontend origin
    methods: ["GET", "POST"],
  },
});

// GAME SETUP ======>
const TIME_LEFT = 90;
const clueIntervals = [
  Math.floor(TIME_LEFT * 0.7),
  Math.floor(TIME_LEFT * 0.5),
  Math.floor(TIME_LEFT * 0.3),
];
const game = new Game();
console.log(game);
// GAME SETUP ======>

// Socket.IO connection
io.on("connection", (socket) => {
  const player = new Player(socket.id);
  game.players.push(player);

  socket.on("player-ready", (name) => game.ready(io, socket, name, TIME_LEFT));

  socket.on("player-ready-next", (name) =>
    game.ready(io, socket, name, TIME_LEFT)
  );

  socket.on("guess", (guess) => {
    game.guess(io, socket, guess);
  });

  socket.on("timer-update", (timeLeft) =>
    game.timerUpdate(io, timeLeft, clueIntervals)
  );
  socket.on("send-message", (msg) => io.emit("received-message", msg));
  socket.on("draw", (data) => socket.broadcast.emit("draw", data));
  socket.on("clear", () => socket.broadcast.emit("clear"));
  socket.on("disconnect", () => {
    const currentPlayers = game.players.filter(
      (player) => player.id !== socket.id
    );
    game.players = currentPlayers;
    game.correctGuessers.delete(player.id);

    if (currentPlayers.length < 2) {
      io.emit("round-end");
      game.endRound(io);
    }
  });
});

// Start server
server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

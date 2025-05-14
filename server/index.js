const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

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

// Word list for the game
const words = [
  "general",
  "computer",
  "elephant",
  "mountain",
  "butterfly",
  "chocolate",
  "dolphin",
  "umbrella",
  "guitar",
  "penguin",
  "rainbow",
  "diamond",
  "volcano",
  "octopus",
  "basketball",
  "apple",
  "ball",
  "cat",
  "dog",
  "egg",
  "fish",
  "grape",
  "hat",
  "ice",
  "juice",
  "kite",
  "leaf",
  "moon",
  "nose",
  "owl",
  "pen",
  "queen",
  "rain",
  "banana",
  "guitar",
  "rocket",
  "flower",
  "castle",
  "window",
  "button",
  "animal",
  "camera",
  "ladder",
  "gloves",
  "clouds",
  "donuts",
  "pencil",
  "basket",
  "bridge",
  "cookie",
  "doctor",
  "pirate",
  "tunnel",
  "jungle",
  "bottle",
  "planet",
  "carrot",
  "beach",
  "violin",
  "garage",
  "rabbit",
  "trophy",
  "pillow",
  "ticket",
  "circus",
  "mirror",
  "laptop",
  "butter",
  "subway",
  "garden",
  "pickup",
  "rocket",
  "saddle",
  "shovel",
  "napkin",
  "hanger",
  "magnet",
  "breeze",
  "helmet",
  "puzzle",
  "candle",
  "donkey",
  "hammer",
];

// Game state
const GameState = {
  players: [],
  currentDrawerId: null,
  inProgress: false,
  data: new Map(),
  currentWord: "",
  currentClue: "",
  cluesGiven: 0,
  maxClues: 3,
  revealedIndices: [],
  correctGuessers: new Set(),
  readyPlayers: new Set(),
  timer: null,
};

// Utility: Generate clue based on revealed letters
function generateClue(word, clueCount) {
  if (clueCount > GameState.cluesGiven - 1) {
    let index;
    do {
      index = Math.floor(Math.random() * word.length);
    } while (GameState.revealedIndices.includes(index));
    GameState.revealedIndices.push(index);
  }

  return word
    .split("")
    .map((char, i) => (GameState.revealedIndices.includes(i) ? char : "_"))
    .join("");
}

// Start new round
function startNewRound() {
  if (!GameState.inProgress) return;

  GameState.currentWord = words[Math.floor(Math.random() * words.length)];
  GameState.cluesGiven = 0;
  GameState.revealedIndices = [];
  GameState.correctGuessers.clear();
  GameState.readyPlayers.clear();
  GameState.currentClue = generateClue(GameState.currentWord, 0);
  GameState.currentDrawerId =
    GameState.players[Math.floor(Math.random() * GameState.players.length)];

  // add the drawer to correctGuesser
  GameState.correctGuessers.add(GameState.currentDrawerId);

  console.log("Starting round with word:", GameState.currentWord);

  // Notify all clients who is the drawer
  const drawerPlayer = GameState.data.get(GameState.currentDrawerId);
  io.emit("new-drawer", {
    drawerId: GameState.currentDrawerId,
    drawerName: drawerPlayer.name,
  });
  io.emit("new-round", {
    clue: GameState.currentClue,
    timeLeft: 90,
    word: GameState.currentWord,
  });
}

// Score update logic
function updateScores() {
  const scores = Array.from(GameState.data.entries())
    .map(([id, { name, score }]) => ({ name, score }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((player, i) => ({
      ...player,
      title:
        i === 0
          ? "#1 Master Guesser"
          : i === 1
          ? "#2 Doodle Nerd"
          : `#${i + 1} Bottom Feeder`,
    }));

  io.emit("score-update", scores);
}

// Guess processing
function handleGuess(socket, guess) {
  if (!GameState.inProgress || !GameState.data.has(socket.id)) return;

  const player = GameState.data.get(socket.id);

  if (GameState.correctGuessers.has(socket.id)) {
    return socket.emit("already-guessed");
  }

  const isCorrect = guess.toLowerCase() === GameState.currentWord.toLowerCase();

  if (isCorrect) {
    const points = [5, 3, 2, 1][GameState.cluesGiven] || 1;
    player.score += points;
    GameState.data.set(socket.id, player);
    GameState.correctGuessers.add(socket.id);

    io.emit("guess-correct", {
      player: player.name,
      word: GameState.currentWord,
      points,
      score: player.score,
    });

    updateScores();

    const allGuessed = Array.from(GameState.data.keys()).every((id) =>
      GameState.correctGuessers.has(id)
    );

    if (allGuessed) setTimeout(startNewRound, 3000);
  } else {
    io.emit("guess-wrong", `[@${player.name}]: ${guess}`);
  }
}

// Handle player ready for next round
function handlePlayerReadyNext(socket) {
  GameState.readyPlayers.add(socket.id);
  const allReady = Array.from(GameState.data.keys()).every((id) =>
    GameState.readyPlayers.has(id)
  );

  if (allReady) {
    console.log("All players ready. Starting new round.");
    startNewRound();
  } else {
    io.emit("waiting-for-players", {
      readyCount: GameState.readyPlayers.size,
      totalPlayers: GameState.data.size,
    });
  }
}

// Timer clue updates
function handleTimerUpdate(timeLeft) {
  const clueIntervals = [40, 25, 10];
  const clueIndex = clueIntervals.indexOf(timeLeft);

  if (clueIndex !== -1 && GameState.cluesGiven === clueIndex) {
    GameState.cluesGiven++;
    GameState.currentClue = generateClue(
      GameState.currentWord,
      GameState.cluesGiven
    );
    io.emit("new-clue", GameState.currentClue);
  }

  if (timeLeft === 0) {
    io.emit("round-end");
  }
}

// Socket.IO connection
io.on("connection", (socket) => {
  console.log(`Player ${socket.id} connected`);

  if (GameState.inProgress) {
    socket.emit("game-in-progress");
    return;
  }

  GameState.players.push(socket.id);
  GameState.data.set(socket.id, { name: null, ready: false, score: 0 });

  socket.on("player-ready", (name) => {
    const player = GameState.data.get(socket.id);
    if (!player) return;

    player.name = name;
    player.ready = true;
    GameState.data.set(socket.id, player);

    const allReady = Array.from(GameState.data.values()).every((p) => p.ready);
    if (allReady && GameState.players.length === 2) {
      GameState.inProgress = true;
      io.emit(
        "start",
        Array.from(GameState.data.values()).map((p) => p.name)
      );
      startNewRound();
    } else {
      socket.emit("waiting");
    }
  });

  socket.on("guess", (guess) => handleGuess(socket, guess));
  socket.on("player-ready-next", () => handlePlayerReadyNext(socket));
  socket.on("timer-update", (timeLeft) => handleTimerUpdate(timeLeft));
  socket.on("send-message", (msg) => io.emit("received-message", msg));
  socket.on("draw", (data) => socket.broadcast.emit("draw", data));
  socket.on("clear", () => socket.broadcast.emit("clear"));

  socket.on("disconnect", () => {
    GameState.players = GameState.players.filter((p) => p !== socket.id);
    GameState.data.delete(socket.id);
    GameState.correctGuessers.delete(socket.id);
    GameState.readyPlayers.delete(socket.id);

    console.log(`Player ${socket.id} disconnected`);
    if (GameState.players.length < 2) {
      GameState.inProgress = false;
      io.emit("waiting");
    }

    updateScores();
  });
});

// Start server
server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

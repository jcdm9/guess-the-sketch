const socket = io("http://localhost:3000");
let name = "no-name#" + Math.floor(Math.random() * 100);
let gameInProgress = false;
let timeLeft = 90;
let timerInterval;
let currentClue = "";
let modalMode = "name";
let canDraw = false;

// === Modal Setup ===
const gameModalEl = document.getElementById("gameModal");
const gameModal = new bootstrap.Modal(gameModalEl, {
  keyboard: false,
  backdrop: "static",
});
const modalTitle = document.getElementById("gameModalLabel");
const modalBody = document.getElementById("gameModalBody");
const modalActionBtn = document.getElementById("modalActionBtn");
const toolbar = document.querySelector(".toolbar");
toolbar.style.display = "none";

function showNameModal() {
  modalMode = "name";
  modalTitle.textContent = "Enter your name";
  modalBody.innerHTML = `<input type="text" id="usernameInput" class="form-control" placeholder="Enter your name" />`;
  modalActionBtn.textContent = "Start";
  gameModal.show();
}

function showNextRoundModal() {
  clearCanvas();
  modalMode = "next-round";
  modalTitle.textContent = "Next Round";
  modalBody.innerHTML = `<p>Ready for the next round?</p>`;
  modalActionBtn.textContent = "Next Round";
  gameModal.show();
}

modalActionBtn.addEventListener("click", () => {
  if (modalMode === "name") {
    const input = document.getElementById("usernameInput").value.trim();
    if (input) {
      name = input;
      gameModal.hide();
      socket.emit("player-ready", name);
    } else {
      alert("Please enter your name");
    }
  } else if (modalMode === "next-round") {
    gameModal.hide();
    socket.emit("player-ready-next", name);
  }
});

// === Timer ===
function updateTimer() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  document.getElementById("timer").textContent = `${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  socket.emit("timer-update", timeLeft);

  if (timeLeft > 0) {
    timeLeft--;
  } else {
    clearInterval(timerInterval);
    showNextRoundModal();
    socket.emit("time-up");
  }
}

// === Word & Score UI Setup ===
const wordDisplay = document.createElement("div");
wordDisplay.className = "word-display";
document.querySelector(".word").appendChild(wordDisplay);

const scoresDisplay = document.createElement("div");
scoresDisplay.className = "scores-display";
const scoresContainer = document.querySelector(".scores");
scoresContainer.appendChild(scoresDisplay);
scoresContainer.style.display = "none";

// === Drawing Canvas Setup ===
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let drawing = false;
let lastX = null;
let lastY = null;

canvas.addEventListener("mousedown", (e) => {
  if (!canDraw) return;
  drawing = true;
  const rect = canvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
});

canvas.addEventListener("mouseup", () => (drawing = false));
canvas.addEventListener("mouseout", () => (drawing = false));

canvas.addEventListener("mousemove", (e) => {
  if (!drawing || !canDraw) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const color = colorPicker.value;
  const size = parseInt(brushSizeInput.value);
  drawLine(lastX, lastY, x, y, color, size);
  socket.emit("draw", {
    fromX: lastX,
    fromY: lastY,
    toX: x,
    toY: y,
    color,
    size,
  });
  lastX = x;
  lastY = y;
});

function drawLine(fromX, fromY, toX, toY, color, size) {
  console.log(fromX, fromY);
  if (fromX == null || fromY == null) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
}

const colorPicker = document.getElementById("colorPicker");
const brushSizeInput = document.getElementById("brushSize");
const clearBtn = document.getElementById("clearBtn");
clearBtn.addEventListener("click", () => {
  if (!canDraw) return;
  clearCanvas();
  socket.emit("clear");
});

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// === Chat ===
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (canDraw) return;
  const msg = chatInput.value.trim();
  if (!msg) return;
  chatInput.value = "";
  console.log("isGameInProg: ", gameInProgress);
  if (gameInProgress) {
    socket.emit("guess", msg);
  } else {
    socket.emit("send-message", { user: `@${name}`, message: msg });
  }
});

function addMessage(text, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message " + (sender || "");
  msgDiv.textContent = sender ? `[${sender}]: ${text}` : text;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// === Socket Event Handlers ===
socket.on("connect", () => {
  socket.on("received-message", ({ user, message }) =>
    addMessage(message, user)
  );
});

socket.on("new-clue", (clue) => {
  if (canDraw) return;
  currentClue = clue;
  wordDisplay.textContent = `Word to guess: ${clue}`;
});

socket.on("guess-correct", ({ player }) => {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message correct-guess";
  msgDiv.textContent = `${player}'s guess is correct.`;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("guess-wrong", (guess) => addMessage(guess));
socket.on("already-guessed", () =>
  addMessage("You have already guessed correctly in this round!")
);

socket.on("start", (playerNames) => {
  gameInProgress = true;
  addMessage(`Game started! Players: ${playerNames.join(" and ")}`);
});

socket.on("waiting", () =>
  addMessage("Waiting for another player to start...")
);

socket.on("game-in-progress", () => {
  addMessage("The game is in progress. Please wait until it finishes to join.");
});

socket.on("round-end", () => {
  clearInterval(timerInterval);
  showNextRoundModal();
});

socket.on("waiting-for-players", ({ readyCount, totalPlayers }) => {
  addMessage(
    `Waiting for players to be ready (${readyCount}/${totalPlayers})...`
  );
});

socket.on(
  "new-round",
  ({ clue, timeLeft: newTime, word, drawerId, drawerName }) => {
    gameInProgress = true;
    currentClue = clue;
    canDraw = socket.id === drawerId;
    console.log(drawerId, canDraw);
    if (!canDraw) {
      toolbar.style.display = "none";
      addMessage(`${drawerName} is drawing...`);
      wordDisplay.textContent = `Word to guess: ${clue}`;
    } else {
      toolbar.style.display = "block";
      addMessage(`It's your turn to draw!`);
      wordDisplay.textContent = `Word to draw: ${word}`;
    }

    timeLeft = newTime;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    clearCanvas();
  }
);

socket.on("draw", ({ fromX, fromY, toX, toY, color, size }) => {
  drawLine(fromX, fromY, toX, toY, color, size);
});

socket.on("clear", clearCanvas);

socket.on("score-update", (rankedScores) => {
  if (!rankedScores.length) {
    scoresContainer.style.display = "none";
    return;
  }
  scoresContainer.style.display = "block";
  scoresDisplay.innerHTML = rankedScores
    .map(
      (player) => `
    <div class="score-item">
      <span class="player-title">${player.title}</span>
      <span class="player-name">${player.name}</span>
      <span class="player-score">${player.score} pts</span>
    </div>`
    )
    .join("");
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// === Start the game by showing name input modal
window.onload = showNameModal;

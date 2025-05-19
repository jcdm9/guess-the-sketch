const { words } = require("./words");
const { Player } = require("./player");
class Game {
  constructor() {
    this.players = [];
    this.currentDrawer = null;
    this.inProgress = false;
    this.currentWord = "";
    this.currentClue = "";
    this.cluesGiven = 0;
    this.maxClues = 3;
    this.revealedIndices = [];
    this.correctGuessers = new Set();
    this.timer = null;
  }

  startNewRound = () => {
    const playersReady = this.players.filter((player) => player.isReady);
    // inProgress should be equals to false to start new round.
    if (this.inProgress) return;

    this.currentWord = words[Math.floor(Math.random() * words.length)];
    this.cluesGiven = 0;
    this.revealedIndices = [];
    this.correctGuessers.clear();
    this.currentDrawer =
      this.players[Math.floor(Math.random() * playersReady.length)];
    // add the current drawer to correctGuesser
    // to exclude him in guessers
    this.correctGuessers.add(this.currentDrawer);

    // generate clue
    this.currentClue = this.generateClue(this.currentWord, 0);

    // set all players to playing
    this.players = this.players
      .filter((player) => player.isReady)
      .map((player) => {
        player.isPlaying = true;
        return player;
      });
  };

  endRound = (io) => {
    // set all players to not playing and not ready
    this.players = this.players.map((player) => {
      player.isPlaying = false;
      player.isReady = false;

      return player;
    });

    this.inProgress = false;
    io.emit("round-end");
  };

  ready = (io, socket, name, time) => {
    const playerExist = this.players.filter(
      (player) => player.id === socket.id
    )[0];
    if (!playerExist) {
      this.players.push(new Player(socket.id));
    }
    this.players = this.players.map((player) => {
      if (player.id === socket.id && !player.isPlaying && !player.isReady) {
        player.isReady = true;
        player.name = name;
      }

      return player;
    });
    console.log(`Player ${name} is ready...`);

    const readyToPlay = this.players.filter((player) => player.isReady);
    if (readyToPlay.length > 1) {
      // game start
      this.startNewRound();
      const payload = {
        clue: this.currentClue,
        timeLeft: time,
        word: this.currentWord,
        drawerId: this.currentDrawer.id,
        drawerName: this.currentDrawer.name,
      };
      io.emit("new-round", payload);
      console.log(this.players);
    } else {
      // unable to start, need another players
      console.log("Unable to start, need another player");
      socket.emit("waiting");
    }

    console.log(`Players ready (${readyToPlay.length}/${this.players.length})`);
  };

  guess = (io, socket, guess) => {
    const player = this.players.filter(
      (player) => socket.id === player.id && player.isPlaying
    )[0];
    if (!this.inProgress && !player) return;

    // already guessed correctly
    const hasGuessedCorrectly = [...this.correctGuessers].filter(
      (player) => socket.id === player.id
    );
    if (hasGuessedCorrectly.length) {
      return socket.emit("already-guessed");
    }

    const isWrong = guess.toLowerCase() === this.currentWord.toLowerCase();
    if (!isWrong) {
      return io.emit("guess-wrong", `[@${player.name}]: ${guess}`);
    }

    io.emit("guess-correct", { player: player.name });

    // giving points
    const points = [5, 3, 2, 1][this.cluesGiven] || 1;
    player.score += points;
    this.correctGuessers.add(player);

    this.updateScores(io);

    // check if all players guessed correctly
    const players = this.players.filter((player) => player.isPlaying);
    const allGuessed = this.correctGuessers.size === players.length;
    if (allGuessed) {
      this.endRound(io);
    }
  };

  timerUpdate = (io, timeLeft, clueIntervals = []) => {
    const clueIndex = clueIntervals.indexOf(timeLeft);

    if (clueIndex !== -1 && this.cluesGiven === clueIndex) {
      this.cluesGiven++;
      this.currentClue = this.generateClue(this.currentWord, this.cluesGiven);
      io.emit("new-clue", this.currentClue);
    }

    if (timeLeft === 0) {
      io.emit("round-end");
      this.endRound(io);
    }
  };

  updateScores = (io) => {
    const scores = this.players
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((player, i) => ({
        name: player.name,
        score: player.score,
        title:
          i === 0
            ? "#1 Master Guesser"
            : i === 1
            ? "#2 Doodle Nerd"
            : `#${i + 1} Bottom Feeder`,
      }));

    io.emit("score-update", scores);
  };

  generateClue = (word, clueCount) => {
    if (clueCount > this.cluesGiven - 1) {
      let index;
      do {
        index = Math.floor(Math.random() * word.length);
      } while (this.revealedIndices.includes(index));
      this.revealedIndices.push(index);
    }

    return word
      .split("")
      .map((char, i) => (this.revealedIndices.includes(i) ? char : "_"))
      .join("");
  };
}

module.exports = { Game };

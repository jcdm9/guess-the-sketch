class Player {
  constructor(id) {
    this.id = id;
    this.name = "";
    this.isReady = false;
    this.isPlaying = false;
    this.score = 0;
  }
}

module.exports = { Player };

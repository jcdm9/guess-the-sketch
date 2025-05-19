# Guess the Sketch

A real-time multiplayer drawing and guessing game where players take turns drawing and guessing words. The game features a scoring system, hints, and real-time chat.

## Features

- Real-time multiplayer gameplay
- Drawing canvas with color picker and brush size control
- Word guessing with progressive hints
- Scoring system based on how quickly players guess
- Real-time chat
- Player rankings with fun titles
- Responsive design

## Scoring System

- 5 points: Guess with 1 hint
- 3 points: Guess with 2 hints
- 2 points: Guess with 3 hints
- 1 point: Guess with more than 3 hints

## Player Rankings

- #1 Master Guesser: Top scorer
- #2 Doodle Nerd: Second place
- #N Bottom Feeder: Other players

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/guess-the-sketch.git
cd guess-the-sketch
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

## Running the Game

1. Start the server:
```bash
cd server
node index.js
```

2. Open the client:
- Open `client/index.html` in your browser
- Or serve it using a local server

3. Join the game:
- Enter your name
- Wait for another player to join
- Start playing!

## How to Play

1. When the game starts, you'll see a word to guess with some letters revealed
2. Use the chat to make your guesses
3. Additional letters are revealed at:
   - Start: 1 random letter
   - 20 seconds: +1 letter
   - 10 seconds: +1 letter
   - 5 seconds: +1 letter
4. Score points by guessing correctly with fewer hints
5. After each round, click "Let's Go!" when you're ready for the next round

## Technologies Used

- Frontend:
  - HTML5 Canvas for drawing
  - Socket.IO for real-time communication
  - Bootstrap for UI components
  - Vanilla JavaScript

- Backend:
  - Node.js
  - Express
  - Socket.IO

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by classic drawing and guessing games
- Built with modern web technologies
- Created for fun and learning 
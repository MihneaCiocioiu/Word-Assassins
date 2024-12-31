import http from 'http';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { Server, Socket } from 'socket.io';

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // e.g. 5 minutes of no activity
const STARTED_GAME_EXPIRY_MS = 1 * 60 * 1000; // e.g. 1 minute after the game has started

interface Player {
  name: string;
  socketId: string;
}

interface Game {
  gameId: string;
  players: Player[];
  host: string;
  started: boolean;
  startTime?: number;    // Timestamp when the game started
  lastActivity: number; // Timestamp of last game-related activity
}

const app = express();
app.use(cors({ origin: '*' }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// In-memory storage for games
const games: Record<string, Game> = {};

// Periodic cleanup for inactive/expired games
setInterval(() => {
  const now = Date.now();

  for (const gameId in games) {
    const game = games[gameId];

    // If the game has started and more than STARTED_GAME_EXPIRY_MS has passed since startTime, remove it
    if (game.started && game.startTime && now - game.startTime >= STARTED_GAME_EXPIRY_MS) {
      console.log(`Game ${gameId} has expired (started over a minute ago). Removing from memory...`);
      // Optionally disconnect all players
      game.players.forEach((p) => {
        const playerSocket = io.sockets.sockets.get(p.socketId);
        if (playerSocket) {
          playerSocket.disconnect(true);
        }
      });
      delete games[gameId];
      continue;
    }

    // If the game is not started or is still in pre-start stage, check lastActivity
    if (!game.started && now - game.lastActivity >= INACTIVITY_LIMIT_MS) {
      console.log(`Game ${gameId} is inactive for ${INACTIVITY_LIMIT_MS}ms. Removing from memory...`);
      // Optionally disconnect all players
      game.players.forEach((p) => {
        const playerSocket = io.sockets.sockets.get(p.socketId);
        if (playerSocket) {
          playerSocket.disconnect(true);
        }
      });
      delete games[gameId];
    }
  }
}, 30_000); // Checks every 30s (adjust as needed)

// Load words
const wordsPath = path.resolve(__dirname, './words.json');
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));

type MessageData = {
  action: string;
  [key: string]: any;
};

// Socket.io event handlers
io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.on('message', (data: MessageData) => {
    const { action, ...payload } = data;

    if (action === 'createGame') {
      const { player } = payload;
      const gameId = Math.random().toString(36).substr(2, 5).toUpperCase();

      games[gameId] = {
        gameId,
        players: [{ name: player, socketId: socket.id }],
        host: player,
        started: false,
        lastActivity: Date.now(), // Record first activity
      };

      socket.join(gameId);

      socket.emit('message', {
        result: 'OK',
        gameId,
        players: [player],
      });
    }

    if (action === 'joinGame') {
      const { player, gameId } = payload;
      const game = games[gameId];

      if (!game) {
        socket.emit('message', { result: 'Error', message: 'Game not found' });
        return;
      }

      // Update lastActivity
      game.lastActivity = Date.now();

      // Check if player is already in game
      if (game.players.some((p) => p.name === player)) {
        socket.emit('message', { result: 'Error', message: 'Player already in game' });
        return;
      }

      game.players.push({ name: player, socketId: socket.id });
      socket.join(gameId);

      io.to(gameId).emit('message', {
        result: 'OK',
        message: `Player ${player} joined the game`,
        players: game.players.map((p) => p.name),
      });

      console.log(`Player ${player} joined game ${gameId}`);
    }

    if (action === 'startGame') {
        const { gameId } = payload;
        const game = games[gameId];
      
        if (!game) {
          socket.emit('message', { result: 'Error', message: 'Game not found' });
          return;
        }
      
        // Check the number of players in the game
        if (game.players.length < 2) {
          socket.emit('message', {
            result: 'Error',
            message: 'Not enough players to start the game (need at least 2)'
          });
          return;
        }
      
        // Update lastActivity
        game.lastActivity = Date.now();
      
        // Notify all players about the countdown
        io.to(gameId).emit('message', { action: 'countdown', countdown: 5 });
      
        // Start the game after the countdown
        setTimeout(() => {
          const shuffledPlayers = game.players.sort(() => Math.random() - 0.5);
      
          // Assign targets and words
          const usedWords = new Set();
          for (let i = 0; i < shuffledPlayers.length; i++) {
            const targetIndex = (i + 1) % shuffledPlayers.length;
            const target = shuffledPlayers[targetIndex].name;
      
            let word;
            do {
              word = words[Math.floor(Math.random() * words.length)];
            } while (usedWords.has(word));
            usedWords.add(word);
      
            io.to(shuffledPlayers[i].socketId).emit('message', {
              action: 'gameStarted',
              target,
              word,
            });
          }
      
          game.started = true;
          game.startTime = Date.now();
        }, 5000);
      }
      
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove player from games
    Object.values(games).forEach((game) => {
      const playerIndex = game.players.findIndex((p) => p.socketId === socket.id);
      if (playerIndex !== -1) {
        const [removedPlayer] = game.players.splice(playerIndex, 1);
        // Update lastActivity
        game.lastActivity = Date.now();

        io.to(game.gameId).emit('message', {
          message: `Player ${removedPlayer.name} left the game`,
          players: game.players.map((p) => p.name),
        });
        console.log(`Player ${removedPlayer.name} removed from game ${game.gameId}`);
      }
    });
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server running on port ${process.env.PORT || 8080}`);
});

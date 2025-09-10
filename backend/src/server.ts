import http from 'http';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { Server, Socket } from 'socket.io';

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // e.g. 5 minutes of no activity
const STARTED_GAME_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours after the game has started
const DISCONNECT_GRACE_MS = 30 * 1000; // 30 seconds grace period for reconnection

interface Player {
  name: string;
  socketId: string;
  connected: boolean;
  disconnectAt?: number;
}

interface Game {
  gameId: string;
  players: Player[];
  host: string;
  started: boolean;
  startTime?: number;    // Timestamp when the game started
  lastActivity: number; // Timestamp of last game-related activity
  language: 'ro' | 'en';
  assignments?: Record<string, { target: string; word: string }>;
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

    // Remove players who have been disconnected beyond the grace period
    const toRemove: Player[] = [];
    game.players.forEach((p) => {
      if (!p.connected && p.disconnectAt && now - p.disconnectAt >= DISCONNECT_GRACE_MS) {
        toRemove.push(p);
      }
    });

    if (toRemove.length > 0) {
      toRemove.forEach((p) => {
        game.players = game.players.filter((gp) => gp.name !== p.name);
        game.lastActivity = now;
        io.to(game.gameId).emit('message', {
          message: `Player ${p.name} left the game`,
          players: game.players.map((pl) => pl.name),
        });
        console.log(`Player ${p.name} removed from game ${game.gameId} after grace period`);
      });
    }
  }
}, 30_000); // Checks every 30s (adjust as needed)

// Load words per language
const wordsPathRo = path.resolve(__dirname, './words.json');
const wordsPathEn = path.resolve(__dirname, './words_en.json');

const wordsByLanguage: Record<'ro' | 'en', string[]> = {
  ro: JSON.parse(fs.readFileSync(wordsPathRo, 'utf8')),
  en: fs.existsSync(wordsPathEn)
    ? JSON.parse(fs.readFileSync(wordsPathEn, 'utf8'))
    : [],
};

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
      const { player, language } = payload;
      const gameId = Math.random().toString(36).substr(2, 5).toUpperCase();

      games[gameId] = {
        gameId,
        players: [{ name: player, socketId: socket.id, connected: true }],
        host: player,
        started: false,
        lastActivity: Date.now(), // Record first activity
        language: (language === 'en' || language === 'ro') ? language : 'ro',
        assignments: {},
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

      // If player name already exists, treat this as a reconnection/reattach
      const existing = game.players.find((p) => p.name === player);
      if (existing) {
        existing.socketId = socket.id;
        existing.connected = true;
        existing.disconnectAt = undefined;
        socket.join(gameId);

        socket.emit('message', {
          result: 'OK',
          message: 'rejoined',
          players: game.players.map((p) => p.name),
        });

        // If the game has started, re-send this player's assignment
        const assignment = game.assignments && game.assignments[player];
        if (game.started && assignment) {
          io.to(socket.id).emit('message', {
            action: 'gameStarted',
            target: assignment.target,
            word: assignment.word,
          });
        }

        console.log(`Player ${player} rejoined game ${gameId}`);
        return;
      }

      game.players.push({ name: player, socketId: socket.id, connected: true });
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
          const usedWords = new Set<string>();
          const wordList = (game.language && wordsByLanguage[game.language]?.length)
            ? wordsByLanguage[game.language]
            : wordsByLanguage['ro'];
          game.assignments = {};
          for (let i = 0; i < shuffledPlayers.length; i++) {
            const targetIndex = (i + 1) % shuffledPlayers.length;
            const target = shuffledPlayers[targetIndex].name;
      
            let word;
            do {
              word = wordList[Math.floor(Math.random() * wordList.length)];
            } while (usedWords.has(word));
            usedWords.add(word);
      
            // Persist assignment for reconnection support
            game.assignments[shuffledPlayers[i].name] = { target, word };

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

    // Mark player as temporarily disconnected; do not remove immediately
    Object.values(games).forEach((game) => {
      const player = game.players.find((p) => p.socketId === socket.id);
      if (player) {
        player.connected = false;
        player.disconnectAt = Date.now();
        game.lastActivity = Date.now();
        console.log(`Player ${player.name} temporarily disconnected from game ${game.gameId}`);
      }
    });
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server running on port ${process.env.PORT || 8080}`);
});

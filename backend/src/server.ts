import WebSocket, { WebSocketServer } from 'ws';

// Utility function to generate a 5-character game ID
function generateGameId(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let gameId = '';
    for (let i = 0; i < 5; i++) {
        gameId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return gameId;
}

// In-memory storage for games
interface Game {
    gameId: string;
    players: { name: string; ws: WebSocket }[];
    host: string;
    started: boolean;
}

const games: Record<string, Game> = {};

// Create a WebSocket server
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());

            // Handle the "createGame" action
            if (message.action === 'createGame' && typeof message.player === 'string') {
                let gameId: string;

                // Ensure unique game IDs
                do {
                    gameId = generateGameId();
                } while (games[gameId]);

                games[gameId] = {
                    gameId,
                    players: [{ name: message.player, ws }],
                    host: message.player,
                    started: false,
                };

                const response = {
                    result: 'OK',
                    gameId,
                };

                ws.send(JSON.stringify(response));
                console.log(`Game created with ID: ${gameId}`);
            } 
            
            // Handle the "joinGame" action
            else if (message.action === 'joinGame' && typeof message.player === 'string' && typeof message.gameId === 'string') {
                const { player, gameId } = message;

                // Check if the game exists
                if (!games[gameId]) {
                    ws.send(
                        JSON.stringify({
                            result: 'Error',
                            message: 'Game not found',
                        })
                    );
                    return;
                }

                // Check if the player is already in the game
                if (games[gameId].players.some((p) => p.name === player)) {
                    ws.send(
                        JSON.stringify({
                            result: 'Error',
                            message: 'Player already in the game',
                        })
                    );
                    return;
                }

                // Add the player to the game
                games[gameId].players.push({ name: player, ws });

                const response = {
                    result: 'OK',
                };

                ws.send(JSON.stringify(response));
                console.log(`Player ${player} joined game ${gameId}`);
            } 
            
            // Handle the "startGame" action
            else if (message.action === 'startGame') {
                // Find the game where this WebSocket is the host
                const game = Object.values(games).find((g) =>
                    g.players.some((p) => p.ws === ws && g.host === p.name)
                );

                if (!game) {
                    ws.send(
                        JSON.stringify({
                            result: 'Error',
                            message: 'You are not the host of any game',
                        })
                    );
                    return;
                }

                // Check if the game has enough players to start
                if (game.players.length < 2) {
                    ws.send(
                        JSON.stringify({
                            result: 'Error',
                            message: 'Not enough players to start the game',
                        })
                    );
                    return;
                }

                // Notify all players that the game has started
                game.players.forEach((player) => {
                    player.ws.send(JSON.stringify({ message: 'Game started' }));
                });

                // Wait 5 seconds and then send targets and words
                setTimeout(() => {
                    const words = ['apple', 'banana', 'cherry', 'dragon', 'elephant']; // Example words
                    const usedWords = [];
                    const shuffledPlayers = game.players.sort(() => Math.random() - 0.5);

                    for (let i = 0; i < shuffledPlayers.length; i++) {
                        const targetIndex = (i + 1) % shuffledPlayers.length;
                        let randomWord = words[Math.floor(Math.random() * words.length)];
                        usedWords.push(randomWord);
                        while (usedWords.includes(randomWord)) {
                            randomWord = words[Math.floor(Math.random() * words.length)];
                        }
                        const target = shuffledPlayers[targetIndex].name;

                        // Send target and word to the player
                        shuffledPlayers[i].ws.send(
                            JSON.stringify({
                                target,
                                word: randomWord,
                            })
                        );
                    }

                    game.started = true;
                    console.log(`Game ${game.gameId} assignments sent`);
                }, 5000);
            } 
            
            // Handle invalid actions
            else {
                ws.send(
                    JSON.stringify({
                        result: 'Error',
                        message: 'Invalid request format or missing parameters',
                    })
                );
            }
        } catch (error) {
            console.error('Error parsing message:', error);
            ws.send(
                JSON.stringify({
                    result: 'Error',
                    message: 'Invalid JSON format',
                })
            );
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket server running on ws://localhost:8080');

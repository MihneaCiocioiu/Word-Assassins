"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const games = {};
// Create a WebSocket server
const wss = new ws_1.WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            // Handle the "startGame" action
            if (message.action === 'startGame' && typeof message.player === 'string') {
                const gameId = (0, uuid_1.v4)(); // Generate a unique game ID
                games[gameId] = {
                    gameId,
                    players: [message.player],
                };
                const response = {
                    result: 'OK',
                    gameId,
                };
                ws.send(JSON.stringify(response));
                console.log(`Game created with ID: ${gameId}`);
            }
            else {
                // Send an error for invalid requests
                ws.send(JSON.stringify({
                    result: 'Error',
                    message: 'Invalid request format or missing parameters',
                }));
            }
        }
        catch (error) {
            console.error('Error parsing message:', error);
            ws.send(JSON.stringify({
                result: 'Error',
                message: 'Invalid JSON format',
            }));
        }
    });
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});
console.log('WebSocket server running on ws://localhost:8080');

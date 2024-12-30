import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const getSocket = (): Socket => {
    if (!socket) {
        socket = io('ws://localhost:8080'); // Replace with your server URL

        socket.on('connect', () => {
            console.log('Connected to WebSocket server');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });
    }
    return socket;
};

export const sendMessage = (action: string, payload: object) => {
    const socket = getSocket();
    socket.emit('message', { action, ...payload });
};

export default getSocket;

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const getSocket = (): Socket => {
  if (!socket) {
    socket = io('https://word-assassins.onrender.com', {
      // If you want to strictly use WebSockets only:
      transports: ['websocket'],

      // If your backend uses a custom path:
      // path: '/socket.io',

      // If needed, you can allow CORS credentials, etc.:
      // withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
  }
  return socket;
};

export const sendMessage = (action: string, payload: object) => {
  const s = getSocket();
  s.emit('message', { action, ...payload });
};

export default getSocket;

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8080'
    : 'https://word-assassins.onrender.com');

const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // If you want to strictly use WebSockets only:
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      timeout: 10000,

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

    socket.on('reconnect_attempt', (attempt) => {
      console.log('Reconnecting to WebSocket server, attempt', attempt);
    });

    socket.on('reconnect', (attempt) => {
      console.log('Reconnected to WebSocket server after', attempt, 'attempts');
    });
  }
  return socket;
};

export const sendMessage = (action: string, payload: object) => {
  const s = getSocket();
  s.emit('message', { action, ...payload });
};

export default getSocket;

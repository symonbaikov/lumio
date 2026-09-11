import { io, type Socket } from 'socket.io-client';

let notificationsSocket: Socket | null = null;

function getBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && /^https?:\/\//.test(apiUrl)) {
    return apiUrl.replace(/\/api\/v1\/?$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
}

export function connectNotificationsSocket(token: string): Socket {
  if (notificationsSocket) {
    return notificationsSocket;
  }

  const baseUrl = getBaseUrl();
  notificationsSocket = io(`${baseUrl}/notifications`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
  });

  return notificationsSocket;
}

export function getNotificationsSocket(): Socket | null {
  return notificationsSocket;
}

export function disconnectNotificationsSocket(): void {
  if (!notificationsSocket) {
    return;
  }

  notificationsSocket.disconnect();
  notificationsSocket = null;
}

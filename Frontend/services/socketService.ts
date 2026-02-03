import { io, Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;

    get isConnected() {
        return this.socket?.connected || false;
    }

    connect(deviceId: string) {
        if (this.socket?.connected) return;

        // Connect to Backend Port 5000
        this.socket = io('http://127.0.0.1:5000', {
            auth: { deviceId },
            // transports: ['websocket'] // Removed to allow Auto-Upgrade (Polling -> WebSocket)
        });

        this.socket.on('connect_error', (err) => {
            console.error("Socket Connection Error:", err.message);
        });

        this.socket.on('connect', () => {
            console.log('Connected to backend:', this.socket?.id);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    enterQueue(data: { preference: 'male' | 'female' | 'any'; gender: string; nickname: string; bio: string }) {
        console.log("🚀 [SocketService] Emitting queue:enter", data);
        this.socket?.emit('queue:enter', data);
    }

    sendMessage(roomId: string, text: string) {
        this.socket?.emit('chat:message', { roomId, text });
    }

    leaveChat(roomId: string) {
        this.socket?.emit('chat:leave', { roomId });
    }

    reportUser(roomId: string) {
        this.socket?.emit('chat:report', { roomId });
    }

    // Event Listeners
    onMatch(callback: (data: { roomId: string }) => void) {
        this.socket?.on('match:found', callback);
    }

    onChatEnded(callback: () => void) {
        this.socket?.on('chat:ended', callback);
    }

    onMessage(callback: (data: { text: string; senderId: string; timestamp: number }) => void) {
        this.socket?.on('chat:message', callback);
    }

    offMatch() {
        this.socket?.off('match:found');
    }

    offMessage() {
        this.socket?.off('chat:message');
    }

    offChatEnded() {
        this.socket?.off('chat:ended');
    }
}

export const socketService = new SocketService();
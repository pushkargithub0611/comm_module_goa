import { ChatMessage, Profile } from "@/types/chat";

// Define WebSocket message types
export type WebSocketMessage = {
  type: string;
  message?: ChatMessage;
  data?: any;
};

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: ((message: ChatMessage) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private groupId: string | null = null;

  // Connect to WebSocket server
  connect(userId: string, groupId?: string): void {
    if (this.socket) {
      this.disconnect();
    }

    this.userId = userId;
    this.groupId = groupId || null;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_HOST || 'localhost:8090';
    const wsUrl = `${wsProtocol}//${wsHost}/ws?userId=${userId}${groupId ? `&roomId=${groupId}` : ''}`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connection established');
      this.notifyConnectionHandlers(true);
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        if (data.type === 'new_message' && data.message) {
          this.notifyMessageHandlers(data.message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      this.notifyConnectionHandlers(false);
      this.socket = null;

      // Attempt to reconnect after 5 seconds
      if (!event.wasClean) {
        this.reconnectTimer = setTimeout(() => {
          if (this.userId) {
            this.connect(this.userId, this.groupId || undefined);
          }
        }, 5000);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // Send a message through WebSocket
  sendMessage(content: string, groupId: string, senderId: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    const message = {
      type: 'send_message',
      message: {
        content,
        group_id: groupId,
        sender_id: senderId,
      }
    };

    this.socket.send(JSON.stringify(message));
  }

  // Register a handler for new messages
  onMessage(handler: (message: ChatMessage) => void): () => void {
    this.messageHandlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  // Register a handler for connection status changes
  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  // Notify all message handlers
  private notifyMessageHandlers(message: ChatMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  // Notify all connection handlers
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  // Check if WebSocket is connected
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();
export default websocketService;

import { useState, useEffect, useCallback } from "react";
import { ChatMessage } from "@/types/chat";
import { useToast } from "@/components/ui/use-toast";
import { getMessages, markMessageAsRead } from "@/services/apiService";
import websocketService from "@/services/websocketService";

export function useMessages(groupId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    if (!groupId) return;
    
    try {
      setIsLoading(true);
      const fetchedMessages = await getMessages(groupId);
      setMessages(fetchedMessages);
      setError(null);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch messages"));
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [groupId, toast]);

  // Mark a message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await markMessageAsRead(messageId);
    } catch (err) {
      console.error("Error marking message as read:", err);
    }
  }, []);

  // Add a new message to the state
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prevMessages => {
      // Check if message already exists to prevent duplicates
      const exists = prevMessages.some(m => m.id === message.id);
      if (exists) return prevMessages;
      
      // Add new message and sort by created_at
      return [...prevMessages, message].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
    
    // Mark the message as read automatically
    if (message.id) {
      markAsRead(message.id);
    }
  }, [markAsRead]);

  // Initialize WebSocket connection and message handlers
  useEffect(() => {
    if (!groupId) return;
    
    // Get user ID from local storage
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      setError(new Error("User not authenticated"));
      return;
    }
    
    // Fetch initial messages
    fetchMessages();
    
    // Connect to WebSocket for real-time updates
    websocketService.connect(userId, groupId);
    
    // Set up message handler
    const unsubscribe = websocketService.onMessage((message) => {
      if (message.group_id === groupId) {
        addMessage(message);
      }
    });
    
    // Clean up on unmount
    return () => {
      unsubscribe();
      websocketService.disconnect();
    };
  }, [groupId, fetchMessages, addMessage]);

  return {
    messages,
    isLoading,
    error,
    fetchMessages,
    markAsRead
  };
}

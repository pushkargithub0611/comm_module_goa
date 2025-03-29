import { sendMessage as apiSendMessage } from "@/services/apiService";
import websocketService from "@/services/websocketService";

export async function sendMessage(content: string, groupId: string) {
  try {
    // Get current user ID from local storage
    const userId = localStorage.getItem('user_id');
    
    if (!userId) {
      throw new Error("User not authenticated");
    }
    
    // Send message through API
    const message = await apiSendMessage(content, groupId);
    
    // Also send through WebSocket for real-time updates
    // This is a backup in case the WebSocket connection is not established yet
    websocketService.sendMessage(content, groupId, userId);
    
    return { success: true, message };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error };
  }
}

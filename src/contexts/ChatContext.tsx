
import { createContext, useContext, useState } from "react";
import { ChatGroup, ChatMessage, Profile } from "@/types/chat";
import { useToast } from "@/components/ui/use-toast";
import { useMessages } from "@/hooks/useMessages";
import { useGroups } from "@/hooks/useGroups";
import { sendMessage as sendMessageService } from "@/services/messageService";

type ChatContextType = {
  currentGroup: ChatGroup | null;
  setCurrentGroup: (group: ChatGroup | null) => void;
  groups: ChatGroup[];
  messages: ChatMessage[];
  profiles: { [key: string]: Profile };
  sendMessage: (content: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [currentGroup, setCurrentGroup] = useState<ChatGroup | null>(null);
  const [profiles, setProfiles] = useState<{ [key: string]: Profile }>({});
  const { groups } = useGroups();
  const { messages } = useMessages(currentGroup?.id, setProfiles);
  const { toast } = useToast();

  const sendMessage = async (content: string) => {
    if (!currentGroup) return;

    try {
      await sendMessageService(content, currentGroup.id);
    } catch (error) {
      toast({
        title: "Error sending message",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <ChatContext.Provider
      value={{
        currentGroup,
        setCurrentGroup,
        groups,
        messages,
        profiles,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};


import { AppSidebar } from "@/components/app/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Chat } from "@/components/app/Chat";
import { ChatProvider } from "@/contexts/ChatContext";

const ChatPage = () => {
  return (
    <ChatProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-6">
            <Chat />
          </main>
        </div>
      </SidebarProvider>
    </ChatProvider>
  );
};

export default ChatPage;

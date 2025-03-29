import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/contexts/ChatContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, User } from "lucide-react";

export function Chat() {
  const { currentGroup, groups, messages, profiles, sendMessage, setCurrentGroup } = useChat();
  const [newMessage, setNewMessage] = useState("");
  const [selectedTab, setSelectedTab] = useState("individual"); // Set default tab to individual

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage(newMessage);
    setNewMessage("");
  };

  const groupChats = groups.filter(group => group.chat_type === 'group');
  const individualChats = groups.filter(group => group.chat_type === 'individual');

  if (!currentGroup) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4 w-full max-w-3xl mx-auto px-2 sm:px-4">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="groups" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                Group Chats ({groupChats.length})
              </TabsTrigger>
              <TabsTrigger value="individual" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                Individual Chats ({individualChats.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="groups">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {groupChats.map((group) => (
                  <Card
                    key={group.id}
                    className="p-3 sm:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setCurrentGroup(group)}
                  >
                    <h3 className="font-semibold">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                    <Badge variant="outline" className="mt-2">
                      {group.organizational_unit || group.group_type}
                    </Badge>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="individual">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {individualChats.map((chat) => (
                  <Card
                    key={chat.id}
                    className="p-3 sm:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setCurrentGroup(chat)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {chat.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{chat.name}</h3>
                        <p className="text-sm text-muted-foreground">Individual Chat</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <div className="p-3 sm:p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback>
                {currentGroup.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{currentGroup.name}</h2>
              <p className="text-sm text-muted-foreground">
                {currentGroup.chat_type === 'individual' ? 'Individual Chat' : currentGroup.description}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="self-end sm:self-auto" onClick={() => setCurrentGroup(null)}>
            Change Chat
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3 sm:p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const sender = profiles[message.sender_id];
            return (
              <div key={message.id} className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src={sender?.avatar_url || ""} />
                  <AvatarFallback>
                    {sender?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {sender?.full_name || "Unknown User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), "HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{message.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit">Send</Button>
        </div>
      </form>
    </Card>
  );
}

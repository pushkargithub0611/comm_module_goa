import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Check, Clock, X, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { apiService } from "@/services/apiService";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  type: "announcement" | "message" | "system";
  group_id?: string;
  group_name?: string;
  sender_name?: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      
      if (!user) {
        return;
      }
      
      // In a real implementation, we would fetch from our API
      // For now, we'll use mock data
      const mockNotifications: Notification[] = [
        {
          id: "1",
          title: "New Announcement",
          message: "School will be closed on Monday for maintenance",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          read: false,
          type: "announcement",
          group_name: "School Announcements"
        },
        {
          id: "2",
          title: "Assignment Due",
          message: "Math homework is due tomorrow",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          read: true,
          type: "message",
          group_name: "Math Class",
          sender_name: "Mrs. Johnson"
        },
        {
          id: "3",
          title: "System Update",
          message: "The system will be updated tonight at 10 PM",
          created_at: new Date(Date.now() - 172800000).toISOString(),
          read: false,
          type: "system"
        }
      ];
      
      // Filter notifications based on the active tab
      let filteredNotifications = mockNotifications;
      
      if (activeTab === "unread") {
        filteredNotifications = mockNotifications.filter(n => !n.read);
      } else if (activeTab === "announcements") {
        filteredNotifications = mockNotifications.filter(n => n.type === "announcement");
      }
      
      setNotifications(filteredNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load notifications. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // In a real implementation, we would call our API
      // For now, we'll just update the local state
      
      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
      
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark notification as read",
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // In a real implementation, we would call our API
      // For now, we'll just update the local state
      
      // Update local state
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete notification",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      // In a real implementation, we would call our API
      // For now, we'll just update the local state
      
      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark all notifications as read",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "announcement":
        return <Bell className="h-4 w-4" />;
      case "message":
        return <Check className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getNotificationTypeClass = (type: string) => {
    switch (type) {
      case "announcement":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "message":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "system":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex bg-background">
          <AppSidebar />
          <main className="flex-1 p-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex bg-background">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="container mx-auto py-8">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Stay updated with the latest announcements and messages</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                  <div className="flex justify-between items-center mb-4">
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="unread">
                        Unread
                        {notifications.filter(n => !n.read).length > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {notifications.filter(n => !n.read).length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="announcements">Announcements</TabsTrigger>
                    </TabsList>
                    <Button variant="outline" size="sm" onClick={markAllAsRead}>
                      Mark all as read
                    </Button>
                  </div>

                  <TabsContent value="all" className="space-y-4">
                    {renderNotifications()}
                  </TabsContent>
                  <TabsContent value="unread" className="space-y-4">
                    {renderNotifications()}
                  </TabsContent>
                  <TabsContent value="announcements" className="space-y-4">
                    {renderNotifications()}
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between"></CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );

  function renderNotifications() {
    if (isLoading) {
      return <div className="text-center py-4">Loading notifications...</div>;
    }

    if (notifications.length === 0) {
      return <div className="text-center py-4">No notifications found</div>;
    }

    return notifications.map((notification) => (
      <Card key={notification.id} className={`relative ${!notification.read ? "bg-muted/30" : ""}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {getNotificationIcon(notification.type)}
              <CardTitle className="text-base">
                {notification.title}
                {!notification.read && (
                  <Badge variant="default" className="ml-2">
                    New
                  </Badge>
                )}
              </CardTitle>
            </div>
            <div className="flex gap-2">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => markAsRead(notification.id)}
                  className="h-6 w-6"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteNotification(notification.id)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            {notification.group_name && `${notification.group_name} • `}
            {notification.sender_name && `${notification.sender_name} • `}
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{notification.message}</p>
        </CardContent>
      </Card>
    ));
  }
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Chat } from "./Chat";
import { ChatProvider } from "@/contexts/ChatContext";
import { MessageCircle, Bell, Send, Clock, Users, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// This would normally come from an auth context
const userRole = "administrator"; // Could be: administrator, teacher, student, parent
const userUnit = "Grade 10"; // Organizational unit

export function Dashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // This would normally come from an API or context
  const stats = [
    {
      title: "Total Notifications",
      value: "156",
      icon: Bell,
      description: "24 new today",
      color: "text-blue-500",
    },
    {
      title: "Messages Sent",
      value: "2,345",
      icon: Send,
      description: "128 this week",
      color: "text-green-500",
    },
    {
      title: "Awaiting Response",
      value: "23",
      icon: Clock,
      description: "5 urgent",
      color: "text-yellow-500",
    },
    {
      title: "Active Users",
      value: "1,289",
      icon: Users,
      description: "156 currently online",
      color: "text-purple-500",
    },
  ];

  return (
    <ChatProvider>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Communication Hub</h1>
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[400px] md:w-[540px] p-0">
                <Chat />
              </SheetContent>
            </Sheet>
            <Badge variant="outline" className="font-medium">
              {user?.organizational_unit || userUnit}
            </Badge>
            <span className="text-sm text-muted-foreground">Role: {user?.role || userRole}</span>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be redirected to the login page and will need to sign in again to access your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your recent communication activity will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    </ChatProvider>
  );
}

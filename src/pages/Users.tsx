
import { AppSidebar } from "@/components/app/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useProfiles } from "@/hooks/useProfiles";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const Users = () => {
  const { profiles, loading } = useProfiles();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Users</h1>
            <Badge variant="secondary">
              {profiles.length} {profiles.length === 1 ? 'User' : 'Users'}
            </Badge>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : (
            <Card className="p-0">
              <ScrollArea className="h-[calc(100vh-12rem)] rounded-md border">
                <div className="p-4">
                  <div className="grid gap-6">
                    {profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between space-x-4 rounded-lg border p-4"
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={profile.avatar_url || ""} />
                            <AvatarFallback>
                              {profile.full_name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {profile.full_name || "Unnamed User"}
                            </p>
                            {profile.role && (
                              <p className="text-sm text-muted-foreground">
                                {profile.role}
                              </p>
                            )}
                          </div>
                        </div>
                        {profile.organizational_unit && (
                          <Badge variant="outline">
                            {profile.organizational_unit}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </Card>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Users;

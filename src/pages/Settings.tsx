import { useState } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Shield, Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Profile } from "@/types/chat";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { PasswordChangeDialog } from "@/components/settings/PasswordChangeDialog";
import { getCurrentUser, getProfile, updateProfile as updateProfileService } from "@/services/mockDataService";
import { v4 as uuidv4 } from 'uuid';

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await getCurrentUser();
      if (!user || userError) throw new Error('Not authenticated');

      const { data: profile, error } = await getProfile(user.id);

      if (error) throw error;
      return profile as Profile;
    },
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const { data: { user }, error: userError } = await getCurrentUser();
      if (!user || userError) throw new Error('Not authenticated');

      const { error } = await updateProfileService(user.id, updates);

      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Avatar upload mutation
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user }, error: userError } = await getCurrentUser();
      if (!user || userError) throw new Error('Not authenticated');

      // In our mock implementation, we'll just create a fake URL
      // In a real app, this would upload to a storage service
      const mockPublicUrl = `https://example.com/avatars/${uuidv4()}.jpg`;

      await updateProfile.mutateAsync({ avatar_url: mockPublicUrl });
      return mockPublicUrl;
    },
    onSuccess: () => {
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Password change mutation
  const changePassword = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      // In a mock implementation, we'll just simulate success
      // In a real app, this would call an auth service
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      
      return { success: true };
    },
    onSuccess: () => {
      setIsPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    changePassword.mutate({ newPassword });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-3 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>
                      Update your account profile information and avatar
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <AvatarUpload
                      avatarUrl={profile?.avatar_url}
                      fullName={profile?.full_name}
                      onAvatarChange={(e) => uploadAvatar.mutate(e.target.files?.[0])}
                    />
                    
                    <ProfileForm
                      profile={{
                        ...profile,
                        created_at: profile?.created_at || new Date().toISOString(),
                        updated_at: profile?.updated_at || new Date().toISOString()
                      }}
                      onProfileUpdate={(field, value) => 
                        updateProfile.mutate({ [field]: value })
                      }
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security
                    </CardTitle>
                    <CardDescription>
                      Manage your account security settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsPasswordDialogOpen(true)}
                    >
                      Change Password
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            <PasswordChangeDialog
              isOpen={isPasswordDialogOpen}
              onOpenChange={setIsPasswordDialogOpen}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              onNewPasswordChange={setNewPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onPasswordChange={() => changePassword.mutate({ newPassword })}
              isPending={changePassword.isPending}
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;

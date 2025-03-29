import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { Dashboard } from "@/components/app/Dashboard";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-3 sm:p-6 pt-16 md:pt-6">
          <Dashboard />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;

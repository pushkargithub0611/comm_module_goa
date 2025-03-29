import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { getProfiles } from "@/services/apiService";
import { Profile } from "@/types/chat"; // Using the chat Profile type to ensure consistency

// Mock profiles for fallback when API fails
const mockProfiles: Profile[] = [
  {
    id: "user1",
    full_name: "John Smith",
    role: "teacher",
    organizational_unit: "High School",
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user2",
    full_name: "Sarah Johnson",
    role: "student",
    organizational_unit: "Grade 10",
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user3",
    full_name: "Michael Brown",
    role: "principal",
    organizational_unit: "Administration",
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user4",
    full_name: "Emily Davis",
    role: "parent",
    organizational_unit: "Grade 8",
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user5",
    full_name: "Current User",
    role: "admin",
    organizational_unit: "IT Department",
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const useProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      // Get all profiles
      const data = await getProfiles();
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      
      // Use mock data as fallback
      setProfiles(mockProfiles);
      
      toast({
        title: "Warning",
        description: "Using demo user data. Some features may be limited.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { profiles, loading, fetchProfiles };
};

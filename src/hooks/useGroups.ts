import { useState, useEffect, useCallback } from "react";
import { ChatGroup } from "@/types/chat";
import { useToast } from "@/components/ui/use-toast";
import { getGroups, createGroup } from "@/services/apiService";

// Mock data for fallback when API fails
const mockGroups: ChatGroup[] = [
  {
    id: "group1",
    name: "School Announcements",
    description: "Important announcements for all school members",
    chat_type: "group",
    group_type: "class", 
    organizational_unit: "School", 
    created_at: new Date().toISOString(),
    created_by: "system"
  },
  {
    id: "group2",
    name: "Teachers Lounge",
    description: "Discussion group for teachers",
    chat_type: "group",
    group_type: "department",
    organizational_unit: "Teachers",
    created_at: new Date().toISOString(),
    created_by: "system"
  },
  {
    id: "group3",
    name: "Student Council",
    description: "Student council discussions and announcements",
    chat_type: "group",
    group_type: "custom",
    organizational_unit: "Students", 
    created_at: new Date().toISOString(),
    created_by: "system"
  }
];

export function useGroups() {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Fetch groups from API
  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedGroups = await getGroups();
      setGroups(fetchedGroups);
      setError(null);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch groups"));
      
      // Use mock data as fallback
      setGroups(mockGroups);
      
      toast({
        title: "Warning",
        description: "Using demo data. Some features may be limited.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Create a new group
  const addGroup = useCallback(async (groupData: {
    name: string;
    description?: string;
    group_type: 'class' | 'department' | 'custom';
    organizational_unit?: string;
    chat_type: 'group' | 'individual';
    members?: string[];
  }) => {
    try {
      const newGroup = await createGroup(groupData);
      setGroups(prevGroups => [...prevGroups, newGroup]);
      toast({
        title: "Success",
        description: "Group created successfully",
      });
      return newGroup;
    } catch (err) {
      console.error("Error creating group:", err);
      
      // Create a mock group as fallback
      const mockGroup: ChatGroup = {
        id: `mock-${Date.now()}`,
        name: groupData.name,
        description: groupData.description || "",
        group_type: groupData.group_type,
        organizational_unit: groupData.organizational_unit || "Default", 
        chat_type: groupData.chat_type,
        created_at: new Date().toISOString(),
        created_by: "current_user"
      };
      
      setGroups(prevGroups => [...prevGroups, mockGroup]);
      
      toast({
        title: "Warning",
        description: "Group created in demo mode. Changes won't be saved to the server.",
        variant: "destructive",
      });
      
      return mockGroup;
    }
  }, [toast]);

  // Load groups on component mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    isLoading,
    error,
    fetchGroups,
    addGroup
  };
}

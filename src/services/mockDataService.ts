import { ChatGroup, ChatMessage, Profile } from "@/types/chat";
import { v4 as uuidv4 } from 'uuid';

// Mock profiles data
export const mockProfiles: Record<string, Profile> = {
  "user1": {
    id: "user1",
    full_name: "John Smith",
    avatar_url: null,
    role: "teacher",
    organizational_unit: "Grade 10",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  "user2": {
    id: "user2",
    full_name: "Sarah Johnson",
    avatar_url: null,
    role: "student",
    organizational_unit: "Grade 10",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  "user3": {
    id: "user3",
    full_name: "Tech Support",
    avatar_url: null,
    role: "admin",
    organizational_unit: "IT Department",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  "current_user": {
    id: "current_user",
    full_name: "Current User",
    avatar_url: null,
    role: "administrator",
    organizational_unit: "Grade 10",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

// Mock groups data
export const mockGroups: ChatGroup[] = [
  {
    id: "group1",
    name: "Grade 10 Announcements",
    description: "Important announcements for Grade 10 students and teachers",
    chat_type: "group",
    group_type: "class",
    organizational_unit: "Grade 10",
    created_at: new Date().toISOString(),
    created_by: "user1"
  },
  {
    id: "group2",
    name: "Math Department",
    description: "Discussion group for math teachers",
    chat_type: "group",
    group_type: "department",
    organizational_unit: "Math Department",
    created_at: new Date().toISOString(),
    created_by: "user1"
  },
  {
    id: "chat1",
    name: "John Smith",
    description: null,
    chat_type: "individual",
    group_type: "custom",
    organizational_unit: null,
    created_at: new Date().toISOString(),
    created_by: "current_user"
  },
  {
    id: "chat2",
    name: "Sarah Johnson",
    description: null,
    chat_type: "individual",
    group_type: "custom",
    organizational_unit: null,
    created_at: new Date().toISOString(),
    created_by: "current_user"
  }
];

// Mock messages data
export const mockMessages: Record<string, ChatMessage[]> = {
  "group1": [
    {
      id: "msg1",
      content: "Welcome to the Grade 10 Announcements group!",
      sender_id: "user1",
      group_id: "group1",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: "msg2",
      content: "Remember to submit your assignments by Friday.",
      sender_id: "user1",
      group_id: "group1",
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updated_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  "group2": [
    {
      id: "msg3",
      content: "Let's discuss the new math curriculum.",
      sender_id: "user1",
      group_id: "group2",
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString()
    }
  ],
  "chat1": [
    {
      id: "msg4",
      content: "Hi, do you have a moment to discuss the project?",
      sender_id: "user1",
      group_id: "chat1",
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      updated_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "msg5",
      content: "Sure, what do you need help with?",
      sender_id: "current_user",
      group_id: "chat1",
      created_at: new Date(Date.now() - 3500000).toISOString(), // 58 minutes ago
      updated_at: new Date(Date.now() - 3500000).toISOString()
    }
  ],
  "chat2": [
    {
      id: "msg6",
      content: "Have you completed the assignment?",
      sender_id: "current_user",
      group_id: "chat2",
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      updated_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: "msg7",
      content: "Yes, I'll submit it today.",
      sender_id: "user2",
      group_id: "chat2",
      created_at: new Date(Date.now() - 7100000).toISOString(), // 1 hour 58 minutes ago
      updated_at: new Date(Date.now() - 7100000).toISOString()
    }
  ]
};

// Mock notifications data
export const mockNotifications = [
  {
    id: "notif1",
    title: "New Assignment",
    message: "You have a new math assignment due next week.",
    type: "assignment",
    read: false,
    user_id: "current_user",
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "notif2",
    title: "Meeting Reminder",
    message: "Parent-teacher meeting tomorrow at 3 PM.",
    type: "reminder",
    read: true,
    user_id: "current_user",
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "notif3",
    title: "New Message",
    message: "You have a new message from Sarah Johnson.",
    type: "message",
    read: false,
    user_id: "current_user",
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updated_at: new Date(Date.now() - 7200000).toISOString()
  }
];

// Helper functions to simulate database operations
export const getGroups = async () => {
  return { data: mockGroups, error: null };
};

export const getMessages = async (groupId: string) => {
  return { 
    data: mockMessages[groupId] || [], 
    error: null 
  };
};

export const getProfiles = async (userIds: string[]) => {
  const profiles = userIds.map(id => mockProfiles[id]).filter(Boolean);
  return { data: profiles, error: null };
};

export const getProfile = async (userId: string) => {
  return { 
    data: mockProfiles[userId] || null, 
    error: null 
  };
};

export const getNotifications = async () => {
  return { data: mockNotifications, error: null };
};

export const getCurrentUser = async () => {
  return { 
    data: { 
      user: { 
        id: "current_user" 
      } 
    }, 
    error: null 
  };
};

export const addMessage = async (content: string, groupId: string) => {
  const newMessage: ChatMessage = {
    id: uuidv4(),
    content,
    sender_id: "current_user",
    group_id: groupId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  if (!mockMessages[groupId]) {
    mockMessages[groupId] = [];
  }
  
  mockMessages[groupId].push(newMessage);
  return { data: newMessage, error: null };
};

export const markNotificationAsRead = async (notificationId: string) => {
  const notification = mockNotifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
  }
  return { error: null };
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  if (mockProfiles[userId]) {
    mockProfiles[userId] = {
      ...mockProfiles[userId],
      ...updates,
      updated_at: new Date().toISOString()
    };
  }
  return { error: null };
};

// Mock event listeners
type ChannelCallback = (payload: any) => void;
type ChannelConfig = {
  event: string;
  schema: string;
  table: string;
  filter?: string;
};

class MockChannel {
  private callbacks: Map<string, ChannelCallback> = new Map();
  
  on(event: string, config: ChannelConfig, callback: ChannelCallback) {
    this.callbacks.set(event, callback);
    return this;
  }
  
  subscribe() {
    return this;
  }
  
  // Method to simulate events for testing
  simulateEvent(event: string, payload: any) {
    const callback = this.callbacks.get(event);
    if (callback) {
      callback(payload);
    }
  }
}

export const createChannel = (name: string) => {
  return new MockChannel();
};

export const removeChannel = (channel: MockChannel) => {
  // No-op in mock implementation
};

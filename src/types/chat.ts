
export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  organizational_unit: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ChatGroup = {
  id: string;
  name: string;
  description: string | null;
  group_type: 'class' | 'department' | 'custom';
  organizational_unit: string | null;
  created_at: string;
  created_by?: string | null;
  chat_type: 'group' | 'individual';  // Added this property
};

export type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  sender_id: string;
  group_id: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
};

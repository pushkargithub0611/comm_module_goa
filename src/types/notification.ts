
export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationFilter = {
  type?: NotificationType;
  read?: boolean;
  search?: string;
  dateRange?: {
    from: Date | undefined;
    to: Date | undefined;
  };
};

export type NotificationSort = {
  column: 'created_at' | 'title' | 'type';
  direction: 'asc' | 'desc';
};

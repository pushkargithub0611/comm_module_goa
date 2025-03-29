import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ChatGroup, ChatMessage, Profile } from "@/types/chat";

// Create an Axios instance with default config
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8090/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear token and user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API service class
class ApiService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  // Set auth token for API requests
  setAuthToken(token: string): void {
    this.api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  // Clear auth token
  clearAuthToken(): void {
    delete this.api.defaults.headers.common.Authorization;
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.delete(url, config);
    return response.data;
  }

  // Authentication methods
  async login(email: string, password: string) {
    return this.post('/auth/login', { email, password });
  }

  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    organizational_unit?: string;
  }) {
    return this.post('/auth/register', userData);
  }

  async logout() {
    this.clearAuthToken();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // User profile methods
  async getCurrentUser(): Promise<Profile> {
    return this.get('/user/profile');
  }

  async updateProfile(updates: Partial<Profile>) {
    return this.put('/user/profile', updates);
  }

  async getProfiles(userIds?: string[]): Promise<Profile[]> {
    if (userIds && userIds.length > 0) {
      return this.post('/users/profiles', { user_ids: userIds });
    }
    return this.get('/admin/users');
  }

  async getAllUsers(): Promise<Profile[]> {
    return this.get('/admin/users');
  }

  // Group methods
  async getGroups(): Promise<ChatGroup[]> {
    return this.get('/groups');
  }

  async createGroup(groupData: {
    name: string;
    description?: string;
    group_type: 'class' | 'department' | 'custom';
    organizational_unit?: string;
    chat_type: 'group' | 'individual';
    members?: string[];
  }): Promise<ChatGroup> {
    return this.post('/groups', groupData);
  }

  async getGroupDetails(groupId: string) {
    return this.get(`/groups/${groupId}`);
  }

  async addMemberToGroup(groupId: string, userId: string, role: 'admin' | 'member' = 'member') {
    return this.post(`/groups/${groupId}/members`, {
      user_id: userId,
      role,
    });
  }

  async removeMemberFromGroup(groupId: string, userId: string) {
    return this.delete(`/groups/${groupId}/members/${userId}`);
  }

  // Message methods
  async getMessages(groupId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    return this.get(`/groups/${groupId}/messages?limit=${limit}&offset=${offset}`);
  }

  async sendMessage(content: string, groupId: string): Promise<ChatMessage> {
    return this.post('/messages', { content, group_id: groupId });
  }

  async markMessageAsRead(messageId: string) {
    return this.put(`/messages/${messageId}/read`);
  }

  async getUnreadCount(groupId?: string) {
    const url = groupId ? `/messages/unread?group_id=${groupId}` : '/messages/unread';
    return this.get(url);
  }

}

// Create and export API service instance
export const apiService = new ApiService(axiosInstance);

// Export individual methods for direct import
export const getMessages = (groupId: string, limit = 50, offset = 0): Promise<ChatMessage[]> => 
  apiService.getMessages(groupId, limit, offset);

export const sendMessage = (content: string, groupId: string): Promise<ChatMessage> => 
  apiService.sendMessage(content, groupId);

export const markMessageAsRead = (messageId: string) => 
  apiService.markMessageAsRead(messageId);

export const getGroups = (): Promise<ChatGroup[]> => 
  apiService.getGroups();

export const createGroup = (groupData: {
  name: string;
  description?: string;
  group_type: 'class' | 'department' | 'custom';
  organizational_unit?: string;
  chat_type: 'group' | 'individual';
  members?: string[];
}): Promise<ChatGroup> => 
  apiService.createGroup(groupData);

export const getCurrentUser = (): Promise<Profile> => 
  apiService.getCurrentUser();

export const getProfiles = async (userIds?: string[]): Promise<Profile[]> => {
  if (userIds && userIds.length > 0) {
    return apiService.post('/users/profiles', { user_ids: userIds });
  }
  
  try {
    // Try the admin endpoint first
    return await apiService.get('/admin/users');
  } catch (error) {
    // If admin endpoint fails, try the public endpoint (for development mode)
    console.log("Admin endpoint failed, trying public endpoint");
    return apiService.get('/users');
  }
};

export const getAllUsers = async (): Promise<Profile[]> => {
  return apiService.get('/admin/users');
};

import apiClient from './client';

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  audience: 'all' | 'students' | 'teachers' | 'batch' | 'class';
  batchId?: { _id: string; name: string } | string;
  classId?: { _id: string; name: string } | string;
  attachments?: string[];
  isPinned: boolean;
  isActive: boolean;
  expiresAt?: string | null;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  createdAt: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  content: string;
  audience: 'all' | 'students' | 'teachers' | 'batch' | 'class';
  batchId?: string;
  classId?: string;
  attachments?: string[];
  isPinned?: boolean;
  expiresAt?: string | null;
}

export const announcementApi = {
  // Create an announcement (Admin, Teacher)
  create: async (payload: CreateAnnouncementPayload) => {
    const response = await apiClient.post('/api/announcements', payload);
    return response.data;
  },

  // Get all announcements (Admin view)
  getAll: async (audienceFilter?: string) => {
    const url = audienceFilter 
      ? `/api/announcements?audience=${audienceFilter}` 
      : '/api/announcements';
    const response = await apiClient.get(url);
    return response.data;
  },

  // Get targeted student broadcast feed
  getStudentFeed: async () => {
    const response = await apiClient.get('/api/announcements/student');
    return response.data;
  },

  // Get targeted teacher broadcast feed
  getTeacherFeed: async () => {
    const response = await apiClient.get('/api/announcements/teacher');
    return response.data;
  },

  // Get single item detail safely
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/announcements/${id}`);
    return response.data;
  },

  // Modify active records (Admin, Teacher ownership verification rules apply)
  update: async (id: string, payload: Partial<CreateAnnouncementPayload> & { isActive?: boolean }) => {
    const response = await apiClient.put(`/api/announcements/${id}`, payload);
    return response.data;
  },

  // Flag target items as deleted locally inside operations
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/announcements/${id}`);
    return response.data;
  },
};
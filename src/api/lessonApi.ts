import apiClient from './client';

export interface Lesson {
  _id: string;
  title: string;
  subjectId: any;
  batchId: any;
  teacherId?: any;
  content?: string;
  attachments?: string[];
  scheduledAt: string;
  duration: number; // minutes
  type: 'lecture' | 'lab' | 'tutorial' | 'seminar';
  meetingLink?: string;
  isActive: boolean;
  isDeleted?: boolean;
}

export interface CreateLessonPayload {
  title: string;
  subjectId: string;
  batchId: string;
  content?: string;
  attachments?: string[];
  scheduledAt: string; // ISO standard format required
  duration: number;
  type?: 'lecture' | 'lab' | 'tutorial' | 'seminar';
  meetingLink?: string;
}

export const lessonApi = {
  create: async (payload: CreateLessonPayload) => {
    const response = await apiClient.post('/api/lessons', payload);
    return response.data;
  },
  getAll: async (params?: { batchId?: string; subjectId?: string }) => {
    const response = await apiClient.get('/api/lessons', { params });
    return response.data;
  },
  getMyLessons: async (params?: { subjectId?: string }) => {
    const response = await apiClient.get('/api/lessons/my-lessons', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/lessons/${id}`);
    return response.data;
  },
  update: async (id: string, payload: Partial<CreateLessonPayload> & { isActive?: boolean }) => {
    const response = await apiClient.put(`/api/lessons/${id}`, payload);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/lessons/${id}`);
    return response.data;
  }
};
import apiClient from './client';
import { UserAccount } from './userApi';

export interface TeacherProfile {
  _id: string;
  userId: UserAccount | string;
  qualification: string;
  specialization?: string[];
  experience: number;
  bio?: string;
  subjects?: string[];
  joiningDate: string;
  isActive: boolean;
  isDeleted?: boolean;
}

export interface CreateTeacherProfilePayload {
  userId: string;
  qualification: string;
  specialization?: string[]; // Array formatted payload string references
  experience: number;
  bio?: string;
  subjects?: string[];
  joiningDate: string; // Strictly requires standard YYYY-MM-DD formatting
  isActive?: boolean;
}

export const teacherProfileApi = {
  create: async (payload: CreateTeacherProfilePayload) => {
    const response = await apiClient.post('/api/teachers', payload);
    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get('/api/teachers');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/teachers/${id}`);
    return response.data;
  },

  update: async (id: string, payload: Partial<CreateTeacherProfilePayload>) => {
    const response = await apiClient.put(`/api/teachers/${id}`, payload);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/teachers/${id}`);
    return response.data;
  },

  recover: async (id: string) => {
    const response = await apiClient.patch(`/api/teachers/${id}/recover`);
    return response.data;
  },
};
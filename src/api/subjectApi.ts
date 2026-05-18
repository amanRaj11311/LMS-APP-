import apiClient from './client';

export interface Subject {
  _id: string;
  name: string;
  code: string;
  classId: { _id: string; name: string } | string;
  teacherId: { _id: string; firstName: string; lastName: string; email: string } | string;
  description?: string;
  isActive: boolean;
}

export interface CreateSubjectPayload {
  name: string;
  code: string;
  classId: string;
  teacherId: string;
  description?: string;
}

export const subjectApi = {
  create: async (payload: CreateSubjectPayload) => {
    const response = await apiClient.post('/api/subjects', payload);
    return response.data;
  },

  getAll: async (classId?: string) => {
    const url = classId ? `/api/subjects?classId=${classId}` : '/api/subjects';
    const response = await apiClient.get(url);
    return response.data;
  },

  getMySubjects: async () => {
    const response = await apiClient.get('/api/subjects/my-subjects');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/subjects/${id}`);
    return response.data;
  },

  update: async (id: string, payload: Partial<CreateSubjectPayload> & { isActive?: boolean }) => {
    const response = await apiClient.put(`/api/subjects/${id}`, payload);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/subjects/${id}`);
    return response.data;
  },
};
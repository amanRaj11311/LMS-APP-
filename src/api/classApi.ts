import apiClient from './client';

export interface ClassItem {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  batches?: { _id: string; name: string; startDate: string; isActive: boolean }[];
}

export const classApi = {
  create: async (payload: { name: string; description?: string }) => {
    const response = await apiClient.post('/api/classes', payload);
    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get('/api/classes');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/classes/${id}`);
    return response.data;
  },

  update: async (id: string, payload: { name?: string; description?: string; isActive?: boolean }) => {
    const response = await apiClient.put(`/api/classes/${id}`, { id, ...payload });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/classes/${id}`);
    return response.data;
  },
};
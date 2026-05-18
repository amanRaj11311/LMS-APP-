import apiClient from './client';

export interface UserAccount {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  role: 'student' | 'teacher' | 'admin';
  profilePicture?: string;
  isDeleted?: boolean;
}

export interface CreateUserPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password?: string;
  mobileNumber: string;
  role: 'student' | 'teacher' | 'admin';
  profilePicture?: string;
}

export const userApi = {
  create: async (payload: CreateUserPayload) => {
    const response = await apiClient.post('/api/users', payload);
    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get('/api/users');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/users/${id}`);
    return response.data;
  },

  update: async (payload: Partial<CreateUserPayload> & { id: string }) => {
    const response = await apiClient.put('/api/users', payload);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/users/${id}`);
    return response.data;
  },

  recover: async (id: string) => {
    const response = await apiClient.patch(`/api/users/${id}/recover`);
    return response.data;
  },
};
import axios from 'axios';
import { BASE_URL } from './apiConfig'; // Tumhare project mein jahan BASE_URL hai

// API Client Instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export interface Test {
  _id: string;
  title: string;
  description?: string;
  subjectId: any;
  batchId: any;
  duration?: number;
  isActive: boolean;
  questions: any[];
}

export interface CreateTestPayload {
  title: string;
  description?: string;
  subjectId: string;
  batchId: string;
  duration?: number;
  questions?: any[];
}

export const testApi = {
  // Create a new Test
  create: async (payload: CreateTestPayload) => {
    const response = await apiClient.post('/api/tests', payload);
    return response.data;
  },

  // Bulk Upload Questions via Excel
  bulkUpload: async (formData: FormData) => {
    const response = await apiClient.post('/api/tests/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Get All Tests (Admin sees all, Teacher sees own)
  getAll: async (params?: { subjectId?: string; batchId?: string }) => {
    const response = await apiClient.get('/api/tests', { params });
    return response.data;
  },

  // Get tests for the student
  getMyTests: async () => {
    const response = await apiClient.get('/api/tests/my-tests');
    return response.data;
  },

  // Get a single test by ID
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/tests/${id}`);
    return response.data;
  },

  // Update a test
  update: async (id: string, payload: Partial<CreateTestPayload> & { isActive?: boolean }) => {
    const response = await apiClient.put(`/api/tests/${id}`, payload);
    return response.data;
  },

  // Soft delete a test
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/tests/${id}`);
    return response.data;
  },

  // Recover a soft-deleted test
  recover: async (id: string) => {
    const response = await apiClient.patch(`/api/tests/${id}/recover`);
    return response.data;
  }
};
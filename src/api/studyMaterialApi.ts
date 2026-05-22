import apiClient from './client';

export interface CreateMaterialPayload {
  title: string;
  description?: string;
  subjectId: string;
  batchIds?: string[]; // Array support
  type: 'notes' | 'video' | 'pdf' | 'link' | 'presentation' | 'other';
  fileUrl: string;
  isPublic?: boolean;
  tags?: string[];
}

export const studyMaterialApi = {
  uploadStudyMaterialFiles: async (formData: FormData) => {
    const response = await apiClient.post('/api/upload/study-material', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  create: async (payload: CreateMaterialPayload) => {
    const response = await apiClient.post('/api/study-materials', payload);
    return response.data;
  },
  
  // 🌟 Query Params mein batchIds (array) pass karne ke liye update
  getAll: async (params?: { subjectId?: string; batchIds?: string[]; type?: string }) => {
    const response = await apiClient.get('/api/study-materials', { params });
    return response.data;
  },
  
  getMyMaterials: async (params?: { subjectId?: string; type?: string }) => {
    const response = await apiClient.get('/api/study-materials/my-materials', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/study-materials/${id}`);
    return response.data;
  },

  update: async (id: string, payload: Partial<CreateMaterialPayload> & { isActive?: boolean }) => {
    const response = await apiClient.put(`/api/study-materials/${id}`, payload);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/study-materials/${id}`);
    return response.data;
  }
};
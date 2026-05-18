import apiClient from './client';

export interface StudyMaterial {
  _id: string;
  title: string;
  description?: string;
  subjectId: any;
  batchId?: any;
  uploadedBy?: any;
  type: 'notes' | 'video' | 'pdf' | 'link' | 'presentation' | 'other';
  fileUrl: string;
  fileSize?: number;
  isPublic: boolean;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
}

export interface CreateMaterialPayload {
  title: string;
  description?: string;
  subjectId: string;
  batchId?: string;
  type: 'notes' | 'video' | 'pdf' | 'link' | 'presentation' | 'other';
  fileUrl: string;
  fileSize?: number;
  isPublic?: boolean;
  tags?: string[];
}

export const studyMaterialApi = {
  create: async (payload: CreateMaterialPayload) => {
    const response = await apiClient.post('/api/study-materials', payload);
    return response.data;
  },
  getAll: async (params?: { subjectId?: string; batchId?: string; type?: string }) => {
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
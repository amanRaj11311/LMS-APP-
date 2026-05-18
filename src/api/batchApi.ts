import apiClient from './client';

// ==========================================
// CORE DATA INTERFACES
// ==========================================

export interface Batch {
  _id: string;
  name: string;
  classId: { _id: string; name: string } | string;
  teacherId: { _id: string; firstName: string; lastName: string; email: string } | string;
  subjects?: ({ _id: string; name: string; code?: string } | string)[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdBy?: { _id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface CreateBatchPayload {
  name: string;
  classId: string;
  teacherId: string;
  subjects?: string[]; // Array of strings matching ID formatting expectations
  startDate: string; // strictly expecting standard YYYY-MM-DD input formats
  endDate?: string;
}

// ==========================================
// API CLIENT IMPLEMENTATION
// ==========================================

export const batchApi = {
  // --- ADMIN OPERATION TRANSACTIONS ---
  create: async (payload: CreateBatchPayload) => {
    const response = await apiClient.post('/api/batches', payload);
    return response.data;
  },

  getAll: async (classId?: string) => {
    const url = classId ? `/api/batches?classId=${classId}` : '/api/batches';
    const response = await apiClient.get(url);
    return response.data;
  },

  update: async (id: string, payload: Partial<CreateBatchPayload> & { isActive?: boolean }) => {
    const response = await apiClient.put(`/api/batches/${id}`, payload);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/batches/${id}`);
    return response.data;
  },

  // --- TEACHER / STUDENT DATA QUERIES ---
  getMyBatches: async () => {
    const response = await apiClient.get('/api/batches/my-batches');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/batches/${id}`);
    return response.data;
  },
};
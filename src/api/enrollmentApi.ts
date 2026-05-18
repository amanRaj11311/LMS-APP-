import apiClient from './client';

export interface Enrollment {
  _id: string;
  studentId: any;
  batchId: any;
  classId: any;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  enrollmentDate: string;
}

export const enrollmentApi = {
  enrollStudent: async (payload: { studentId: string; batchId: string; classId: string }) => {
    const response = await apiClient.post('/api/enrollments', payload);
    return response.data;
  },
  getAll: async () => {
    const response = await apiClient.get('/api/enrollments');
    return response.data;
  },
  getMyEnrollments: async () => {
    const response = await apiClient.get('/api/enrollments/me');
    return response.data;
  },
  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/api/enrollments/${id}/status`, { status });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/enrollments/${id}`);
    return response.data;
  }
};
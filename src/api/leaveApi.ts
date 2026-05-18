import apiClient from './client';

export interface LeaveApplication {
  _id: string;
  userId: any;
  type: 'sick' | 'casual' | 'earned' | 'unpaid' | 'other';
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  substituteTeacherId?: any;
  reviewedBy?: any;
  reviewRemarks?: string;
  createdAt?: string;
}

export interface ApplyLeavePayload {
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
  substituteTeacherId?: string;
}

export const leaveApi = {
  apply: async (payload: ApplyLeavePayload) => {
    const response = await apiClient.post('/api/leaves', payload);
    return response.data;
  },
  getAll: async (params?: { status?: string; type?: string }) => {
    const response = await apiClient.get('/api/leaves', { params });
    return response.data;
  },
  getMyLeaves: async (params?: { status?: string }) => {
    const response = await apiClient.get('/api/leaves/me', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/leaves/${id}`);
    return response.data;
  },
  review: async (id: string, payload: { status: string; reviewRemarks?: string }) => {
    const response = await apiClient.patch(`/api/leaves/${id}/review`, payload);
    return response.data;
  },
  cancel: async (id: string) => {
    const response = await apiClient.patch(`/api/leaves/${id}/cancel`);
    return response.data;
  }
};
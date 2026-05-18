import apiClient from './client';

export interface TimetableSlot {
  _id?: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string; // HH:MM format
  endTime: string;
  subjectId: any;
  teacherId: any;
  roomNumber?: string;
}

export interface Timetable {
  _id: string;
  batchId: any;
  classId: any;
  effectiveFrom: string;
  effectiveTo?: string;
  slots: TimetableSlot[];
  isActive: boolean;
  createdBy?: any;
}

export interface CreateTimetablePayload {
  batchId: string;
  classId: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string;
  slots: TimetableSlot[];
}

export const timetableApi = {
  create: async (payload: CreateTimetablePayload) => {
    const response = await apiClient.post('/api/timetables', payload);
    return response.data;
  },
  getByBatch: async (batchId: string) => {
    const response = await apiClient.get(`/api/timetables/batch/${batchId}`);
    return response.data;
  },
  getMyTimetable: async () => {
    const response = await apiClient.get('/api/timetables/me');
    return response.data;
  },
  getMySchedule: async () => {
    const response = await apiClient.get('/api/timetables/my-schedule');
    return response.data;
  },
  update: async (id: string, payload: { slots?: TimetableSlot[]; effectiveTo?: string; isActive?: boolean }) => {
    const response = await apiClient.put(`/api/timetables/${id}`, payload);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/timetables/${id}`);
    return response.data;
  }
};
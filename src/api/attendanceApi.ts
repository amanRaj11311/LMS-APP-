import apiClient from './client';
import { UserAccount } from './userApi';

export interface AttendanceRecord {
  _id: string;
  lessonId: any;
  studentId: any;
  batchId?: any;
  subjectId?: any;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  date?: string;
  markedBy?: any;
}

export interface BulkAttendanceItem {
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late?: number;
  percentage: string;
}

export const attendanceApi = {
  markSingle: async (payload: { lessonId: string; studentId: string; status: string; remarks?: string }) => {
    const response = await apiClient.post('/api/attendance', payload);
    return response.data;
  },
  markBulk: async (lessonId: string, attendanceRecords: BulkAttendanceItem[]) => {
    const response = await apiClient.post('/api/attendance/bulk', { lessonId, attendanceRecords });
    return response.data;
  },
  getByLesson: async (lessonId: string) => {
    const response = await apiClient.get(`/api/attendance/lesson/${lessonId}`);
    return response.data;
  },
  getMyAttendance: async (params?: { batchId?: string; subjectId?: string }) => {
    const response = await apiClient.get('/api/attendance/me', { params });
    return response.data;
  },
  getBatchReport: async (batchId: string, params?: { subjectId?: string; fromDate?: string; toDate?: string }) => {
    const response = await apiClient.get(`/api/attendance/batch/${batchId}`, { params });
    return response.data;
  },
  getStudentAttendance: async (studentId: string, params?: { batchId?: string; subjectId?: string }) => {
    const response = await apiClient.get(`/api/attendance/student/${studentId}`, { params });
    return response.data;
  }
};
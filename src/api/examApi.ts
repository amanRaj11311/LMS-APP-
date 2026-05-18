import apiClient from './client';
import { UserAccount } from './userApi';

export interface Exam {
  _id: string;
  title: string;
  subjectId: any;
  batchId: any;
  createdBy: any;
  type: 'midterm' | 'final' | 'quiz' | 'practical' | 'internal';
  scheduledAt: string;
  duration: number; // minutes
  totalMarks: number;
  passingMarks: number;
  venue?: string;
  instructions?: string;
  isActive: boolean;
  isDeleted?: boolean;
}

export interface CreateExamPayload {
  title: string;
  subjectId: string;
  batchId: string;
  type: 'midterm' | 'final' | 'quiz' | 'practical' | 'internal';
  scheduledAt: string; // ISO standard formatting
  duration: number;
  totalMarks: number;
  passingMarks: number;
  venue?: string;
  instructions?: string;
}

export interface Result {
  _id: string;
  examId: any;
  studentId: any;
  batchId?: any;
  subjectId?: any;
  marksObtained: number;
  grade?: string;
  isPassed: boolean;
  remarks?: string;
  gradedBy?: any;
  gradedAt?: string;
}

export interface CreateResultPayload {
  examId: string;
  studentId: string;
  batchId: string;
  subjectId: string;
  marksObtained: number;
  grade?: string;
  remarks?: string;
}

export interface BulkResultItem {
  studentId: string;
  marksObtained: number;
  grade?: string;
  remarks?: string;
}

export const examApi = {
  // EXAM ENDPOINTS
  create: async (payload: CreateExamPayload) => {
    const response = await apiClient.post('/api/exams', payload);
    return response.data;
  },
  getAll: async (params?: { batchId?: string; subjectId?: string; type?: string }) => {
    const response = await apiClient.get('/api/exams', { params });
    return response.data;
  },
  getMyExams: async () => {
    const response = await apiClient.get('/api/exams/my-exams');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/exams/${id}`);
    return response.data;
  },
  update: async (id: string, payload: Partial<CreateExamPayload> & { isActive?: boolean }) => {
    const response = await apiClient.put(`/api/exams/${id}`, payload);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/exams/${id}`);
    return response.data;
  },

  // RESULT ENDPOINTS
  createResult: async (payload: CreateResultPayload) => {
    const response = await apiClient.post('/api/exams/results', payload);
    return response.data;
  },
  createBulkResults: async (examId: string, results: BulkResultItem[]) => {
    const response = await apiClient.post('/api/exams/results/bulk', { examId, results });
    return response.data;
  },
  getMyResults: async (params?: { batchId?: string; subjectId?: string }) => {
    const response = await apiClient.get('/api/exams/results/me', { params });
    return response.data;
  },
  getResultsByExam: async (examId: string) => {
    const response = await apiClient.get(`/api/exams/${examId}/results`);
    return response.data;
  }
};
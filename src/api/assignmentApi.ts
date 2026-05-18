import apiClient from './client';

// ==========================================
// CORE INTERFACES
// ==========================================

export interface Assignment {
  _id: string;
  title: string;
  description: string;
  subjectId: { _id: string; name: string; code?: string } | string;
  batchId: { _id: string; name: string } | string;
  dueDate: string;
  totalMarks: number;
  attachments?: string[];
  isActive: boolean;
  createdBy?: { _id: string; firstName: string; lastName: string };
  mySubmission?: {
    assignmentId: string;
    status: 'submitted' | 'late' | 'graded';
    marksObtained?: number;
  } | null;
}

export interface Submission {
  _id: string;
  assignmentId: Assignment | string;
  studentId: { _id: string; firstName: string; lastName: string; email: string };
  batchId: string;
  content?: string;
  attachments?: string[];
  status: 'submitted' | 'late' | 'graded';
  marksObtained?: number;
  feedback?: string;
  submittedAt: string;
}

export interface CreateAssignmentPayload {
  title: string;
  description: string;
  subjectId: string;
  batchId: string;
  dueDate: string; // ISO string format strictly required
  totalMarks: number;
  attachments?: string[];
}

// ==========================================
// API SERVICE CLIENTS
// ==========================================

export const assignmentApi = {
  // --- ASSIGNMENT ENDPOINTS ---
  create: async (payload: CreateAssignmentPayload) => {
    const response = await apiClient.post('/api/assignments', payload);
    return response.data;
  },

  getAll: async (params?: { batchId?: string; subjectId?: string }) => {
    const response = await apiClient.get('/api/assignments', { params });
    return response.data;
  },

  getMyAssignments: async () => {
    const response = await apiClient.get('/api/assignments/my-assignments');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/assignments/${id}`);
    return response.data;
  },

  update: async (id: string, payload: Partial<CreateAssignmentPayload> & { isActive?: boolean }) => {
    const response = await apiClient.put(`/api/assignments/${id}`, payload);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/assignments/${id}`);
    return response.data;
  },

  // --- SUBMISSION ENDPOINTS ---
  submitAssignment: async (payload: { assignmentId: string; content?: string; attachments?: string[] }) => {
    const response = await apiClient.post('/api/assignments/submissions', payload);
    return response.data;
  },

  getMySubmissions: async () => {
    const response = await apiClient.get('/api/assignments/submissions/me');
    return response.data;
  },

  getSubmissionsForAssignment: async (assignmentId: string) => {
    const response = await apiClient.get(`/api/assignments/${assignmentId}/submissions`);
    return response.data;
  },

  gradeSubmission: async (submissionId: string, payload: { marksObtained: number; feedback?: string }) => {
    const response = await apiClient.patch(`/api/assignments/submissions/${submissionId}/grade`, payload);
    return response.data;
  },
};
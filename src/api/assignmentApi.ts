import apiClient from './client';

export interface CreateAssignmentPayload {
  title: string;
  description: string;
  subjectId: string;
  batchId: string;
  dueDate: string;
  totalMarks: number;
  attachments?: string[];
}

export const assignmentApi = {
  create: async (payload: CreateAssignmentPayload) => {
    const response = await apiClient.post('/api/assignments', payload);
    return response.data;
  },
  update: async (id: string, payload: Partial<CreateAssignmentPayload> & { isActive?: boolean }) => {
    const response = await apiClient.put(`/api/assignments/${id}`, payload);
    return response.data;
  },
  getAll: async () => {
    const response = await apiClient.get('/api/assignments');
    return response.data;
  },
  getMyAssignments: async () => {
    const response = await apiClient.get('/api/assignments/my-assignments');
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/assignments/${id}`);
    return response.data;
  },
  
  // 🌟 Student Submission Endpoints
  submitAssignment: async (payload: { assignmentId: string; content?: string; attachments?: string[] }) => {
    const response = await apiClient.post('/api/assignments/submissions', payload); // Updated exactly as per Swagger
    return response.data;
  },
  uploadAssignmentFiles: async (formData: FormData) => {
    const response = await apiClient.post('/api/upload/assignment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  uploadSubmissionFiles: async (formData: FormData) => {
    const response = await apiClient.post('/api/upload/submission', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // 🌟 NEW: Teacher/Admin Grading Endpoints
  getSubmissionsByAssignment: async (assignmentId: string) => {
    const response = await apiClient.get(`/api/assignments/${assignmentId}/submissions`);
    return response.data;
  },
  gradeSubmission: async (submissionId: string, payload: { marksObtained: number; feedback?: string }) => {
    const response = await apiClient.patch(`/api/assignments/submissions/${submissionId}/grade`, payload);
    return response.data;
  }
};
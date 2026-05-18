import apiClient from './client';

export interface AcademicYear {
  _id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isActive: boolean;
  createdBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export const academicYearApi = {
  create: async (data: { label: string; startDate: string; endDate: string; isCurrent?: boolean }) => {
    const response = await apiClient.post('/api/academic-years', data);
    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get('/api/academic-years');
    return response.data;
  },

  // PUT request mapping matching backend update controller expectations
  update: async (id: string, data: Partial<AcademicYear>) => {
    // Note: Controller accepts id as a body param or URL param. Using URL to match REST Swagger spec.
    const response = await apiClient.put(`/api/academic-years/${id}`, {
      id, // Send explicit ID inside body alongside payload if controller logic enforces it
      ...data
    });
    return response.data;
  },

  // DELETE request triggering soft delete flag
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/academic-years/${id}`);
    return response.data;
  },
};
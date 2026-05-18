import apiClient from './client';

export const profileApi = {
  uploadProfilePicture: async (formData: FormData) => {
    // 🌟 FIX: Removed explicit Content-Type so Axios auto-generates the multipart boundary
    const response = await apiClient.post('/api/upload/profile-picture', formData);
    return response.data;
  },
  
  updateProfile: async (id: string, payload: { firstName: string; lastName: string }) => {
 
    const response = await apiClient.put(`/api/users/${id}`, payload);
    return response.data;
  },

  changePassword: async (payload: { oldPassword: string; newPassword: string }) => {
   
    const response = await apiClient.put('/api/users/${id}', payload);
    return response.data;
  }
};
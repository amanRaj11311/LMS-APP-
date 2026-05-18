import apiClient from './client';
import { UserAccount } from './userApi';

export interface AddressPayload {
  line1: string;
  city: string;
  state: string;
  pincode: string;
}

export interface GuardianPayload {
  name: string;
  relation: string;
  mobileNumber: string;
  email?: string;
}

export interface StudentDocument {
  _id: string;
  type: string;
  label?: string;
  fileUrl: string;
  isVerified: boolean;
  verifiedBy?: any;
}

export interface StudentProfile {
  _id: string;
  userId: UserAccount | string;
  admissionNumber: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  category?: 'general' | 'obc' | 'sc' | 'st' | 'ews' | 'other';
  religion?: string;
  aadharNumber?: string;
  nationality?: string;
  motherTongue?: string;
  currentAddress?: AddressPayload;
  permanentAddress?: AddressPayload;
  isSameAddress?: boolean;
  guardian?: GuardianPayload;
  documents?: StudentDocument[];
  isActive: boolean;
  isDeleted?: boolean;
}

export interface CreateStudentProfilePayload {
  userId: string;
  admissionNumber: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';

  category?: string;
  religion?: string;
  aadharNumber?: string;
  nationality?: string;
  motherTongue?: string;

  currentAddress: AddressPayload;
  permanentAddress: AddressPayload;

  isSameAddress?: boolean;

  guardian: GuardianPayload;

  previousSchool: PreviousSchoolPayload;

  healthInfo: HealthInfoPayload;

  isActive?: boolean;
}
export interface PreviousSchoolPayload {
  name: string;
  board?: string;
  percentage?: number;
  passingYear?: number;
}

export interface HealthInfoPayload {
  bloodGroup?: string;
  allergies?: string;
  emergencyContactName: string;
  emergencyContact: string;
}

export interface StudentProfile {
  _id: string;
  userId: UserAccount | string;
  admissionNumber: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';

  category?: 'general' | 'obc' | 'sc' | 'st' | 'ews' | 'other';
  religion?: string;
  aadharNumber?: string;
  nationality?: string;
  motherTongue?: string;

  currentAddress?: AddressPayload;
  permanentAddress?: AddressPayload;
  isSameAddress?: boolean;

  guardian?: GuardianPayload;

  previousSchool?: PreviousSchoolPayload;
  healthInfo?: HealthInfoPayload;

  documents?: StudentDocument[];

  isActive: boolean;
  isDeleted?: boolean;
}
export interface HealthInfoPayload {
  bloodGroup?: string;
  allergies?: string;
  emergencyContactName: string;
  emergencyContact: string;
}
// Confirm your API module maps updates targeting base ID strings directly:
export const studentProfileApi = {
  create: async (payload: any) => {
    const response = await apiClient.post('/api/students/profile', payload);
    return response.data;
  },
  getAll: async (params?: any) => {
    const response = await apiClient.get('/api/students/profile', { params });
    return response.data;
  },
  getMyProfile: async () => {
    const response = await apiClient.get('/api/students/profile/me');
    return response.data;
  },
  update: async (id: string, payload: any) => {
    // Explicit API endpoint mapping unboxing specific profile document update actions
    const response = await apiClient.put(`/api/students/profile/${id}`, payload);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/students/profile/${id}`);
    return response.data;
  }
};
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './apiConfig';

// Secure storage key (Only storing the Access Token now)
const ACCESS_TOKEN_KEY = '@lms_access_token';

// 1. Create the base Axios client
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true, // <-- Forces Axios to attach session cookies securely
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Variables to manage concurrent requests during a token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

// Helper to process any requests that paused while waiting for the new token
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 2. REQUEST INTERCEPTOR: Automatically attach the Access Token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. RESPONSE INTERCEPTOR: Catch 401s and trigger the Cookie-based Refresh flow
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if the error is a 401 Unauthorized and we haven't retried this request yet
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      
      // CRITICAL: If the refresh request ITSELF fails, log the user out entirely
      if (originalRequest.url?.includes('/api/auth/refresh')) {
        await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
        return Promise.reject(error);
      }

      // If another request is already refreshing the token, pause and wait in line
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Lock the queue and start refreshing
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Hit the refresh endpoint WITHOUT sending a JSON body. 
        // Axios automatically attaches the secure HttpOnly Cookie via withCredentials.
        const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, {
          withCredentials: true 
        });

        const newAccessToken = response.data.accessToken;

        if (newAccessToken) {
          // Save the fresh access token locally
          await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);

          // Update the failed request header with the new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          // Release the queue and process any waiting requests
          processQueue(null, newAccessToken);

          // Retry the original request that failed
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Wipe local token if the cookie is expired/dead (forcing user to log in again)
        await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// 4. AUTH HELPERS: Call these from your Login and Logout screens
export const authStorage = {
  // We only pass the accessToken now. The browser/native cookie jar handles the refresh token.
  setTokens: async (accessToken: string) => {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },
  
  clearTokens: async () => {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  },
};
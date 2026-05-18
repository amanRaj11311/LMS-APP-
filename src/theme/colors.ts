export interface ThemeColors {
  mode: 'light' | 'dark';
  primary: string;
  background: string;
  surface: string;
  text: string;
  subText: string;
  appBar: string;
  border: string;
}

export const lightTheme: ThemeColors = {
  mode: 'light',
  primary: '#0288D1',       // LMS Light Blue
  background: '#F5F9FF',    // Soft blue-white tint
  surface: '#FFFFFF',
  text: '#1A1A1A',
  subText: '#666666',
  appBar: '#0288D1',        // Solid blue header
  border: '#E0E0E0',
};

export const darkTheme: ThemeColors = {
  mode: 'dark',
  primary: '#4FC3F7',       // Vibrant sky blue for dark mode visibility
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  subText: '#AAAAAA',
  appBar: '#1E1E1E',        // Dark surface header
  border: '#333333',
};
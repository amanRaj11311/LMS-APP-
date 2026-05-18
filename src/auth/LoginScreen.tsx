import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added Native Storage Import

import { useTheme } from '../theme/ThemeContext';
import apiClient, { authStorage } from '../api/client';
import { RootStackParamList } from '../navigation/AppNavigator';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      console.log('Sending Payload:', JSON.stringify({ email: cleanEmail, password: cleanPassword }));

      const response = await apiClient.post('/api/auth/login', {
        email: cleanEmail,
        password: cleanPassword,
      });

      // 🔍 TRACE CORRECTION: Unboxing payload correctly matching target Swagger definitions
      // response.data contains: { success: true, message: "...", data: { ...userObj }, accessToken: "..." }
      const { accessToken, refreshToken, data: userDataObject } = response.data;

      if (accessToken) {
        // 1. Save standard secure execution strings
        await authStorage.setTokens(accessToken, refreshToken);
        
        // 2. 🔐 CRITICAL MISSING LINK: Write absolute database context array straight onto layout persistent disk
        if (userDataObject) {
          await AsyncStorage.setItem('user_data', JSON.stringify(userDataObject));
          // Optional safety layer caching base credentials explicitly
          await AsyncStorage.setItem('user_role', userDataObject.role || 'user');
        }

        navigation.replace('MainTabs');
      } else {
        setErrorMessage('Invalid response from server.');
      }
    } catch (error: any) {
      console.log('Axios Error Message:', error.message);
      
      if (error.request && !error.response) {
        console.log('Request left device, but no response received:', error.request);
        setErrorMessage('Network error. Please check your internet connection.');
        return;
      }

      const serverError = error.response?.data?.message || 'Invalid credentials. Please try again.';
      setErrorMessage(serverError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.formContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.subText }]}>
            Sign in to access your learning portal
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Text style={[styles.inputLabel, { color: theme.text }]}>Email</Text>
          <TextInput
            style={[
              styles.input, 
              { 
                backgroundColor: theme.surface, 
                color: theme.text,
                borderColor: theme.border 
              }
            ]}
            placeholder="student@domain.com"
            placeholderTextColor={theme.subText}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <Text style={[styles.inputLabel, { color: theme.text }]}>Password</Text>
          <TextInput
            style={[
              styles.input, 
              { 
                backgroundColor: theme.surface, 
                color: theme.text,
                borderColor: theme.border 
              }
            ]}
            placeholder="••••••••"
            placeholderTextColor={theme.subText}
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={() => Alert.alert('Notice', 'Contact your LMS administrator to reset your password.')}
          >
            <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  formContainer: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 32 },
  errorBox: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#FFCDD2' },
  errorText: { color: '#C62828', fontSize: 15, textAlign: 'center' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, fontSize: 16, marginBottom: 20 },
  forgotPasswordContainer: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { fontSize: 14, fontWeight: '600' },
  loginButton: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  loginButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
});

export default LoginScreen;
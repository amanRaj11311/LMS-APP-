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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';



import { useTheme } from '../theme/ThemeContext';

import apiClient, { authStorage } from '../api/client';

import { RootStackParamList } from '../navigation/AppNavigator';
type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;
interface LoginScreenProps { navigation: LoginScreenNavigationProp; }

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false); // 🌟 Added toggle

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await apiClient.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      const { accessToken, data: userDataObject } = response.data;
      if (accessToken) {
        await authStorage.setTokens(accessToken);
        if (userDataObject) {
          await AsyncStorage.setItem('user_data', JSON.stringify(userDataObject));
          await AsyncStorage.setItem('user_role', userDataObject.role || 'user');
        }
        navigation.replace('MainTabs');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        
        {/* 🌟 Professional Card Container */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.subText }]}>Login to continue your learning</Text>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {/* Email Input */}
          <Text style={[styles.inputLabel, { color: theme.text }]}>Email</Text>
          <View style={[styles.inputContainer, { borderColor: theme.border }]}>
             <MaterialIcons name="email" size={20} color={theme.subText} style={{marginRight: 10}} />
             <TextInput 
                style={[styles.input, { color: theme.text }]} 
                placeholder="student@example.com" 
                placeholderTextColor={theme.subText} 
                keyboardType="email-address" 
                value={email} 
                onChangeText={setEmail}
             />
          </View>

          {/* Password Input */}
          <Text style={[styles.inputLabel, { color: theme.text }]}>Password</Text>
          <View style={[styles.inputContainer, { borderColor: theme.border }]}>
             <MaterialIcons name="lock" size={20} color={theme.subText} style={{marginRight: 10}} />
             <TextInput 
                style={[styles.input, { color: theme.text }]} 
                placeholder="••••••••" 
                placeholderTextColor={theme.subText} 
                secureTextEntry={!showPassword} 
                value={password} 
                onChangeText={setPassword}
             />
             <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color={theme.subText} />
             </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Login</Text>}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { padding: 24, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 14, marginBottom: 25 },
  errorText: { color: '#EF4444', textAlign: 'center', marginBottom: 15, fontSize: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 50, marginBottom: 20 },
  input: { flex: 1, fontSize: 15 },
  loginButton: { height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2563EB' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 17 }
});

export default LoginScreen;
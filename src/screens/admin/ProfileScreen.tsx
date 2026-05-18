import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';

import { useTheme } from '../../theme/ThemeContext';
import { profileApi } from '../../api/profileApi';

import { BASE_URL} from '../../api/apiConfig';

const ProfileScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();

  const [userId, setUserId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [initials, setInitials] = useState('U');

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadUserProfile = async () => {
        setIsLoading(true);
        try {
          const storedString = await AsyncStorage.getItem("user_data");
          if (storedString && isMounted) {
            const userObj = JSON.parse(storedString);
            
            const first = (userObj.firstName || '').trim();
            const last = (userObj.lastName || '').trim();
            
            let extractedInitials = "U";
            if (first && last) extractedInitials = `${first[0]}${last[0]}`.toUpperCase();
            else if (first) extractedInitials = `${first[0]}${first[first.length - 1]}`.toUpperCase();

            let avatarUrl = userObj.profileImage || userObj.profilePicture || null;
            if (avatarUrl && !avatarUrl.startsWith('http')) {
              const cleanPath = avatarUrl.startsWith('/') ? avatarUrl.substring(1) : avatarUrl;
              avatarUrl = `${BASE_URL}/${cleanPath}`;
            }

            let roleString = userObj.role || 'USER';
            if (typeof roleString === 'object') roleString = roleString.name || 'USER';

            setUserId(userObj._id || '');
            setFirstName(first);
            setLastName(last);
            setEmail(userObj.email || 'No Email Mapped');
            setRole(roleString.toUpperCase());
            setProfileImage(avatarUrl);
            setInitials(extractedInitials);
          }
        } catch (error) {
          console.warn("Profile Read Exception:", error);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      loadUserProfile();
      return () => { isMounted = false; };
    }, [])
  );

  const handleSelectAndUploadImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        selectionLimit: 1,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) return; 

      const selectedAsset = result.assets[0];

      const formData = new FormData();
      const fileData = {
        uri: Platform.OS === 'ios' ? selectedAsset.uri?.replace('file://', '') : selectedAsset.uri,
        type: selectedAsset.type || 'image/jpeg',
        name: selectedAsset.fileName || `profile_${Date.now()}.jpg`,
      };

      formData.append('file', fileData as any);
      formData.append('profilePicture', fileData as any);

      setIsUploading(true);
      const uploadRes = await profileApi.uploadProfilePicture(formData);

      if (uploadRes?.success) {
        const newFileUrl = uploadRes.data?.fileUrl || uploadRes.fileUrl || uploadRes.data?.url; 
        
        let formattedUrl = newFileUrl;
        if (formattedUrl && !formattedUrl.startsWith('http')) {
           const cleanPath = formattedUrl.startsWith('/') ? formattedUrl.substring(1) : formattedUrl;
           formattedUrl = `${BASE_URL}/${cleanPath}`;
        }

        setProfileImage(formattedUrl);

        const storedString = await AsyncStorage.getItem("user_data");
        if (storedString) {
          const userObj = JSON.parse(storedString);
          userObj.profileImage = newFileUrl; 
          userObj.profilePicture = newFileUrl; 
          await AsyncStorage.setItem("user_data", JSON.stringify(userObj));
        }
        Alert.alert('Success', 'Profile picture updated securely.');
      } else {
        Alert.alert('Upload Failed', uploadRes?.message || 'Server refused file payload.');
      }
    } catch (error: any) {
      const status = error.response?.status;
      Alert.alert(`Upload Error ${status || ''}`, `Failed to upload image. Verify /api/upload/profile-picture endpoint.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfileDetails = async () => {
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

    if (!cleanFirst || !cleanLast) {
      Alert.alert('Validation Error', 'First and Last names cannot be empty.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await profileApi.updateProfile(userId, { firstName: cleanFirst, lastName: cleanLast });
      
      if (res?.success) {
        Alert.alert('Success', 'Your identity details have been saved.');
        
        const storedString = await AsyncStorage.getItem("user_data");
        if (storedString) {
          const userObj = JSON.parse(storedString);
          userObj.firstName = cleanFirst;
          userObj.lastName = cleanLast;
          await AsyncStorage.setItem("user_data", JSON.stringify(userObj));
          setInitials(`${cleanFirst[0]}${cleanLast[0]}`.toUpperCase());
        }
      } else {
        Alert.alert('Update Refused', res?.message || 'Server rejected name modification.');
      }
    } catch (error: any) {
      const status = error.response?.status;
      Alert.alert(`HTTP Error ${status || ''}`, `Failed to update name.`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    const cleanOld = oldPassword.trim();
    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanOld || !cleanNew || !cleanConfirm) {
      Alert.alert('Validation', 'Ensure all security fields are filled.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      Alert.alert('Mismatch', 'The new password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await profileApi.changePassword({ oldPassword: cleanOld, newPassword: cleanNew });
      
      if (res?.success) {
        Alert.alert('Security Updated', 'Your access password has been changed successfully.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        Keyboard.dismiss();
      } else {
        Alert.alert('Update Refused', res?.message || 'Incorrect old password or server rejection.');
      }
    } catch (error: any) {
      const status = error.response?.status;
      Alert.alert(`Auth Error ${status || ''}`, `Ensure PUT /api/auth/change-password matches Swagger exactly.`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    // 🌟 Reverted edges to just ['bottom'] so the GlobalHeader shows perfectly above it
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.avatarSection}>
            <View style={[styles.avatarRing, { borderColor: theme.primary }]}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarInitials, { color: theme.primary }]}>{initials}</Text>
              )}
              
              <TouchableOpacity 
                style={[styles.uploadBadge, { backgroundColor: theme.primary }]}
                onPress={handleSelectAndUploadImage}
                disabled={isUploading}
              >
                {isUploading ? (
                   <ActivityIndicator size="small" color="#FFF" />
                ) : (
                   <MaterialIcons name="photo-camera" size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.fullName, { color: theme.text }]}>{firstName} {lastName}</Text>
            <View style={[styles.roleBadge, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.roleText, { color: theme.primary }]}>{role}</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Identity Parameters</Text>
          </View>
          
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.subText, marginTop: 0 }]}>First Name</Text>
            <TextInput 
              style={[styles.inputField, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              value={firstName}
              onChangeText={setFirstName}
            />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>Last Name</Text>
            <TextInput 
              style={[styles.inputField, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              value={lastName}
              onChangeText={setLastName}
            />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>Registered Email (Locked)</Text>
            <TextInput 
              style={[styles.inputField, { backgroundColor: theme.background, borderColor: theme.border, color: theme.subText, opacity: 0.7 }]}
              value={email}
              editable={false}
            />

            <TouchableOpacity 
              style={[styles.updateButton, { backgroundColor: theme.primary }]}
              onPress={handleUpdateProfileDetails}
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.updateButtonText}>Update Profile Details</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Security Configuration</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 20 }]}>
            <Text style={[styles.inputLabel, { color: theme.subText, marginTop: 0 }]}>Current Password</Text>
            <TextInput 
              style={[styles.inputField, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Enter current password"
              placeholderTextColor={theme.subText}
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>New Secured Key</Text>
            <TextInput 
              style={[styles.inputField, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Minimum 6 characters"
              placeholderTextColor={theme.subText}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>Verify Secured Key</Text>
            <TextInput 
              style={[styles.inputField, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Re-enter new password"
              placeholderTextColor={theme.subText}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity 
              style={[styles.updateButton, { backgroundColor: '#EF4444' }]}
              onPress={handlePasswordChange}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.updateButtonText}>Update Access Keys</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarSection: { alignItems: 'center', marginVertical: 20 },
  avatarRing: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  avatarImage: { width: 104, height: 104, borderRadius: 52 },
  avatarInitials: { fontSize: 40, fontWeight: 'bold' },
  uploadBadge: { position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 4 },
  fullName: { fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  roleBadge: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: { marginBottom: 10, paddingLeft: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 16, elevation: 1 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  inputField: { height: 48, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
  updateButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  updateButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});

export default ProfileScreen;
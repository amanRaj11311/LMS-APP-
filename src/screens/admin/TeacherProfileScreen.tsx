import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
  ActivityIndicator, Alert, Keyboard, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker'; // Native Dropdown Implementation

// Core Theme & Service Wrappers
import { useTheme } from '../../theme/ThemeContext';
import { teacherProfileApi, TeacherProfile, CreateTeacherProfilePayload } from '../../api/teacherProfileApi';
import { userApi, UserAccount } from '../../api/userApi';

const TeacherProfileScreen = () => {
  const { theme } = useTheme();

  // ==========================================
  // DATA MANAGEMENT STATES
  // ==========================================
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<UserAccount[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ==========================================
  // METADATA FORM CONTROL STATES
  // ==========================================
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [qualification, setQualification] = useState<string>('');
  const [experienceText, setExperienceText] = useState<string>('');
  const [joiningDateText, setJoiningDateText] = useState<string>('2026-05-12');
  const [specializationText, setSpecializationText] = useState<string>('');
  const [subjectsText, setSubjectsText] = useState<string>('');
  const [bio, setBio] = useState<string>('');

  // Primary boot pipeline trigger
  useEffect(() => {
    fetchScreenDependencies();
  }, []);

  // Fetch core metadata registries alongside base account tables
  const fetchScreenDependencies = async () => {
    setIsLoading(true);
    try {
      const [profilesRes, usersRes] = await Promise.all([
        teacherProfileApi.getAll(),
        userApi.getAll(),
      ]);

      if (profilesRes?.success) setProfiles(profilesRes.data);
      
      if (usersRes?.success) {
        // Filter input parameters mapping only core accounts flagged as instructors
        const teacherUsers = usersRes.data.filter((u: UserAccount) => u.role === 'teacher');
        setAvailableTeachers(teacherUsers);
      }
    } catch (error: any) {
      Alert.alert('Network Sync Error', 'Profiles database read failure.');
    } finally {
      setIsLoading(false);
    }
  };

  // Pull-to-refresh execution routines
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      const profilesRes = await teacherProfileApi.getAll();
      if (profilesRes?.success) setProfiles(profilesRes.data);

      // Cleanly update dynamic dropdown pickers in the background
      const usersRes = await userApi.getAll();
      if (usersRes?.success) {
        const teacherUsers = usersRes.data.filter((u: UserAccount) => u.role === 'teacher');
        setAvailableTeachers(teacherUsers);
      }
    } catch (error: any) {
      Alert.alert('Refresh Terminated', 'Unable to sync profiles.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Form purification clearing memory structures
  const resetFormState = () => {
    setEditingId(null);
    setSelectedUserId('');
    setQualification('');
    setExperienceText('');
    setJoiningDateText('2026-05-12');
    setSpecializationText('');
    setSubjectsText('');
    setBio('');
    Keyboard.dismiss();
  };

  // Target values mapped safely back into active form elements
  const handleTriggerEdit = (item: TeacherProfile) => {
    setEditingId(item._id);
    setSelectedUserId(typeof item.userId === 'object' ? item.userId._id : item.userId);
    setQualification(item.qualification);
    setExperienceText(item.experience.toString());
    setJoiningDateText(item.joiningDate.split('T')[0]);
    setSpecializationText(item.specialization ? item.specialization.join(', ') : '');
    setSubjectsText(item.subjects ? item.subjects.join(', ') : '');
    setBio(item.bio || '');
  };

  // Validate formatting structures and persist storage calls
  const handleSaveOrUpdate = async () => {
    const cleanQual = qualification.trim();
    const parsedExp = parseInt(experienceText.trim(), 10);
    const cleanJoin = joiningDateText.trim();

    if (!selectedUserId || !cleanQual || isNaN(parsedExp) || !cleanJoin) {
      Alert.alert('Input Validation', 'Base User Account, Qualification, Experience, aur Joining Date strictly required hain.');
      return;
    }

    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(cleanJoin)) {
      Alert.alert('Format Error', 'Joining date parameter ko strictly YYYY-MM-DD format mein likhein.');
      return;
    }

    const specArray = specializationText.trim() ? specializationText.split(',').map(s => s.trim()).filter(s => s.length > 0) : undefined;
    const subjArray = subjectsText.trim() ? subjectsText.split(',').map(s => s.trim()).filter(s => s.length > 0) : undefined;

    setIsSubmitting(true);

    const payload: CreateTeacherProfilePayload = {
      userId: selectedUserId,
      qualification: cleanQual,
      experience: parsedExp,
      joiningDate: cleanJoin,
      ...(specArray ? { specialization: specArray } : {}),
      ...(subjArray ? { subjects: subjArray } : {}),
      ...(bio.trim() ? { bio: bio.trim() } : {})
    };

    try {
      let response;
      if (editingId) {
        response = await teacherProfileApi.update(editingId, payload);
      } else {
        response = await teacherProfileApi.create(payload);
      }

      if (response.success) {
        Alert.alert('Transaction Complete', response.message || 'Teacher profile successfully linked.');
        resetFormState();
        fetchScreenDependencies();
      } else {
        Alert.alert('Transaction Dropped', response.message || 'Storage write blocked.');
      }
    } catch (error: any) {
      Alert.alert('Execution Dropped', 'Database payload connection failure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute database soft delete routines
  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to unlink this target teacher profile from active records?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await teacherProfileApi.delete(id);
              if (response.success) {
                if (editingId === id) resetFormState();
                fetchScreenDependencies();
              } else {
                Alert.alert('Wipe Interrupted', response.message);
              }
            } catch (error: any) {
              Alert.alert('Wipe Interrupted', 'Transaction blocked.');
            }
          }
        }
      ]
    );
  };

  // Card items mapped inside flatlist frameworks
  const renderProfileCard = ({ item }: { item: TeacherProfile }) => {
    let displayHeader = item.qualification;
    let emailString = 'Unmapped ID reference';

    if (typeof item.userId === 'object') {
      const uRef = item.userId;
      displayHeader = `${uRef.firstName} ${uRef.lastName}`;
      emailString = uRef.email;
    }

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{displayHeader}</Text>
          <Text style={[styles.infoText, { color: theme.primary, fontWeight: 'bold' }]}>{item.experience} yr(s) exp</Text>
        </View>

        <Text style={[styles.infoText, { color: theme.subText, marginBottom: 4 }]}>{emailString}</Text>
        <Text style={[styles.infoText, { color: theme.text, marginBottom: 2 }]}>Qualification: {item.qualification}</Text>

        {item.subjects && item.subjects.length > 0 && (
          <Text style={[styles.infoText, { color: theme.subText }]} numberOfLines={1}>
            Subjects: {item.subjects.join(', ')}
          </Text>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={styles.actionButton}>
            <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionButton}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      
      {/* 1. DATA CONFIGURATION MODULE */}
      <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.formHeaderRow}>
          <Text style={[styles.formTitle, { color: theme.text }]}>
            {editingId ? 'Modify Metadata Setup' : 'Teacher Data'}
          </Text>
          {editingId && (
            <TouchableOpacity onPress={resetFormState}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* NATIVE USER ACCOUNT SELECTOR DROPDOWN */}
        <View style={styles.pickerContainer}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>Select Teacher</Text>
          <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Picker
              selectedValue={selectedUserId}
              onValueChange={(itemValue) => setSelectedUserId(itemValue)}
              dropdownIconColor={theme.primary}
              style={{ color: theme.text }}
            >
              <Picker.Item label="-- Select Teacher Account --" value="" color={theme.subText} />
              {availableTeachers.map((tUser) => (
                <Picker.Item 
                  key={tUser._id} 
                  label={`${tUser.firstName} ${tUser.lastName} (${tUser.email})`} 
                  value={tUser._id} 
                />
              ))}
            </Picker>
          </View>
        </View>

        <Text style={[styles.inputLabel, { color: theme.text }]}>Academic Qualification</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="e.g. M.Sc Mathematics"
          placeholderTextColor={theme.subText}
          value={qualification}
          onChangeText={setQualification}
        />

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Years Experience</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="5"
              placeholderTextColor={theme.subText}
              value={experienceText}
              onChangeText={setExperienceText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Joined (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="2026-05-12"
              placeholderTextColor={theme.subText}
              value={joiningDateText}
              onChangeText={setJoiningDateText}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>
        </View>

        <Text style={[styles.inputLabel, { color: theme.text }]}>Specializations </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Calculus, Geometry"
          placeholderTextColor={theme.subText}
          value={specializationText}
          onChangeText={setSpecializationText}
        />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Assigned Subjects </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Math, Advanced Physics"
          placeholderTextColor={theme.subText}
          value={subjectsText}
          onChangeText={setSubjectsText}
        />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Biography Overview</Text>
        <TextInput
          style={[styles.input, { height: 60, backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Biography string parameter"
          placeholderTextColor={theme.subText}
          value={bio}
          onChangeText={setBio}
          multiline
        />

        <TouchableOpacity
          style={[styles.mainButton, { backgroundColor: theme.primary }]}
          onPress={handleSaveOrUpdate}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>{editingId ? 'Update System Target' : 'Submit'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. FLATLIST REGISTRY FEED */}
      <Text style={[styles.listHeader, { color: theme.text }]}>Mapped Profiles Registry</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item._id}
          renderItem={renderProfileCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handlePullToRefresh} 
              colors={[theme.primary]} 
              tintColor={theme.primary} 
            />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.subText }]}>No mapped profile record arrays configured inside storage.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  formCard: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { color: '#D32F2F', fontWeight: '600', fontSize: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  
  // Clean picker alignment layout properties
  pickerContainer: { marginBottom: 12 },
  pickerWrapper: { height: 46, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },

  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  listHeader: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  infoText: { fontSize: 13 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 10, marginTop: 8 },
  actionButton: { marginLeft: 16, paddingVertical: 4 },
  editText: { fontWeight: 'bold', fontSize: 14 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 14 },
});

export default TeacherProfileScreen;
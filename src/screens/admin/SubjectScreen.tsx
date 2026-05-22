import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Switch, 
  Keyboard, 
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker'; // Native Dropdown Import

// Theme & API Contexts
import { useTheme } from '../../theme/ThemeContext';
import { subjectApi, Subject, CreateSubjectPayload } from '../../api/subjectApi';
import { classApi, ClassItem } from '../../api/classApi';
import { teacherProfileApi, TeacherProfile } from '../../api/teacherProfileApi';

// Is variable ko apne global runtime Auth/Redux store se connect karein
const ACTIVE_USER_ROLE: 'admin' | 'teacher' | 'student' = 'admin';

const SubjectScreen = () => {
  const { theme } = useTheme();

  // ==========================================
  // 1. DATA & LOADING STATES
  // ==========================================
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<TeacherProfile[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ==========================================
  // 2. FORM INPUT STATES
  // ==========================================
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Initial Boot Lifecycle
  useEffect(() => {
    fetchCoreData();
  }, []);

  // Backend se Subjects, Classes aur Teachers ek saath fetch karein
  const fetchCoreData = async () => {
    setIsLoading(true);
    try {
      // Parallel API calls for performance optimization
      const [subjectRes, classRes, teacherRes] = await Promise.all([
        ACTIVE_USER_ROLE === 'teacher' ? subjectApi.getMySubjects() : subjectApi.getAll(),
        classApi.getAll(),
        teacherProfileApi.getAll(),
      ]);


      if (subjectRes?.success) setSubjects(subjectRes.data);
      if (classRes?.success) setAvailableClasses(classRes.data);
      if (teacherRes?.success) setAvailableTeachers(teacherRes.data);
    } catch (error: any) {
      Alert.alert('Network Sync Error', error.response?.data?.message || 'Failed to sync backend database feeds.');
    } finally {
      setIsLoading(false);
    }
  };

  // Pull-to-Refresh FlatList Handler
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = ACTIVE_USER_ROLE === 'teacher' 
        ? await subjectApi.getMySubjects() 
        : await subjectApi.getAll();

      if (response?.success) {
        setSubjects(response.data);
      }
      // Silently refresh dropdown references as well
      const classRes = await classApi.getAll();
      const teacherRes = await teacherProfileApi.getAll();
      if (classRes?.success) setAvailableClasses(classRes.data);
      if (teacherRes?.success) setAvailableTeachers(teacherRes.data);
    } catch (error: any) {
      Alert.alert('Refresh Terminated', error.response?.data?.message || 'Unable to update records.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Clean form controls completely safely
  const resetFormState = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setSelectedClassId('');
    setSelectedTeacherId('');
    setDescription('');
    setIsActive(true);
    Keyboard.dismiss();
  };

  // Populate form with existing target parameters
  const handleTriggerEdit = (item: Subject) => {
    setEditingId(item._id);
    setName(item.name);
    setCode(item.code);
    setSelectedClassId(typeof item.classId === 'object' ? item.classId._id : item.classId);
    setSelectedTeacherId(typeof item.teacherId === 'object' ? item.teacherId._id : item.teacherId);
    setDescription(item.description || '');
    setIsActive(item.isActive);
  };

  // Validate parameters and push payload securely to server
  const handleSaveOrUpdate = async () => {
    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanName || !cleanCode || !selectedClassId || !selectedTeacherId) {
      Alert.alert('Input Validation', 'Please fill in all required fields and ensure valid selections for class and teacher');
      return;
    }

    setIsSubmitting(true);
    const payload: CreateSubjectPayload = {
      name: cleanName,
      code: cleanCode,
      classId: selectedClassId,
      teacherId: selectedTeacherId,
      description: description.trim() || undefined,
    };

    try {
      let response;
      if (editingId) {
        response = await subjectApi.update(editingId, { ...payload, isActive });
      } else {
        response = await subjectApi.create(payload);
      }

      if (response.success) {
        Alert.alert('Success', editingId ? 'Subject Updated Successfully ' : 'New Subject created Successfully');
        resetFormState();
        fetchCoreData(); // Sync grid with updated database status
      }
    } catch (error: any) {
      Alert.alert('Transaction Rejected', error.response?.data?.message || 'Server action validation drop.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soft Delete Trigger mapped directly to backend controller security checks
  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Do you really want to remove this subject',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await subjectApi.delete(id);
              if (response.success) {
                if (editingId === id) resetFormState();
                // Refresh records locally
                const res = ACTIVE_USER_ROLE === 'teacher' ? await subjectApi.getMySubjects() : await subjectApi.getAll();
                if (res?.success) setSubjects(res.data);
              }
            } catch (error: any) {
              Alert.alert('Wipe Interrupted', error.response?.data?.message || 'Database block process terminated.');
            }
          }
        }
      ]
    );
  };

  // Dynamic Item Card Template Builder
  const renderSubjectCard = ({ item }: { item: Subject }) => {
    const isAdmin = ACTIVE_USER_ROLE === 'admin';
    
    // Unbox populated relational object references seamlessly
    const className = typeof item.classId === 'object' ? item.classId.name : 'Unknown Class';
    const teacherName = typeof item.teacherId === 'object' 
      ? `${item.teacherId.firstName} ${item.teacherId.lastName}` 
      : 'Unmapped Instructor ID';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
            {item.name} <Text style={{ color: theme.primary, fontWeight: 'bold' }}>({item.code})</Text>
          </Text>
          
          <View style={[styles.badge, { backgroundColor: item.isActive ? theme.primary : '#757575' }]}>
            <Text style={styles.badgeText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

        {item.description ? <Text style={[styles.descText, { color: theme.text }]}>{item.description}</Text> : null}

        <View style={styles.gridRow}>
          <Text style={[styles.infoText, { color: theme.subText }]}>Class: <Text style={{ fontWeight: '600', color: theme.text }}>{className}</Text></Text>
          <Text style={[styles.infoText, { color: theme.subText }]}>Instructor: <Text style={{ fontWeight: '500', color: theme.text }}>{teacherName}</Text></Text>
        </View>

        {/* Expose execution actions strictly to Administrative Profiles */}
        {isAdmin && (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={styles.actionButton}>
              <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionButton}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      
      {/* 1. ADMINISTRATION CONFIGURATION MODULE */}
      {ACTIVE_USER_ROLE === 'admin' && (
        <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.formHeaderRow}>
            <Text style={[styles.formTitle, { color: theme.text }]}>
              {editingId ? 'Modify Subject Parameters' : 'Add New Subject'}
            </Text>
            {editingId && (
              <TouchableOpacity onPress={resetFormState}>
                <Text style={styles.cancelText}>Cancel Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* BASIC INPUT ROWS */}
          <View style={styles.rowWrapper}>
            <View style={styles.halfInput}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Subject Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Mathematics"
                placeholderTextColor={theme.subText}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.halfInput}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Subject Code</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="MATH101"
                placeholderTextColor={theme.subText}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* NATIVE PICKER DROPDOWNS */}
          <View style={styles.pickerContainer}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Select Class</Text>
            <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Picker
                selectedValue={selectedClassId}
                onValueChange={(itemValue) => setSelectedClassId(itemValue)}
                dropdownIconColor={theme.primary}
                style={{ color: theme.text }}
              >
                <Picker.Item label="-- assigned
                Class --" value="" color={theme.subText} />
                {availableClasses.map((cls) => (
                  <Picker.Item key={cls._id} label={cls.name} value={cls._id} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Assigned Instructor</Text>
            <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Picker
                selectedValue={selectedTeacherId}
                onValueChange={(itemValue) => setSelectedTeacherId(itemValue)}
                dropdownIconColor={theme.primary}
                style={{ color: theme.text }}
              >
                <Picker.Item label="-- assigned Teacher --" value="" color={theme.subText} />
                {availableTeachers.map((teacher) => {
                  // Resolve embedded teacher user data attributes cleanly
                  const targetUser = typeof teacher.userId === 'object' ? teacher.userId : null;
                  const displayString = targetUser 
                    ? `${targetUser.firstName} ${targetUser.lastName}` 
                    : `Profile GUID (${teacher._id.slice(-6)})`;

                  return (
                    <Picker.Item 
                      key={teacher._id} 
                      label={`${displayString} — ${teacher.qualification}`} 
                      value={typeof targetUser === 'object' && targetUser ? targetUser._id : teacher._id} 
                    />
                  );
                })}
              </Picker>
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: theme.text }]}>Description</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="Description info strings"
            placeholderTextColor={theme.subText}
            value={description}
            onChangeText={setDescription}
          />

          {editingId && (
            <View style={styles.switchRow}>
              <Text style={{ color: theme.text, fontWeight: '500' }}>System Record Activity State</Text>
              <Switch value={isActive} onValueChange={setIsActive} thumbColor={theme.primary} />
            </View>
          )}

          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: theme.primary }]}
            onPress={handleSaveOrUpdate}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>{editingId ? 'Update ' : 'Save'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 2. FLATLIST RENDERED SYLLABUS REGISTRY */}
      <Text style={[styles.listHeader, { color: theme.text }]}>Subjects</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(item) => item._id}
          renderItem={renderSubjectCard}
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
            <Text style={[styles.emptyText, { color: theme.subText }]}>No active topic dependencies discovered matching this view context.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Custom Setup Interface Layout Guidelines
  formCard: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { color: '#D32F2F', fontWeight: '600', fontSize: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  rowWrapper: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  
  // Custom Styling for Native Picker Anchors
  pickerContainer: { marginBottom: 12 },
  pickerWrapper: { height: 46, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  // Registry Grid Structure Mapping
  listHeader: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  descText: { fontSize: 13, marginBottom: 8 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  infoText: { fontSize: 12, fontWeight: '500' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 10, marginTop: 10 },
  actionButton: { marginLeft: 16, paddingVertical: 4 },
  editText: { fontWeight: 'bold', fontSize: 14 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 15 },
});

export default SubjectScreen;
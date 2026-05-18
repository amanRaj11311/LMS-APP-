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
import { Picker } from '@react-native-picker/picker'; // Native Dropdown Integrations

// Application API Layers & Dynamic Visual Themes
import { useTheme } from '../../theme/ThemeContext';
import { batchApi, Batch, CreateBatchPayload } from '../../api/batchApi';
import { classApi, ClassItem } from '../../api/classApi';
import { userApi, UserAccount } from '../../api/userApi';
import { subjectApi, Subject } from '../../api/subjectApi';

// Is variable ko apne global runtime Auth/Redux store se connect karein
const ACTIVE_USER_ROLE: 'admin' | 'teacher' | 'student' = 'admin';

const BatchScreen = () => {
  const { theme } = useTheme();

  // ==========================================
  // 1. DATA & FEED TRACKING STATES
  // ==========================================
  const [batches, setBatches] = useState<Batch[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<UserAccount[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ==========================================
  // 2. ACTIVE FORM BUILDER STATES
  // ==========================================
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  
  // Controlled array selection pipeline for processing multiple Subject records
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState<string>('');
  const [mappedSubjectIds, setMappedSubjectIds] = useState<string[]>([]);
  
  const [startDateText, setStartDateText] = useState<string>('2026-05-12');
  const [endDateText, setEndDateText] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Trigger synchronization execution loops on screen setup
  useEffect(() => {
    fetchCoreDependencies();
  }, []);

  // Concurrent parallel queries fetching all required runtime collections
  const fetchCoreDependencies = async () => {
    setIsLoading(true);
    try {
      const [batchRes, classRes, userRes, subjectRes] = await Promise.all([
        ACTIVE_USER_ROLE === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll(),
        classApi.getAll(),
        userApi.getAll(),
        subjectApi.getAll(),
      ]);

      if (batchRes?.success) setBatches(batchRes.data);
      if (classRes?.success) setAvailableClasses(classRes.data);
      if (subjectRes?.success) setAvailableSubjects(subjectRes.data);

      if (userRes?.success) {
        // Extract strictly authorized base Core user profiles explicitly labeled as instructors
        const instructorAccounts = userRes.data.filter((u: UserAccount) => u.role === 'teacher');
        setAvailableTeachers(instructorAccounts);
      }
    } catch (error: any) {
      Alert.alert('Network Sync Error', 'Dependencies collection synchronization dropped.');
    } finally {
      setIsLoading(false);
    }
  };

  // Pull-to-refresh execution pipeline handling dynamic list sync loops
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      const batchRes = ACTIVE_USER_ROLE === 'teacher' ? await batchApi.getMyBatches() : await batchApi.getAll();
      if (batchRes?.success) setBatches(batchRes.data);

      // Refresh dependencies seamlessly in the background context
      const classRes = await classApi.getAll();
      const userRes = await userApi.getAll();
      const subjectRes = await subjectApi.getAll();

      if (classRes?.success) setAvailableClasses(classRes.data);
      if (subjectRes?.success) setAvailableSubjects(subjectRes.data);
      if (userRes?.success) {
        const instructorAccounts = userRes.data.filter((u: UserAccount) => u.role === 'teacher');
        setAvailableTeachers(instructorAccounts);
      }
    } catch (error: any) {
      Alert.alert('Refresh Terminated', 'Unable to execute safe session refresh sweeps.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Clean form memory mapping blocks safely
  const resetFormState = () => {
    setEditingId(null);
    setName('');
    setSelectedClassId('');
    setSelectedTeacherId('');
    setSelectedSubjectToAdd('');
    setMappedSubjectIds([]);
    setStartDateText('2026-05-12');
    setEndDateText('');
    setIsActive(true);
    Keyboard.dismiss();
  };

  // Process item mapping sequences targeting individual object update parameters
  const handleTriggerEdit = (item: Batch) => {
    setEditingId(item._id);
    setName(item.name);
    
    // Safely unbox relational identifiers checking input mapping formats
    setSelectedClassId(typeof item.classId === 'object' ? item.classId._id : item.classId);
    setSelectedTeacherId(typeof item.teacherId === 'object' ? item.teacherId._id : item.teacherId);
    
    // Extract array metrics seamlessly preserving unique ID chains
    if (item.subjects && item.subjects.length > 0) {
      const extractedSubjectGuids = item.subjects.map(sub => typeof sub === 'object' ? sub._id : sub);
      setMappedSubjectIds(extractedSubjectGuids);
    } else {
      setMappedSubjectIds([]);
    }

    setStartDateText(item.startDate.split('T')[0]);
    setEndDateText(item.endDate ? item.endDate.split('T')[0] : '');
    setIsActive(item.isActive);
  };

  // Array control management: pushes target item uniquely into localized pipeline state
  const handleAddSubjectTarget = () => {
    if (!selectedSubjectToAdd) return;
    if (mappedSubjectIds.includes(selectedSubjectToAdd)) {
      Alert.alert('Duplicate Selection', 'Yeh subject pehle se list mein added hai.');
      return;
    }
    setMappedSubjectIds(prev => [...prev, selectedSubjectToAdd]);
    setSelectedSubjectToAdd(''); // Reset dropdown selection anchor
  };

  // Array control management: pops target item index cleanly from state storage array
  const handleRemoveSubjectTarget = (idToRemove: string) => {
    setMappedSubjectIds(prev => prev.filter(id => id !== idToRemove));
  };

  // Data persistence formatting verifying structures and calling target services
  const handleSaveOrUpdate = async () => {
    const cleanName = name.trim();
    const cleanStart = startDateText.trim();
    const cleanEnd = endDateText.trim();

    if (!cleanName || !selectedClassId || !selectedTeacherId || !cleanStart) {
      Alert.alert('Input Validation', 'Batch Name, Target Class, Assigned Instructor, and Start Date are strictly required.');
      return;
    }

    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(cleanStart)) {
      Alert.alert('Format Error', 'Start date should be in (YYYY-MM-DD) format');
      return;
    }

    if (cleanEnd && !isoRegex.test(cleanEnd)) {
      Alert.alert('Format Error', 'Start date should be in (YYYY-MM-DD) format');
      return;
    }

    setIsSubmitting(true);

    const payload: CreateBatchPayload = {
      name: cleanName,
      classId: selectedClassId,
      teacherId: selectedTeacherId,
      startDate: cleanStart,
      ...(mappedSubjectIds.length > 0 ? { subjects: mappedSubjectIds } : {}),
      ...(cleanEnd ? { endDate: cleanEnd } : {})
    };

    try {
      let response;
      if (editingId) {
        response = await batchApi.update(editingId, { ...payload, isActive });
      } else {
        response = await batchApi.create(payload);
      }

      if (response.success) {
        Alert.alert('Transaction Complete', editingId ? 'Batch setup successfully updated.' : 'New class collection safely registered.');
        resetFormState();
        fetchCoreDependencies();
      } else {
        Alert.alert('Transaction Refused', response.message || 'Operation dropped.');
      }
    } catch (error: any) {
      Alert.alert('Execution Dropped', error.response?.data?.message || 'Database update terminated.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Database soft deletion pipeline routines
  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to flag this Batch configuration as unlinked from operations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await batchApi.delete(id);
              if (response.success) {
                if (editingId === id) resetFormState();
                fetchCoreDependencies();
              }
            } catch (error: any) {
              Alert.alert('Wipe Interrupted', error.response?.data?.message || 'Database unlinking execution blocked.');
            }
          }
        }
      ]
    );
  };

  // Map readable visual definitions dynamically across internal records
  const getSubjectNameById = (guid: string) => {
    const matchedRecord = availableSubjects.find(s => s._id === guid);
    return matchedRecord ? `${matchedRecord.name} (${matchedRecord.code})` : `ID (${guid.slice(-6)})`;
  };

  // Main UI Item Component Template
  const renderBatchCard = ({ item }: { item: Batch }) => {
    const isAdmin = ACTIVE_USER_ROLE === 'admin';
    
    // Gracefully format relational object mappings
    const className = typeof item.classId === 'object' ? item.classId.name : 'Unmapped Class';
    const teacherName = typeof item.teacherId === 'object' 
      ? `${item.teacherId.firstName} ${item.teacherId.lastName}` 
      : 'Unmapped Instructor';
      
    const subjectCount = item.subjects ? item.subjects.length : 0;

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          
          <View style={[styles.badge, { backgroundColor: item.isActive ? theme.primary : '#757575' }]}>
            <Text style={styles.badgeText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <Text style={[styles.infoText, { color: theme.text }]}>Class: <Text style={{ fontWeight: 'bold' }}>{className}</Text></Text>
          <Text style={[styles.infoText, { color: theme.text }]}>Instructor: <Text style={{ fontWeight: '500' }}>{teacherName}</Text></Text>
          <Text style={[styles.infoText, { color: theme.subText }]}>Mapped Subjects: {subjectCount} configuration(s)</Text>
          <Text style={[styles.infoText, { color: theme.subText }]}>Start: {item.startDate.split('T')[0]}</Text>
          {item.endDate && <Text style={[styles.infoText, { color: theme.subText }]}>End: {item.endDate.split('T')[0]}</Text>}
        </View>

        {/* Secure edit/delete command access exclusively for management profiles */}
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
      
      {/* 1. MANAGEMENT CONFIGURATION ENTRY CONSOLE */}
      {ACTIVE_USER_ROLE === 'admin' && (
        <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.formHeaderRow}>
            <Text style={[styles.formTitle, { color: theme.text }]}>
              {editingId ? 'Modify Batch Configurations' : 'Configure New Batch'}
            </Text>

            {editingId && (
              <TouchableOpacity onPress={resetFormState}>
                <Text style={styles.cancelText}>Cancel Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.inputLabel, { color: theme.text }]}>Batch Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="e.g. Batch A"
            placeholderTextColor={theme.subText}
            value={name}
            onChangeText={setName}
          />

          {/* TARGET CLASS DROPDOWN */}
          <View style={styles.pickerContainer}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Assigned Class</Text>
            <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Picker
                selectedValue={selectedClassId}
                onValueChange={(itemValue) => setSelectedClassId(itemValue)}
                dropdownIconColor={theme.primary}
                style={{ color: theme.text }}
              >
                <Picker.Item label="-- Select Class --" value="" color={theme.subText} />
                {availableClasses.map((cls) => (
                  <Picker.Item key={cls._id} label={cls.name} value={cls._id} />
                ))}
              </Picker>
            </View>
          </View>

          {/* ASSIGNED TEACHER DROPDOWN */}
          <View style={styles.pickerContainer}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Assigned Teacher</Text>
            <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Picker
                selectedValue={selectedTeacherId}
                onValueChange={(itemValue) => setSelectedTeacherId(itemValue)}
                dropdownIconColor={theme.primary}
                style={{ color: theme.text }}
              >
                <Picker.Item label="-- Select Teacher --" value="" color={theme.subText} />
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

          {/* DYNAMIC SUBJECT CHIP SELECTION ENGINE */}
          <Text style={[styles.inputLabel, { color: theme.text }]}>Subjects</Text>
          <View style={styles.subjectSelectorRow}>
            <View style={[styles.pickerWrapper, styles.subjectPickerFlex, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Picker
                selectedValue={selectedSubjectToAdd}
                onValueChange={(itemValue) => setSelectedSubjectToAdd(itemValue)}
                dropdownIconColor={theme.primary}
                style={{ color: theme.text }}
              >
                <Picker.Item label="-- Choose Subject --" value="" color={theme.subText} />
                {availableSubjects.map((sub) => (
                  <Picker.Item key={sub._id} label={`${sub.name} (${sub.code})`} value={sub._id} />
                ))}
              </Picker>
            </View>

            <TouchableOpacity 
              style={[styles.addSubjectBtn, { backgroundColor: selectedSubjectToAdd ? theme.primary : '#555' }]} 
              onPress={handleAddSubjectTarget}
              disabled={!selectedSubjectToAdd}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Visual Container rendering dynamically localized tag additions */}
          {mappedSubjectIds.length > 0 && (
            <View style={styles.chipsContainer}>
              {mappedSubjectIds.map((guid) => (
                <TouchableOpacity 
                  key={guid} 
                  style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: theme.primary }]}
                  onPress={() => handleRemoveSubjectTarget(guid)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: theme.text }]} numberOfLines={1}>
                    {getSubjectNameById(guid)}
                  </Text>
                  <Text style={[styles.removeIconText, { color: theme.primary }]}>✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* TIMELINE INPUT METRICS */}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Start Metric (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="2026-05-12"
                placeholderTextColor={theme.subText}
                value={startDateText}
                onChangeText={setStartDateText}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>

            <View style={styles.halfInput}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>End Metric (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.subText}
                value={endDateText}
                onChangeText={setEndDateText}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          </View>

          {editingId && (
            <View style={styles.switchRow}>
              <Text style={{ color: theme.text, fontWeight: '500' }}>System Configuration Status</Text>
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
              <Text style={styles.btnText}>{editingId ? 'Update Batch' : 'Submit'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 2. FLATLIST RENDERED REGISTRY VIEW */}
      <Text style={[styles.listHeader, { color: theme.text }]}>Mapped Batches Registry</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(item) => item._id}
          renderItem={renderBatchCard}
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
            <Text style={[styles.emptyText, { color: theme.subText }]}>No records found</Text>
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
  
  // Custom picker implementation boundaries
  pickerContainer: { marginBottom: 12 },
  pickerWrapper: { height: 46, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },

  // Specialized Subject Chip Builder frameworks
  subjectSelectorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subjectPickerFlex: { flex: 1, marginRight: 8 },
  addSubjectBtn: { height: 46, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingVertical: 5, paddingHorizontal: 10, margin: 3 },
  chipText: { fontSize: 12, fontWeight: '500', marginRight: 6, maxWidth: 180 },
  removeIconText: { fontSize: 13, fontWeight: 'bold' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  listHeader: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  detailsGrid: { paddingBottom: 4 },
  infoText: { fontSize: 13, marginBottom: 3 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 10, marginTop: 8 },
  actionButton: { marginLeft: 16, paddingVertical: 4 },
  editText: { fontWeight: 'bold', fontSize: 14 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 14 },
});

export default BatchScreen;
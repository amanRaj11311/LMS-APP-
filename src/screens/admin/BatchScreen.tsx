import React, { useState, useCallback } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// Application API Layers & Dynamic Visual Themes
import { useTheme } from '../../theme/ThemeContext';
import { batchApi, Batch } from '../../api/batchApi';
import { classApi, ClassItem } from '../../api/classApi';

const BatchScreen = () => {
  const { theme } = useTheme();

  // ==========================================
  // 1. DYNAMIC ROLE & DATA STATES
  // ==========================================
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student' | null>(null);
  
  const [batches, setBatches] = useState<Batch[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ==========================================
  // 2. ACTIVE FORM BUILDER STATES
  // ==========================================
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [startDateText, setStartDateText] = useState<string>('');
  const [endDateText, setEndDateText] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // ==========================================
  // 3. ROLE VERIFICATION & FETCHING
  // ==========================================
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const verifyAndInitializeRuntimeState = async () => {
        try {
          const storedString = await AsyncStorage.getItem("user_data");
          let evaluatedRole: 'admin' | 'teacher' | 'student' = 'student';
          
          if (storedString) {
            const userObj = JSON.parse(storedString);
            if (userObj?.role) {
              if (typeof userObj.role === 'string') evaluatedRole = userObj.role.trim().toLowerCase() as any;
              else if (typeof userObj.role === 'object' && userObj.role.name) evaluatedRole = userObj.role.name.trim().toLowerCase() as any;
            }
            if (!['admin', 'teacher', 'student'].includes(evaluatedRole)) evaluatedRole = 'student'; 
            if (isMounted) setCurrentUserRole(evaluatedRole);
          }
          if (isMounted) await fetchCoreDependencies(evaluatedRole);
        } catch (err) {
          console.warn("Storage runtime evaluation error:", err);
          if (isMounted) setIsLoading(false);
        }
      };

      verifyAndInitializeRuntimeState();
      return () => { isMounted = false; };
    }, [])
  );

  const fetchCoreDependencies = async (roleOverride?: 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    try {
      const targetRole = roleOverride || currentUserRole;

      // Clean, lightweight parallel fetch (Removed heavy Users and Subjects APIs)
      const [batchRes, classRes] = await Promise.all([
        targetRole === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll(),
        classApi.getAll(),
      ]);

      if (batchRes?.success) setBatches(batchRes.data);
      if (classRes?.success) setAvailableClasses(classRes.data);
      
    } catch (error: any) {
      Alert.alert('Network Issue', 'Failed to load batch data. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      const batchRes = currentUserRole === 'teacher' ? await batchApi.getMyBatches() : await batchApi.getAll();
      if (batchRes?.success) setBatches(batchRes.data);

      const classRes = await classApi.getAll();
      if (classRes?.success) setAvailableClasses(classRes.data);
    } catch (error: any) {
      Alert.alert('Refresh Failed', 'Could not refresh the latest data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetFormState = () => {
    setEditingId(null);
    setName('');
    setSelectedClassId('');
    setStartDateText('');
    setEndDateText('');
    setIsActive(true);
    Keyboard.dismiss();
  };

  const handleTriggerEdit = (item: Batch) => {
    setEditingId(item._id);
    setName(item.name);
    setSelectedClassId(typeof item.classId === 'object' ? item.classId._id : item.classId);
    setStartDateText(item.startDate.split('T')[0]);
    setEndDateText(item.endDate ? item.endDate.split('T')[0] : '');
    setIsActive(item.isActive !== undefined ? item.isActive : true);
  };

  const handleSaveOrUpdate = async () => {
    const cleanName = name.trim();
    const cleanStart = startDateText.trim();
    const cleanEnd = endDateText.trim();

    // 🌟 User Friendly Validations
    if (!cleanName) {
      Alert.alert('Missing Detail', 'Please enter a name for the Batch.');
      return;
    }
    if (!selectedClassId) {
      Alert.alert('Missing Detail', 'Please assign a Class to this Batch.');
      return;
    }
    if (!cleanStart) {
      Alert.alert('Missing Detail', 'Please specify the Start Date.');
      return;
    }

    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(cleanStart)) {
      Alert.alert('Format Mismatch', 'Start date must exactly match the YYYY-MM-DD format (e.g. 2026-05-15).');
      return;
    }

    if (cleanEnd && !isoRegex.test(cleanEnd)) {
      Alert.alert('Format Mismatch', 'End date must exactly match the YYYY-MM-DD format.');
      return;
    }

    setIsSubmitting(true);

    const payload: any = {
      name: cleanName,
      classId: selectedClassId,
      startDate: cleanStart,
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
        Alert.alert('Success!', editingId ? 'Batch has been updated successfully.' : 'New batch created successfully.');
        resetFormState();
        fetchCoreDependencies();
      } else {
        Alert.alert('Failed', response.message || 'Could not save the batch.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Server connection failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this batch?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await batchApi.delete(id);
              if (response.success) {
                Alert.alert('Deleted', 'Batch removed successfully.');
                if (editingId === id) resetFormState();
                fetchCoreDependencies();
              } else {
                Alert.alert('Error', response.message || 'Could not delete batch.');
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Server connection failed.');
            }
          }
        }
      ]
    );
  };

  const renderBatchCard = ({ item }: { item: Batch }) => {
    const isAdmin = currentUserRole === 'admin';
    const className = typeof item.classId === 'object' && item.classId ? item.classId.name : 'Unknown Class';

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
          <Text style={[styles.infoText, { color: theme.subText, marginTop: 4 }]}>Started: {item.startDate.split('T')[0]}</Text>
          {item.endDate && <Text style={[styles.infoText, { color: theme.subText }]}>Ends: {item.endDate.split('T')[0]}</Text>}
        </View>

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
      {currentUserRole === 'admin' && (
        <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.formHeaderRow}>
            <Text style={[styles.formTitle, { color: theme.text }]}>
              {editingId ? 'Edit Batch Details' : 'Create New Batch'}
            </Text>

            {editingId && (
              <TouchableOpacity onPress={resetFormState}>
                <Text style={styles.cancelText}>Cancel Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.inputLabel, { color: theme.text }]}>Batch Name (Required)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="e.g. Batch A"
            placeholderTextColor={theme.subText}
            value={name}
            onChangeText={setName}
          />

          <View style={styles.pickerContainer}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Assigned Class (Required)</Text>
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

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Start Date (Required)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.subText}
                value={startDateText}
                onChangeText={setStartDateText}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>

            <View style={styles.halfInput}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>End Date (Optional)</Text>
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
              <Text style={{ color: theme.text, fontWeight: '500' }}>Active Status</Text>
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
              <Text style={styles.btnText}>{editingId ? 'Update Batch' : 'Submit Batch'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 2. FLATLIST RENDERED REGISTRY VIEW */}
      <Text style={[styles.listHeader, { color: theme.text }]}>All Batches</Text>

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
            <Text style={[styles.emptyText, { color: theme.subText }]}>No batches created yet.</Text>
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
  
  pickerContainer: { marginBottom: 12 },
  pickerWrapper: { height: 46, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },

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
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 13 },
});

export default BatchScreen;
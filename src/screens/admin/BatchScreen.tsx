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
  RefreshControl,
  Modal,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../../theme/ThemeContext';
import { batchApi, Batch } from '../../api/batchApi';
import { classApi, ClassItem } from '../../api/classApi';

const BatchScreen = () => {
  const { theme } = useTheme();

  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student' | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showForm, setShowForm] = useState(false); // Modal control
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [startDateText, setStartDateText] = useState<string>('');
  const [endDateText, setEndDateText] = useState<string>('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const verifyAndInitializeRuntimeState = async () => {
        try {
          const storedString = await AsyncStorage.getItem('user_data');
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
          if (isMounted) setIsLoading(false);
        }
      };
      verifyAndInitializeRuntimeState();
      return () => { isMounted = false; };
    }, []),
  );

  const fetchCoreDependencies = async (roleOverride?: 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    try {
      const targetRole = roleOverride || currentUserRole;
      const [batchRes, classRes] = await Promise.all([
        targetRole === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll(),
        classApi.getAll(),
      ]);
      if (batchRes?.success) setBatches(batchRes.data);
      if (classRes?.success) setAvailableClasses(classRes.data);
    } catch (error: any) { Alert.alert('Network Issue', 'Failed to load batch data.'); } 
    finally { setIsLoading(false); }
  };

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      const batchRes = currentUserRole === 'teacher' ? await batchApi.getMyBatches() : await batchApi.getAll();
      if (batchRes?.success) setBatches(batchRes.data);
      const classRes = await classApi.getAll();
      if (classRes?.success) setAvailableClasses(classRes.data);
    } finally { setIsRefreshing(false); }
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
    setIsActive(item.isActive ?? true);
    setShowForm(true);
  };

  const handleSaveOrUpdate = async () => {
    if (!name.trim() || !selectedClassId || !startDateText.trim()) {
      Alert.alert('Validation', 'Please fill all required fields');
      return;
    }
    setIsSubmitting(true);
    const payload: any = { name: name.trim(), classId: selectedClassId, startDate: startDateText.trim(), ...(endDateText.trim() && { endDate: endDateText.trim() }) };
    try {
      const response = editingId ? await batchApi.update(editingId, { ...payload, isActive }) : await batchApi.create(payload);
      if (response.success) {
        Alert.alert('Success', 'Batch saved successfully');
        resetFormState();
        setShowForm(false);
        fetchCoreDependencies();
      } else { Alert.alert('Error', response.message || 'Could not save'); }
    } catch (error: any) { Alert.alert('Error', 'Server connection failed'); } 
    finally { setIsSubmitting(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Batch', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const response = await batchApi.delete(id);
            if (response.success) { fetchCoreDependencies(); }
          } catch (error: any) { Alert.alert('Error', 'Delete failed'); }
        }
      },
    ]);
  };

  const renderBatchCard = ({ item }: { item: Batch }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
        <View style={[styles.badge, { backgroundColor: item.isActive ? theme.primary : '#757575' }]}>
          <Text style={styles.badgeText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <View style={styles.detailsGrid}>
        <Text style={[styles.infoText, { color: theme.text }]}>Class: <Text style={{fontWeight: 'bold'}}>{typeof item.classId === 'object' ? item.classId?.name : 'Unknown'}</Text></Text>
        <Text style={[styles.infoText, { color: theme.subText }]}>Started: {item.startDate.split('T')[0]}</Text>
      </View>
      {currentUserRole === 'admin' && (
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={styles.actionButton}><Text style={[styles.editText, { color: theme.primary }]}>Edit</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionButton}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      
      <View style={styles.topHeaderRow}>
        <Text style={[styles.listHeader, { color: theme.text }]}>All Batches</Text>
        {currentUserRole === 'admin' && (
          <TouchableOpacity style={[styles.smallCreateBtn, { backgroundColor: theme.primary }]} onPress={() => setShowForm(true)}>
            <Text style={styles.smallBtnText}>+ New Batch</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 🌟 PROFESSIONAL MODAL FORM */}
      <Modal visible={showForm} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.formHeaderRow}>
              <Text style={[styles.formTitle, { color: theme.text }]}>{editingId ? 'Edit Batch' : 'Create Batch'}</Text>
              <TouchableOpacity onPress={() => { resetFormState(); setShowForm(false); }}>
                <MaterialIcons name="close" size={24} color={theme.subText} />
              </TouchableOpacity>
            </View>

            <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Batch Name" placeholderTextColor={theme.subText} value={name} onChangeText={setName} />
            
            <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Picker selectedValue={selectedClassId} onValueChange={setSelectedClassId} style={{ color: theme.text }}>
                <Picker.Item label="-- Select Class --" value="" />
                {availableClasses.map(cls => <Picker.Item key={cls._id} label={cls.name} value={cls._id} />)}
              </Picker>
            </View>
<View style={styles.row}>
  <TouchableOpacity
    onPress={() => setShowStartPicker(true)}
    style={[
      styles.input,
      styles.halfInput,
      {
        justifyContent: 'center',
        backgroundColor: theme.background,
        borderColor: theme.border,
      },
    ]}
  >
    <Text
      style={{
        color: startDateText ? theme.text : theme.subText,
      }}
    >
      {startDateText || 'Select Start Date'}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => setShowEndPicker(true)}
    style={[
      styles.input,
      styles.halfInput,
      {
        justifyContent: 'center',
        backgroundColor: theme.background,
        borderColor: theme.border,
      },
    ]}
  >
    <Text
      style={{
        color: endDateText ? theme.text : theme.subText,
      }}
    >
      {endDateText || 'Select End Date'}
    </Text>
  </TouchableOpacity>
</View>

            {editingId && (
              <View style={styles.switchRow}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>Active Status</Text>
                <Switch value={isActive} onValueChange={setIsActive} thumbColor={theme.primary} />
              </View>
            )}

            <TouchableOpacity style={[styles.mainButton, { backgroundColor: theme.primary }]} onPress={handleSaveOrUpdate} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{editingId ? 'Update Batch' : 'Create Batch'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DatePickers (keep your existing logic here) */}
      {showStartPicker && <DateTimePicker value={startDateText ? new Date(startDateText) : new Date()} mode="date" onChange={(e, d) => { setShowStartPicker(false); if(d) setStartDateText(d.toISOString().split('T')[0]); }} />}
      {showEndPicker && <DateTimePicker value={endDateText ? new Date(endDateText) : new Date()} mode="date" onChange={(e, d) => { setShowEndPicker(false); if(d) setEndDateText(d.toISOString().split('T')[0]); }} />}

      <FlatList
        data={batches}
        keyExtractor={(item) => item._id}
        renderItem={renderBatchCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} colors={[theme.primary]} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  listHeader: { fontSize: 20, fontWeight: 'bold' },
  smallCreateBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  smallBtnText: { color: '#FFF', fontWeight: 'bold' },
  
  // Modal Styling
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { padding: 20, borderRadius: 16, borderWidth: 1, elevation: 10 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
 input: {
  height: 48,
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 12,
  marginBottom: 12,
  flexDirection: 'row',
  alignItems: 'center',
},
  pickerWrapper: { height: 48, borderWidth: 1, borderRadius: 8, justifyContent: 'center', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  
  // Card Styles
  listContent: { padding: 16 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  infoText: { fontSize: 14, marginBottom: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 10, marginTop: 10 },
  actionButton: { marginLeft: 20 },
  editText: { fontWeight: 'bold', fontSize: 14 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 }
});

export default BatchScreen;
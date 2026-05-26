import React, { useState, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, 
  Modal, ScrollView, ActivityIndicator, RefreshControl, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker'; // 🌟 IMPORT ADDED

// Core Themes and Network Backend Services
import { useTheme } from '../../theme/ThemeContext';
import { examApi, Exam, CreateExamPayload } from '../../api/examApi';
import { subjectApi, Subject } from '../../api/subjectApi';
import { batchApi, Batch } from '../../api/batchApi';

const ExamScreen = ({ navigation }: { navigation: any }) => {
  const { theme, isDark } = useTheme();

  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [exams, setExams] = useState<Exam[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [examType, setExamType] = useState<'midterm' | 'final' | 'quiz' | 'practical' | 'internal'>('midterm');
  
  // 🌟 DATE PICKER STATES
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  
  const [durationText, setDurationText] = useState<string>('180');
  const [totalMarksText, setTotalMarksText] = useState<string>('100');
  const [passingMarksText, setPassingMarksText] = useState<string>('35');
  const [venueText, setVenueText] = useState<string>('Room 101');
  const [instructionsText, setInstructionsText] = useState<string>('');

  const fetchDependencies = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedStr = await AsyncStorage.getItem("user_data");
      const user = storedStr ? JSON.parse(storedStr) : {};
      const role = (user.role?.name || user.role || 'student').toLowerCase();
      setCurrentUserRole(role);

      const examsRes = role === 'student' ? await examApi.getMyExams() : await examApi.getAll();
      setExams(examsRes?.data || examsRes?.result || []);

      if (role !== 'student') {
        const [subRes, batRes] = await Promise.allSettled([
          subjectApi.getAll(),
          role === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll()
        ]);
        if (subRes.status === 'fulfilled') setAvailableSubjects(subRes.value.data || []);
        if (batRes.status === 'fulfilled') setAvailableBatches(batRes.value.data || []);
      }
    } catch (error) {
      console.log("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchDependencies(); }, [fetchDependencies]));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDependencies();
    setIsRefreshing(false);
  };

  const resetFormState = () => {
    setEditingId(null); setTitle(''); setSelectedSubjectId(''); setSelectedBatchId('');
    setExamType('midterm'); setScheduledDateTime(''); setSelectedDate(null);
    setDurationText('180'); setTotalMarksText('100'); setPassingMarksText('35'); setVenueText('Room 101');
    setInstructionsText('');
  };

  // 🌟 DATE & TIME PICKER HANDLERS
  const onChangeDate = (event: any, selectedDateValue?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDateValue) {
      setSelectedDate(selectedDateValue);
      // Once date is selected, open Time Picker
      setShowTimePicker(true);
    }
  };

  const onChangeTime = (event: any, selectedTimeValue?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTimeValue && selectedDate) {
      // Combine selectedDate and selectedTimeValue
      const combinedDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTimeValue.getHours(),
        selectedTimeValue.getMinutes()
      );
      
      // Format to YYYY-MM-DD HH:MM
      const year = combinedDate.getFullYear();
      const month = String(combinedDate.getMonth() + 1).padStart(2, '0');
      const day = String(combinedDate.getDate()).padStart(2, '0');
      const hours = String(combinedDate.getHours()).padStart(2, '0');
      const minutes = String(combinedDate.getMinutes()).padStart(2, '0');
      
      setScheduledDateTime(`${year}-${month}-${day} ${hours}:${minutes}`);
    }
  };

  const handleSaveOrUpdate = async () => {
    if (!title || !selectedSubjectId || !selectedBatchId || !scheduledDateTime || !durationText || !totalMarksText || !passingMarksText) {
      return Alert.alert('Validation Error', 'Please fill all required fields.');
    }

    setIsSubmitting(true);
    let formattedIsoTimestamp = scheduledDateTime;
    if (scheduledDateTime.includes(' ') && scheduledDateTime.length >= 15) {
        const [d, t] = scheduledDateTime.split(' ');
        formattedIsoTimestamp = `${d}T${t}:00.000Z`;
    }

    const payload: CreateExamPayload = {
      title, subjectId: selectedSubjectId, batchId: selectedBatchId, type: examType,
      scheduledAt: formattedIsoTimestamp, duration: parseInt(durationText, 10),
      totalMarks: parseFloat(totalMarksText), passingMarks: parseFloat(passingMarksText),
      venue: venueText, instructions: instructionsText
    };

    try {
      if (editingId) await examApi.update(editingId, payload);
      else await examApi.create(payload);

      Alert.alert('Success', 'Exam schedule saved.');
      setIsModalVisible(false);
      resetFormState();
      fetchDependencies();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save exam.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExam = (id: string) => {
    Alert.alert('Confirm', 'Delete this exam?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await examApi.delete(id);
            fetchDependencies();
          } catch (e) { Alert.alert('Error', 'Deletion failed.'); }
        }
      }
    ]);
  };

  const handleEdit = (item: any) => {
    setEditingId(item._id);
    setTitle(item.title);
    setSelectedSubjectId(typeof item.subjectId === 'object' ? item.subjectId._id : item.subjectId);
    setSelectedBatchId(typeof item.batchId === 'object' ? item.batchId._id : item.batchId);
    setExamType(item.type);
    let displayDate = item.scheduledAt;
    if(item.scheduledAt && item.scheduledAt.includes('T')) {
        const parts = item.scheduledAt.split('T');
        displayDate = `${parts[0]} ${parts[1].substring(0, 5)}`;
    }
    setScheduledDateTime(displayDate);
    setDurationText(item.duration?.toString() || '180');
    setTotalMarksText(item.totalMarks?.toString() || '100');
    setPassingMarksText(item.passingMarks?.toString() || '35');
    setVenueText(item.venue || '');
    setInstructionsText(item.instructions || '');
    setIsModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.mainTitle, { color: theme.text }]}>Exams</Text>
        {currentUserRole !== 'student' && (
          <TouchableOpacity style={[styles.newBtn, { backgroundColor: theme.primary }]} onPress={() => { resetFormState(); setIsModalVisible(true); }}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>+ Schedule Exam</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={exams}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30 }} // 🌟 FIX: Removed heavy padding top
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.primary]} />}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.primary, textTransform: 'uppercase' }}>{item.type}</Text>
            </View>
            <Text style={{ fontSize: 13, color: theme.text, marginTop: 4 }}>Subject: {item.subjectId?.name || 'N/A'}</Text>
            <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 8 }}>Time: {item.scheduledAt?.replace('T', ' ').substring(0, 16)} | Venue: {item.venue}</Text>

            {currentUserRole !== 'student' && (
               <View style={styles.actionRow}>
                 <TouchableOpacity onPress={() => handleEdit(item)}><Text style={{ color: theme.primary, fontWeight: 'bold' }}>Edit</Text></TouchableOpacity>
                 <TouchableOpacity onPress={() => handleDeleteExam(item._id)}><Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>Delete</Text></TouchableOpacity>
               </View>
            )}
          </View>
        )}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editingId ? 'Edit Exam' : 'Schedule Exam'}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}><MaterialIcons name="close" size={24} color={theme.text}/></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text }]}>EXAM TITLE *</Text>
              <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]} placeholder="Mid Term - Mathematics" placeholderTextColor={theme.subText} value={title} onChangeText={setTitle} />

              <View style={styles.row}>
                <View style={[styles.halfWidth, { opacity: editingId ? 0.6 : 1 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>BATCH *</Text>
                  <View style={[styles.pickerWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <Picker enabled={!editingId} selectedValue={selectedBatchId} onValueChange={setSelectedBatchId} style={{ color: theme.text }} dropdownIconColor={theme.text}>
                      <Picker.Item label="Select batch" value="" color={isDark ? '#FFF' : '#000'} />
                      {availableBatches.map(b => <Picker.Item key={b._id} label={b.name} value={b._id} color={isDark ? '#FFF' : '#000'} />)}
                    </Picker>
                  </View>
                </View>
                <View style={[styles.halfWidth, { opacity: editingId ? 0.6 : 1 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>SUBJECT *</Text>
                  <View style={[styles.pickerWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <Picker enabled={!editingId} selectedValue={selectedSubjectId} onValueChange={setSelectedSubjectId} style={{ color: theme.text }} dropdownIconColor={theme.text}>
                      <Picker.Item label="Select subject" value="" color={isDark ? '#FFF' : '#000'} />
                      {availableSubjects.map(s => <Picker.Item key={s._id} label={s.name} value={s._id} color={isDark ? '#FFF' : '#000'} />)}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.halfWidth, { opacity: editingId ? 0.6 : 1 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>EXAM TYPE *</Text>
                  <View style={[styles.pickerWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <Picker enabled={!editingId} selectedValue={examType} onValueChange={setExamType} style={{ color: theme.text }} dropdownIconColor={theme.text}>
                      <Picker.Item label="Midterm" value="midterm" color={isDark ? '#FFF' : '#000'} />
                      <Picker.Item label="Final" value="final" color={isDark ? '#FFF' : '#000'} />
                      <Picker.Item label="Quiz" value="quiz" color={isDark ? '#FFF' : '#000'} />
                    </Picker>
                  </View>
                </View>
                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: theme.text }]}>VENUE</Text>
                  <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]} placeholder="Room 101" placeholderTextColor={theme.subText} value={venueText} onChangeText={setVenueText} />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: theme.text }]}>SCHEDULED DATE & TIME *</Text>
                  {/* 🌟 FIX: Date Picker implementation */}
                  <TouchableOpacity 
                    onPress={() => setShowDatePicker(true)} 
                    style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, justifyContent: 'center' }]}
                  >
                    <Text style={{ color: scheduledDateTime ? theme.text : theme.subText }}>
                      {scheduledDateTime || 'Select Date & Time'}
                    </Text>
                  </TouchableOpacity>

                  {/* DatePicker Component */}
                  {showDatePicker && (
                    <DateTimePicker
                      testID="datePicker"
                      value={selectedDate || new Date()}
                      mode="date"
                      is24Hour={true}
                      display="default"
                      minimumDate={new Date()} // Disables past dates
                      onChange={onChangeDate}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      testID="timePicker"
                      value={selectedDate || new Date()}
                      mode="time"
                      is24Hour={true}
                      display="default"
                      onChange={onChangeTime}
                    />
                  )}
                </View>
                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: theme.text }]}>DURATION (MINUTES) *</Text>
                  <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]} placeholder="180" placeholderTextColor={theme.subText} keyboardType="numeric" value={durationText} onChangeText={setDurationText} />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.halfWidth, { opacity: editingId ? 0.6 : 1 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>TOTAL MARKS *</Text>
                  <TextInput editable={!editingId} style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]} placeholder="100" placeholderTextColor={theme.subText} keyboardType="numeric" value={totalMarksText} onChangeText={setTotalMarksText} />
                </View>
                <View style={[styles.halfWidth, { opacity: editingId ? 0.6 : 1 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>PASSING MARKS *</Text>
                  <TextInput editable={!editingId} style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]} placeholder="35" placeholderTextColor={theme.subText} keyboardType="numeric" value={passingMarksText} onChangeText={setPassingMarksText} />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>INSTRUCTIONS</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]} placeholder="Bring your ID card..." placeholderTextColor={theme.subText} multiline value={instructionsText} onChangeText={setInstructionsText} />

              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setIsModalVisible(false)}><Text style={{ color: theme.text, fontWeight: 'bold' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveOrUpdate} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#FFF"/> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  mainTitle: { fontSize: 20, fontWeight: 'bold' },
  newBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 }, // 🌟 FIX: Removed marginHorizontal here since contentContainerStyle handles it
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20, paddingTop: 10, marginTop: 4, borderTopWidth: 0.5, borderTopColor: '#DDD' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 10 },
  modalContent: { padding: 20, borderRadius: 12, maxHeight: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, height: 44 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfWidth: { width: '48%' },
  pickerWrapper: { height: 44, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden', marginBottom: 12 },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderWidth: 2, borderRadius: 8, marginRight: 10 },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 7 }
});

export default ExamScreen;
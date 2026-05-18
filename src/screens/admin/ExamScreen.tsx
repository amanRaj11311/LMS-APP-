import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Switch, 
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

// Core Themes and Network Backend Services
import { useTheme } from '../../theme/ThemeContext';
import { examApi, Exam, CreateExamPayload } from '../../api/examApi';
import { subjectApi, Subject } from '../../api/subjectApi';
import { batchApi, Batch } from '../../api/batchApi';

// Ensure this runtime configuration explicitly matches the logged-in scope
const ACTIVE_USER_ROLE: 'admin' | 'teacher' | 'student' = 'admin';

const ExamScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();

  // ==========================================
  // DATA REGISTRY STATES
  // ==========================================
  const [exams, setExams] = useState<Exam[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ==========================================
  // 100% COMPLETE MASTER FORM BUFFERS
  // ==========================================
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [examType, setExamType] = useState<'midterm' | 'final' | 'quiz' | 'practical' | 'internal'>('midterm');
  
  // Custom Visual Date/Time Decoupling
  const [inputDate, setInputDate] = useState<string>('2026-06-15');
  const [inputTime, setInputTime] = useState<string>('10:00');

  const [durationText, setDurationText] = useState<string>('120');
  const [totalMarksText, setTotalMarksText] = useState<string>('100');
  const [passingMarksText, setPassingMarksText] = useState<string>('33');
  const [venueText, setVenueText] = useState<string>('Auditorium Hall A');
  const [instructionsText, setInstructionsText] = useState<string>('Attempt all questions.');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Execute initial REST sweeps safely on mounting
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOperationalDependencies();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchOperationalDependencies = async () => {
    setIsLoading(true);
    try {
      if (typeof examApi?.getAll !== 'function' || typeof subjectApi?.getAll !== 'function') {
        console.warn("API Hook Error: Downstream framework endpoints unlinked.");
        setIsLoading(false);
        return;
      }

      const [examsRes, subjectsRes, batchesRes] = await Promise.all([
        ACTIVE_USER_ROLE === 'student' ? examApi.getMyExams() : examApi.getAll(),
        subjectApi.getAll(),
        ACTIVE_USER_ROLE === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll(),
      ]);

      if (examsRes) {
        const rawPayload = Array.isArray(examsRes) ? examsRes : (examsRes.data || examsRes.result || examsRes.exams || []);
        setExams(Array.isArray(rawPayload) ? rawPayload : [rawPayload].filter(Boolean));
      }

      if (subjectsRes) {
        const rawSubs = Array.isArray(subjectsRes) ? subjectsRes : (subjectsRes.data || subjectsRes.result || subjectsRes.subjects || []);
        setAvailableSubjects(Array.isArray(rawSubs) ? rawSubs : []);
      }

      if (batchesRes) {
        const rawBatches = Array.isArray(batchesRes) ? batchesRes : (batchesRes.data || batchesRes.result || batchesRes.batches || []);
        setAvailableBatches(Array.isArray(rawBatches) ? rawBatches : []);
      }
    } catch (error: any) {
      console.warn("API Catch Ex:", error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFormState = () => {
    setEditingId(null);
    setTitle('');
    setSelectedSubjectId('');
    setSelectedBatchId('');
    setExamType('midterm');
    setInputDate('2026-06-15');
    setInputTime('10:00');
    setDurationText('120');
    setTotalMarksText('100');
    setPassingMarksText('33');
    setVenueText('Auditorium Hall A');
    setInstructionsText('Attempt all questions.');
    setIsActive(true);
    Keyboard.dismiss();
  };

  const handleTriggerEdit = (item: any) => {
    if (!item) return;
    
    setEditingId(item._id);
    setTitle(item.title || '');
    setSelectedSubjectId(typeof item.subjectId === 'object' && item.subjectId ? item.subjectId._id : item.subjectId);
    setSelectedBatchId(typeof item.batchId === 'object' && item.batchId ? item.batchId._id : item.batchId);
    setExamType(item.type || 'midterm');
    
    // Parse underlying DB strings cleanly directly back into input visual fields
    if (item.scheduledAt && typeof item.scheduledAt === 'string') {
      try {
        const parts = item.scheduledAt.split('T');
        if (parts.length >= 2) {
          setInputDate(parts[0]);
          setInputTime(parts[1].substring(0, 5));
        }
      } catch (e) {
        setInputDate('2026-06-15');
        setInputTime('10:00');
      }
    }

    setDurationText(item.duration ? item.duration.toString() : '120');
    setTotalMarksText(item.totalMarks ? item.totalMarks.toString() : '100');
    setPassingMarksText(item.passingMarks !== undefined ? item.passingMarks.toString() : '33');
    setVenueText(item.venue || '');
    setInstructionsText(item.instructions || '');
    setIsActive(item.isActive !== undefined ? item.isActive : true);

    // Ensure main wrapper returns absolute view target instantly
    MasterScrollRef?.scrollTo({ y: 0, animated: true });
  };

  let MasterScrollRef: ScrollView | null = null;

  const handleSaveOrUpdate = async () => {
    const cleanTitle = title.trim();
    const cleanDate = inputDate.trim();
    const cleanTime = inputTime.trim();
    const parsedDur = parseInt(durationText.trim(), 10);
    const parsedTotal = parseFloat(totalMarksText.trim());
    const parsedPass = parseFloat(passingMarksText.trim());

    if (!cleanTitle || !selectedSubjectId || !selectedBatchId || !cleanDate || !cleanTime || isNaN(parsedDur) || isNaN(parsedTotal) || isNaN(parsedPass)) {
      Alert.alert('Validation Error', 'Title, Subject, Batch, Date, Time, Duration, Total marks, and Passing scores strictly required.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!dateRegex.test(cleanDate) || !timeRegex.test(cleanTime)) {
      Alert.alert('Format Validation', 'Ensure Date matches YYYY-MM-DD and Time matches 24-Hour HH:MM format.');
      return;
    }

    if (parsedPass > parsedTotal) {
      Alert.alert('Threshold Error', 'Passing target threshold cannot evaluate higher than assigned theoretical overall marks.');
      return;
    }

    setIsSubmitting(true);
    const formattedIsoTimestamp = `${cleanDate}T${cleanTime}:00.000Z`;

    const payload: CreateExamPayload = {
      title: cleanTitle,
      subjectId: selectedSubjectId,
      batchId: selectedBatchId,
      type: examType,
      scheduledAt: formattedIsoTimestamp,
      duration: parsedDur,
      totalMarks: parsedTotal,
      passingMarks: parsedPass,
      venue: venueText.trim() || undefined,
      instructions: instructionsText.trim() || undefined,
    };

    try {
      let response;
      if (editingId) {
        response = await examApi.update(editingId, { ...payload, isActive });
      } else {
        response = await examApi.create(payload);
      }

      if (response?.success || response?._id) {
        Alert.alert('Success', editingId ? 'Assessment setup successfully updated.' : 'New exam timeline cleanly published.');
        resetFormState();
        fetchOperationalDependencies();
      } else {
        Alert.alert('Action Refused', response?.message || 'Storage routing blocked.');
      }
    } catch (error: any) {
      Alert.alert('Persistence Exception', error.response?.data?.message || 'Network write drop recorded.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExam = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to softly unlink this evaluation task from active calendars?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await examApi.delete(id);
              if (res?.success || res?.message) {
                if (editingId === id) resetFormState();
                fetchOperationalDependencies();
              }
            } catch (error: any) {
              Alert.alert('Wipe Interrupted', error.response?.data?.message || 'Removal command dropped.');
            }
          }
        }
      ]
    );
  };

  const renderMiniExamItem = (item: any) => {
    if (!item) return null;
    const subObj = typeof item.subjectId === 'object' && item.subjectId ? item.subjectId : null;
    const subjectName = subObj ? `${subObj.name} (${subObj.code || ''})` : 'Unmapped Subject';
    let rawDate = 'N/A';
    if (typeof item.scheduledAt === 'string') rawDate = item.scheduledAt.split('T')[0];

    return (
      <View key={item._id} style={[styles.miniCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.miniHeader}>
          <Text style={[styles.miniTitle, { color: theme.text }]} numberOfLines={1}>{item.title || 'Untitled Assessment'}</Text>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.primary, textTransform: 'uppercase' }}>{item.type || 'MIDTERM'}</Text>
        </View>

        <Text style={{ fontSize: 12, color: theme.text, marginTop: 2 }}>Subject: {subjectName}</Text>
        <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 6 }}>Schedule: {rawDate} | Duration: {item.duration || 0}m</Text>

        <View style={styles.miniActionRow}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ExamResults', { examId: item._id, examTitle: item.title, batchId: typeof item.batchId === 'object' ? item.batchId._id : item.batchId, subjectId: typeof item.subjectId === 'object' ? item.subjectId._id : item.subjectId, passingMarks: item.passingMarks, totalMarks: item.totalMarks })} 
            style={{ marginRight: 16 }}
          >
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>Exam Results</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={{ marginRight: 12 }}>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDeleteExam(item._id)}>
            <Text style={{ color: '#D32F2F', fontWeight: 'bold', fontSize: 12 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const safeSubjects = Array.isArray(availableSubjects) ? availableSubjects : [];
  const safeBatches = Array.isArray(availableBatches) ? availableBatches : [];
  const safeExams = Array.isArray(exams) ? exams : [];
  const topThreeExams = safeExams.slice(0, 3);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        
        {/* ONE MASTER UNCLIPPED SCROLL FRAME */}
        <ScrollView 
          ref={(ref) => { MasterScrollRef = ref; }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* ========================================== */}
          {/* SECTION 1: FULLY VISIBLE EYE-SCALED FORM */}
          {/* ========================================== */}
          {ACTIVE_USER_ROLE !== 'student' ? (
            <View style={[styles.formWrapperBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.formHeaderRow}>
                <Text style={[styles.formTitle, { color: theme.text }]}>{editingId ? 'Modify Assessment' : 'Publish New Exam'}</Text>
                {editingId ? (
                  <TouchableOpacity onPress={resetFormState}>
                    <Text style={styles.cancelText}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* No embedded scroll views inside here. Pure input lists */}
              <Text style={[styles.label, { color: theme.text }]}>Exam Title</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Mid Term - Mathematics" placeholderTextColor={theme.subText} value={title} onChangeText={setTitle} />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Target Subject</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={selectedSubjectId} onValueChange={(v) => setSelectedSubjectId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                      <Picker.Item label="-- Select Sub --" value="" color={theme.subText} />
                      {safeSubjects.map((sub) => <Picker.Item key={sub._id} label={sub?.name ? `${sub.name} (${sub.code || ''})` : 'Unnamed'} value={sub._id} />)}
                    </Picker>
                  </View>
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Target Batch</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={selectedBatchId} onValueChange={(v) => setSelectedBatchId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                      <Picker.Item label="-- Select Batch --" value="" color={theme.subText} />
                      {safeBatches.map((b) => <Picker.Item key={b._id} label={b?.name || 'Unnamed'} value={b._id} />)}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Exam Type</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={examType} onValueChange={(v) => setExamType(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                      <Picker.Item label="Midterm" value="midterm" /><Picker.Item label="Final" value="final" /><Picker.Item label="Quiz" value="quiz" /><Picker.Item label="Practical" value="practical" /><Picker.Item label="Internal" value="internal" />
                    </Picker>
                  </View>
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Duration (Mins)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="120" placeholderTextColor={theme.subText} value={durationText} onChangeText={setDurationText} keyboardType="numeric" />
                </View>
              </View>

              {/* CLEAN SEPARATE INPUT BOXES FOR TIMESTAMPS */}
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Date (YYYY-MM-DD)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="2026-06-15" placeholderTextColor={theme.subText} value={inputDate} onChangeText={setInputDate} maxLength={10} />
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Time (HH:MM)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="10:00" placeholderTextColor={theme.subText} value={inputTime} onChangeText={setInputTime} maxLength={5} />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Total Marks</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="100" placeholderTextColor={theme.subText} value={totalMarksText} onChangeText={setTotalMarksText} keyboardType="numeric" />
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Passing Gate</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="33" placeholderTextColor={theme.subText} value={passingMarksText} onChangeText={setPassingMarksText} keyboardType="numeric" />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Venue Location</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Auditorium Hall A" placeholderTextColor={theme.subText} value={venueText} onChangeText={setVenueText} />

              <Text style={[styles.label, { color: theme.text }]}>Instructions</Text>
              <TextInput style={[styles.input, { height: 56, backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Describe evaluation requirements..." placeholderTextColor={theme.subText} value={instructionsText} onChangeText={setInstructionsText} multiline />

              {editingId ? (
                <View style={styles.switchRow}>
                  <Text style={{ color: theme.text, fontWeight: '500' }}>Active System Broadcaster</Text>
                  <Switch value={isActive} onValueChange={setIsActive} thumbColor={theme.primary} />
                </View>
              ) : null}

              <TouchableOpacity style={[styles.mainButton, { backgroundColor: theme.primary }]} onPress={handleSaveOrUpdate} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{editingId ? 'Update Configurations' : 'Broadcast Evaluation Task'}</Text>}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ========================================== */}
          {/* SECTION 2: TOP 3 EXAMS PREVIEW */}
          {/* ========================================== */}
          <View style={styles.miniRegistryBlock}>
            <Text style={[styles.registryHeading, { color: theme.text }]}>All Exams (Top 3)</Text>
            
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : topThreeExams.length > 0 ? (
              topThreeExams.map(renderMiniExamItem)
            ) : (
              <Text style={[styles.emptyText, { color: theme.subText }]}>No baseline collections mapped inside operational caches.</Text>
            )}

            {/* ROUTE EXPANDED FEED BUTTON */}
            {safeExams.length > 0 ? (
              <TouchableOpacity 
                style={[styles.viewAllBtn, { borderColor: theme.primary }]}
                onPress={() => navigation.navigate('AllExamsFeed', { examsData: safeExams })}
              >
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>
                  View All Mapped Exams ({safeExams.length})
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  formWrapperBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { color: '#D32F2F', fontWeight: '600', fontSize: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  pickerWrapper: { height: 46, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden', marginBottom: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Mini Feed Style Definitions
  miniRegistryBlock: { marginTop: 4 },
  registryHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  miniCard: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  miniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniTitle: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  miniActionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#EEE', marginTop: 4 },
  viewAllBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(2, 136, 209, 0.05)' },
  emptyText: { textAlign: 'center', fontSize: 13, marginVertical:  13},
});

export default ExamScreen;
import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// Themes and Upstream Core API Dependencies
import { useTheme } from '../../theme/ThemeContext';
import { lessonApi, Lesson, CreateLessonPayload } from '../../api/lessonApi';
import { subjectApi, Subject } from '../../api/subjectApi';
import { batchApi, Batch } from '../../api/batchApi';

const LessonScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();

  // 🌟 DYNAMIC IDENTITY TRACKING
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Workspace Array Arrays
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active Output Variables
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [lessonType, setLessonType] = useState<'lecture' | 'lab' | 'tutorial' | 'seminar'>('lecture');
  
  // Clean Form Interface Inputs
  const [inputDate, setInputDate] = useState<string>('2026-05-15');
  const [inputTime, setInputTime] = useState<string>('09:30');

  const [durationText, setDurationText] = useState<string>('60');
  const [contentText, setContentText] = useState<string>('');
  const [attachmentsText, setAttachmentsText] = useState<string>(''); 
  const [meetingLinkText, setMeetingLinkText] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // 🌟 STRICT API RESOLUTION BASED ON ROLE
  const fetchOperationalWorkspaceAssets = useCallback(async (roleOverride?: 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    try {
      const targetRole = roleOverride || currentUserRole;

      const [lessonsRes, subjectsRes, batchesRes] = await Promise.all([
        targetRole === 'student' ? lessonApi.getMyLessons() : lessonApi.getAll(),
        subjectApi.getAll(),
        targetRole !== 'student' ? (targetRole === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll()) : Promise.resolve([]),
      ]);

      if (lessonsRes) {
        const rawPayload = Array.isArray(lessonsRes) ? lessonsRes : (lessonsRes.data || lessonsRes.result || lessonsRes.lessons || []);
        setLessons(Array.isArray(rawPayload) ? rawPayload : [rawPayload].filter(Boolean));
      }

      if (subjectsRes) {
        const rawSubs = Array.isArray(subjectsRes) ? subjectsRes : (subjectsRes.data || subjectsRes.result || subjectsRes.subjects || []);
        setAvailableSubjects(Array.isArray(rawSubs) ? rawSubs : []);
      }

      if (batchesRes) {
        const rawBatches = Array.isArray(batchesRes) ? batchesRes : (batchesRes.data || batchesRes.result || batchesRes.batches || []);
        setAvailableBatches(Array.isArray(rawBatches) ? rawBatches : []);
      }
    } catch (err: any) {
      console.warn("Downstream System Fetch Catch Ex:", err?.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRole]);

  // 🌟 IDENTITY UNBOXING ON FOCUS
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const verifyAndInitializeRuntimeState = async () => {
        try {
          const storedString = await AsyncStorage.getItem("user_data");
          let evaluatedRole: 'admin' | 'teacher' | 'student' = 'student';
          
          if (storedString) {
            const userObj = JSON.parse(storedString);
            if (userObj?._id) setCurrentUserId(userObj._id);

            if (userObj?.role) {
              if (typeof userObj.role === 'string') evaluatedRole = userObj.role.trim().toLowerCase() as any;
              else if (typeof userObj.role === 'object' && userObj.role.name) evaluatedRole = userObj.role.name.trim().toLowerCase() as any;
            }
            if (!['admin', 'teacher', 'student'].includes(evaluatedRole)) evaluatedRole = 'student'; 
            
            if (isMounted) setCurrentUserRole(evaluatedRole);
          }
          if (isMounted) await fetchOperationalWorkspaceAssets(evaluatedRole);
        } catch (err) {
          console.warn("Storage runtime evaluation error:", err);
          if (isMounted) setIsLoading(false);
        }
      };

      verifyAndInitializeRuntimeState();
      return () => { isMounted = false; };
    }, [fetchOperationalWorkspaceAssets])
  );

  const resetFormState = () => {
    setEditingId(null);
    setTitle('');
    setSelectedSubjectId('');
    setSelectedBatchId('');
    setLessonType('lecture');
    setInputDate('2026-05-15');
    setInputTime('09:30');
    setDurationText('60');
    setContentText('');
    setAttachmentsText('');
    setMeetingLinkText('');
    setIsActive(true);
    Keyboard.dismiss();
  };

  const handleTriggerEdit = (item: any) => {
    if (!item) return;
    
    setEditingId(item._id);
    setTitle(item.title || '');
    setSelectedSubjectId(typeof item.subjectId === 'object' && item.subjectId ? item.subjectId._id : item.subjectId);
    setSelectedBatchId(typeof item.batchId === 'object' && item.batchId ? item.batchId._id : item.batchId);
    setLessonType(item.type || 'lecture');
    
    if (item.scheduledAt && typeof item.scheduledAt === 'string') {
      try {
        const parts = item.scheduledAt.split('T');
        if (parts.length >= 2) {
          setInputDate(parts[0]);
          setInputTime(parts[1].substring(0, 5));
        }
      } catch (e) {
        setInputDate('2026-05-15');
        setInputTime('09:30');
      }
    }

    setDurationText(item.duration ? item.duration.toString() : '60');
    setContentText(item.content || '');
    const arr = Array.isArray(item.attachments) ? item.attachments : [];
    setAttachmentsText(arr.join(', '));
    setMeetingLinkText(item.meetingLink || '');
    setIsActive(item.isActive !== undefined ? item.isActive : true);
    
    MasterScrollRef?.scrollTo({ y: 0, animated: true });
  };

  let MasterScrollRef: ScrollView | null = null;

  const handleSaveOrUpdate = async () => {
    const cleanTitle = title.trim();
    const cleanDate = inputDate.trim();
    const cleanTime = inputTime.trim();
    const parsedDur = parseInt(durationText.trim(), 10);

    if (!cleanTitle || !selectedSubjectId || !selectedBatchId || !cleanDate || !cleanTime || isNaN(parsedDur)) {
      Alert.alert('Validation Error', 'Title, Subject, Cohort assignment, Base Schedule Date/Time, and numeric Duration parameters required.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!dateRegex.test(cleanDate) || !timeRegex.test(cleanTime)) {
      Alert.alert('Format Validation', 'Ensure Date matches YYYY-MM-DD and Time adheres to 24-Hour HH:MM.');
      return;
    }

    setIsSubmitting(true);
    const formattedIsoTimestamp = `${cleanDate}T${cleanTime}:00.000Z`;

    const attachmentsArray = attachmentsText.trim()
      ? attachmentsText.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const payload: CreateLessonPayload = {
      title: cleanTitle,
      subjectId: selectedSubjectId,
      batchId: selectedBatchId,
      scheduledAt: formattedIsoTimestamp,
      duration: parsedDur,
      type: lessonType,
      content: contentText.trim() || undefined,
      attachments: attachmentsArray,
      meetingLink: meetingLinkText.trim() || undefined,
    };

    try {
      let response;
      if (editingId) {
        response = await lessonApi.update(editingId, { ...payload, isActive });
      } else {
        response = await lessonApi.create(payload);
      }

      if (response?.success || response?._id) {
        Alert.alert('Success', editingId ? 'Updated Successfully' : 'New academic lesson correctly added.');
        resetFormState();
        fetchOperationalWorkspaceAssets();
      } else {
        Alert.alert('Action Refused', response?.message || 'Database target drop blocked modification execution.');
      }
    } catch (error: any) {
      Alert.alert('Persistence Validation Error', error.response?.data?.message || 'Network update connectivity failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLesson = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to flag this instructional session as unlinked?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await lessonApi.delete(id);
              if (res?.success || res?.message) {
                if (editingId === id) resetFormState();
                fetchOperationalWorkspaceAssets();
              }
            } catch (error: any) {
              Alert.alert('Wipe Interrupted', error.response?.data?.message || 'Database record modification failure.');
            }
          }
        }
      ]
    );
  };

  const renderMiniLessonItem = (item: any) => {
    if (!item) return null;
    
    // Evaluate if the logged-in user can modify this specific item
    const uploaderId = typeof item.teacherId === 'object' ? item.teacherId?._id : (item.teacherId || item.createdBy);
    const canManage = currentUserRole === 'admin' || (currentUserRole === 'teacher' && uploaderId === currentUserId);

    const subObj = typeof item.subjectId === 'object' && item.subjectId ? item.subjectId : null;
    const subjectName = subObj ? `${subObj.name} (${subObj.code || ''})` : 'Unmapped Target Subject';
    
    let rawDate = 'N/A';
    if (typeof item.scheduledAt === 'string') rawDate = item.scheduledAt.split('T')[0];

    return (
      <View key={item._id} style={[styles.miniCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.miniHeaderRow}>
          <Text style={[styles.miniTitleText, { color: theme.text }]} numberOfLines={1}>{item.title || 'Untitled Session'}</Text>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.primary, textTransform: 'uppercase' }}>{item.type || 'LECTURE'}</Text>
        </View>

        <Text style={{ fontSize: 12, color: theme.text, marginTop: 2 }}>Subject: {subjectName}</Text>
        <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 6 }}>Date: {rawDate} | Length: {item.duration || 0} Mins</Text>

        <View style={styles.miniActionRow}>
          {item.meetingLink ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.meetingLink)} style={{ marginRight: 16 }}>
              <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 12 }}>Join Session</Text>
            </TouchableOpacity>
          ) : null}

          {canManage && (
            <>
              <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={{ marginRight: 12 }}>
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteLesson(item._id)}>
                <Text style={{ color: '#D32F2F', fontWeight: 'bold', fontSize: 12 }}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const safeSubjects = Array.isArray(availableSubjects) ? availableSubjects : [];
  const safeBatches = Array.isArray(availableBatches) ? availableBatches : [];
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const topThreeLessons = safeLessons.slice(0, 3);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
          
          {/* ========================================== */}
          {/* SECTION 1: MASTER ENTRY FORM (Hidden from Students) */}
          {/* ========================================== */}
          {currentUserRole !== 'student' && (
            <View style={[styles.formWrapperBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.formHeaderRow}>
                <Text style={[styles.formTitle, { color: theme.text }]}>{editingId ? 'Modify Session Settings' : 'Publish Class Lesson'}</Text>
                {editingId ? (
                  <TouchableOpacity onPress={resetFormState}>
                    <Text style={styles.cancelText}>Clear Form</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Lesson Title</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Introduction to Algebra" placeholderTextColor={theme.subText} value={title} onChangeText={setTitle} />

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
                  <Text style={[styles.label, { color: theme.text }]}>Session Format</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={lessonType} onValueChange={(v) => setLessonType(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                      <Picker.Item label="Lecture" value="lecture" /><Picker.Item label="Lab" value="lab" /><Picker.Item label="Tutorial" value="tutorial" /><Picker.Item label="Seminar" value="seminar" />
                    </Picker>
                  </View>
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Duration (Mins)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="60" placeholderTextColor={theme.subText} value={durationText} onChangeText={setDurationText} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Date (YYYY-MM-DD)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="2026-05-15" placeholderTextColor={theme.subText} value={inputDate} onChangeText={setInputDate} maxLength={10} />
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Time (24H HH:MM)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="09:30" placeholderTextColor={theme.subText} value={inputTime} onChangeText={setInputTime} maxLength={5} />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Virtual Conference URL</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="https://meet.domain.com/abc-xyz..." placeholderTextColor={theme.subText} value={meetingLinkText} onChangeText={setMeetingLinkText} autoCapitalize="none" />

              <Text style={[styles.label, { color: theme.text }]}>Attachments (Comma separated URLs)</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="link1.com, link2.com" placeholderTextColor={theme.subText} value={attachmentsText} onChangeText={setAttachmentsText} autoCapitalize="none" />

              <Text style={[styles.label, { color: theme.text }]}>Syllabus Plan</Text>
              <TextInput style={[styles.input, { height: 56, backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Describe topics..." placeholderTextColor={theme.subText} value={contentText} onChangeText={setContentText} multiline />

              {editingId ? (
                <View style={styles.switchRow}>
                  <Text style={{ color: theme.text, fontWeight: '500' }}>Active Pipeline Broadcasting</Text>
                  <Switch value={isActive} onValueChange={setIsActive} thumbColor={theme.primary} />
                </View>
              ) : null}

              <TouchableOpacity style={[styles.mainButton, { backgroundColor: theme.primary }]} onPress={handleSaveOrUpdate} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{editingId ? 'Update' : 'Submit'}</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================== */}
          {/* SECTION 2: TOP 3 LIST VIEWS */}
          {/* ========================================== */}
          <View style={styles.miniRegistryBlock}>
            <Text style={[styles.registryHeading, { color: theme.text }]}>All Lessons(Top 3)</Text>
            
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : topThreeLessons.length > 0 ? (
              topThreeLessons.map(renderMiniLessonItem)
            ) : (
              <Text style={[styles.emptyText, { color: theme.subText }]}>No instructional entries currently mapped.</Text>
            )}

            {safeLessons.length > 0 && (
              <TouchableOpacity 
                style={[styles.viewAllBtn, { borderColor: theme.primary }]}
                onPress={() => navigation.navigate('AllLessonsFeed', { lessonsData: safeLessons, currentUserRole, currentUserId })}
              >
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>
                  View All Lessons ({safeLessons.length})
                </Text>
              </TouchableOpacity>
            )}
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

  miniRegistryBlock: { marginTop: 4 },
  registryHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  miniCard: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  miniHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniTitleText: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  miniActionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#EEE', marginTop: 4 },
  viewAllBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(2, 136, 209, 0.05)' },
  emptyText: { textAlign: 'center', fontSize: 12, marginVertical: 12 },
});

export default LessonScreen;
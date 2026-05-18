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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// Themes and Upstream Core API Service Layers
import { useTheme } from '../../theme/ThemeContext';
import { timetableApi, TimetableSlot } from '../../api/timetableApi';
import { batchApi, Batch } from '../../api/batchApi';
import { classApi, ClassItem } from '../../api/classApi';
import { subjectApi, Subject } from '../../api/subjectApi';
import { userApi, UserAccount } from '../../api/userApi';

const TimetableScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();

  // 🌟 STRICT DYNAMIC ROLE
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student'>('student');

  // Core System Cache Feeds
  const [timetables, setTimetables] = useState<any[]>([]);
  const [batchesFeed, setBatchesFeed] = useState<Batch[]>([]);
  const [classesFeed, setClassesFeed] = useState<ClassItem[]>([]);
  const [subjectsFeed, setSubjectsFeed] = useState<Subject[]>([]);
  const [teachersFeed, setTeachersFeed] = useState<UserAccount[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active Output Variables
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [effectiveFromText, setEffectiveFromText] = useState<string>('2026-06-01');
  const [effectiveToText, setEffectiveToText] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Multi-Slot Roster Arrays
  const [slotsBuffer, setSlotsBuffer] = useState<TimetableSlot[]>([]);
  
  // Quick Slot Input fields
  const [slotDay, setSlotDay] = useState<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>('monday');
  const [slotStartTime, setSlotStartTime] = useState<string>('09:00');
  const [slotEndTime, setSlotEndTime] = useState<string>('10:00');
  const [slotSubjectId, setSlotSubjectId] = useState<string>('');
  const [slotTeacherId, setSlotTeacherId] = useState<string>('');
  const [slotRoom, setSlotRoom] = useState<string>('Room 101');

  const fetchMasterTimetableDependencies = useCallback(async (roleOverride?: 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    try {
      const activeRole = roleOverride || currentUserRole;

      if (activeRole === 'student') {
        // Student fetches their specific enrolled timetable
        const res = await timetableApi.getMyTimetable();
        if (res?.success && res.data) {
          setTimetables([res.data]);
        } else {
          setTimetables([]);
        }
      } else if (activeRole === 'teacher') {
        // Teacher fetches their specific assigned schedule
        const res = await timetableApi.getMySchedule();
        if (res?.success && res.data) {
          setTimetables(Array.isArray(res.data) ? res.data : []);
        } else {
          setTimetables([]);
        }
      } else {
        // Admin logic
        const [batchesRes, classesRes, subjectsRes, usersRes] = await Promise.all([
          batchApi.getAll(),
          classApi.getAll(),
          subjectApi.getAll(),
          userApi.getAll(),
        ]);

        if (batchesRes) {
          const rawBatches = Array.isArray(batchesRes) ? batchesRes : (batchesRes.data || []);
          setBatchesFeed(rawBatches);

          if (rawBatches.length > 0) {
            try {
              const tableOutputArray: any[] = [];
              for (let i = 0; i < Math.min(rawBatches.length, 3); i++) {
                const b = rawBatches[i];
                const tRes = await timetableApi.getByBatch(b._id);
                if (tRes?.success && tRes.data) {
                  tableOutputArray.push(tRes.data);
                }
              }
              setTimetables(tableOutputArray);
            } catch (e) {}
          }
        }

        if (classesRes) {
          const rawClasses = Array.isArray(classesRes) ? classesRes : (classesRes.data || []);
          setClassesFeed(rawClasses);
        }

        if (subjectsRes) {
          const rawSubs = Array.isArray(subjectsRes) ? subjectsRes : (subjectsRes.data || []);
          setSubjectsFeed(rawSubs);
        }

        if (usersRes) {
          const rawUsers = Array.isArray(usersRes) ? usersRes : (usersRes.data || []);
          const filteredTeachers = rawUsers.filter((u: any) => u && u.role === 'teacher' && !u.isDeleted);
          setTeachersFeed(filteredTeachers);
        }
      }
    } catch (err: any) {
      console.warn("Timetable Extraction Exception:", err?.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRole]);

  // 🌟 ULTRA-STRICT ROLE PARSING ON FOCUS
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
              if (typeof userObj.role === 'string') {
                evaluatedRole = userObj.role.trim().toLowerCase() as any;
              } else if (typeof userObj.role === 'object' && userObj.role.name) {
                evaluatedRole = userObj.role.name.trim().toLowerCase() as any;
              }
            }
            
            if (!['admin', 'teacher', 'student'].includes(evaluatedRole)) {
              evaluatedRole = 'student'; 
            }

            if (isMounted) setCurrentUserRole(evaluatedRole);
          }
          if (isMounted) await fetchMasterTimetableDependencies(evaluatedRole);
        } catch (err) {
          console.warn("Storage runtime error:", err);
          if (isMounted) setIsLoading(false);
        }
      };

      verifyAndInitializeRuntimeState();

      return () => { isMounted = false; };
    }, [fetchMasterTimetableDependencies])
  );

  const resetFormState = () => {
    setEditingId(null);
    setSelectedBatchId('');
    setSelectedClassId('');
    setEffectiveFromText('2026-06-01');
    setEffectiveToText('');
    setIsActive(true);
    setSlotsBuffer([]);
    
    setSlotDay('monday');
    setSlotStartTime('09:00');
    setSlotEndTime('10:00');
    setSlotSubjectId('');
    setSlotTeacherId('');
    setSlotRoom('Room 101');
    Keyboard.dismiss();
  };

  const handlePushSlotToBuffer = () => {
    const cleanStart = slotStartTime.trim();
    const cleanEnd = slotEndTime.trim();
    const cleanRoom = slotRoom.trim();

    if (!slotSubjectId || !slotTeacherId || !cleanStart || !cleanEnd) {
      Alert.alert('Incomplete Sub-Parameters', 'Select an instructional Subject, Teacher, and precise duration mapping.');
      return;
    }

    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(cleanStart) || !timeRegex.test(cleanEnd)) {
      Alert.alert('Format Validation', 'Ensure slot parameters match 24-Hour HH:MM formats.');
      return;
    }

    setSlotsBuffer(prev => [
      ...prev,
      {
        day: slotDay,
        startTime: cleanStart,
        endTime: cleanEnd,
        subjectId: slotSubjectId,
        teacherId: slotTeacherId,
        roomNumber: cleanRoom || undefined
      }
    ]);

    setSlotStartTime('10:00');
    setSlotEndTime('11:00');
  };

  const handleRemoveSlotFromBuffer = (indexIndex: number) => {
    setSlotsBuffer(prev => prev.filter((_, idx) => idx !== indexIndex));
  };

  const handleTriggerEdit = (item: any) => {
    if (!item) return;
    
    setEditingId(item._id);
    setSelectedBatchId(typeof item.batchId === 'object' && item.batchId ? item.batchId._id : item.batchId);
    setSelectedClassId(typeof item.classId === 'object' && item.classId ? item.classId._id : item.classId);
    setEffectiveFromText(item.effectiveFrom ? item.effectiveFrom.split('T')[0] : '2026-06-01');
    setEffectiveToText(item.effectiveTo ? item.effectiveTo.split('T')[0] : '');
    setIsActive(item.isActive !== undefined ? item.isActive : true);

    if (Array.isArray(item.slots)) {
      const formattedSlots: TimetableSlot[] = item.slots.map((s: any) => ({
        day: s.day || 'monday',
        startTime: s.startTime || '09:00',
        endTime: s.endTime || '10:00',
        subjectId: typeof s.subjectId === 'object' && s.subjectId ? s.subjectId._id : s.subjectId,
        teacherId: typeof s.teacherId === 'object' && s.teacherId ? s.teacherId._id : s.teacherId,
        roomNumber: s.roomNumber || 'Room 101'
      }));
      setSlotsBuffer(formattedSlots);
    } else {
      setSlotsBuffer([]);
    }

    MasterScrollRef?.scrollTo({ y: 0, animated: true });
  };

  let MasterScrollRef: ScrollView | null = null;

  const handleSaveOrUpdate = async () => {
    if (!selectedBatchId || !selectedClassId || !effectiveFromText.trim()) {
      Alert.alert('Validation Error', 'Batch, Class assignment, and Base operational configuration mappings strictly required.');
      return;
    }

    if (slotsBuffer.length === 0) {
      Alert.alert('Missing Slot Mapping', 'Populate at least one valid daily lesson block inside the roster array.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(effectiveFromText.trim())) {
      Alert.alert('Format Validation', 'Ensure Effective Date configuration follows standard YYYY-MM-DD sequence definitions.');
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      if (editingId) {
        response = await timetableApi.update(editingId, { 
          slots: slotsBuffer, 
          effectiveTo: effectiveToText.trim() || undefined, 
          isActive 
        });
      } else {
        response = await timetableApi.create({
          batchId: selectedBatchId,
          classId: selectedClassId,
          effectiveFrom: effectiveFromText.trim(),
          effectiveTo: effectiveToText.trim() || undefined,
          slots: slotsBuffer,
        });
      }

      if (response?.success || response?._id) {
        Alert.alert('Success', editingId ? 'Timetable layout safely modified.' : 'Master layout configured cleanly.');
        resetFormState();
        fetchMasterTimetableDependencies();
      } else {
        Alert.alert('Action Refused', response?.message || 'Storage write transactions rejected.');
      }
    } catch (error: any) {
      Alert.alert('Persistence Validation Error', error.response?.data?.message || 'Network operations failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTimetable = (id: string) => {
    Alert.alert(
      'Confirm Soft Removal',
      'Are you sure you want to softly unlink this schedule from master operational interfaces?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await timetableApi.delete(id);
              if (res?.success || res?.message) {
                if (editingId === id) resetFormState();
                fetchMasterTimetableDependencies();
              }
            } catch (error: any) {
              Alert.alert('Wipe Interrupted', error.response?.data?.message || 'Removal command dropped.');
            }
          }
        }
      ]
    );
  };

  const renderTimetableCard = ({ item }: { item: any }) => {
    if (!item) return null;
    const isAdmin = currentUserRole === 'admin';
    
    const batchObj = typeof item.batchId === 'object' && item.batchId ? item.batchId : null;
    const batchName = batchObj ? batchObj.name : 'Unmapped Target Group';
    const classObj = typeof item.classId === 'object' && item.classId ? item.classId : null;
    const className = classObj ? classObj.name : 'Unmapped Class';

    let effFrom = 'N/A';
    if (typeof item.effectiveFrom === 'string') effFrom = item.effectiveFrom.split('T')[0];

    const slotsArr = Array.isArray(item.slots) ? item.slots : (item.mySlots || []);

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitleText, { color: theme.text }]} numberOfLines={1}>Cohort: {batchName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.isActive !== false ? theme.primary : '#757575' }]}>
            <Text style={styles.badgeText}>{item.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 12, color: theme.text, fontWeight: '600', marginBottom: 2 }}>Class Mapping: {className}</Text>
        <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 8 }}>Operational From: {effFrom}</Text>

        <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.primary, marginBottom: 4 }}>Assigned Instructional Roster ({slotsArr.length} Slots)</Text>
        <View style={styles.slotsGrid}>
          {slotsArr.map((s: any, index: number) => {
            const subObj = typeof s.subjectId === 'object' && s.subjectId ? s.subjectId : null;
            const subName = subObj ? subObj.code || subObj.name : 'Sub';
            const teacherObj = typeof s.teacherId === 'object' && s.teacherId ? s.teacherId : null;
            const tName = teacherObj ? teacherObj.lastName || teacherObj.firstName : 'Instructor';

            return (
              <View key={index} style={styles.slotPill}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#B48600', textTransform: 'uppercase' }}>{s.day?.substring(0,3)}</Text>
                <Text style={{ fontSize: 10, color: theme.text, fontWeight: '500' }}>{s.startTime}-{s.endTime}</Text>
                <Text style={{ fontSize: 10, color: theme.subText }} numberOfLines={1}>{subName} | {tName}</Text>
                <Text style={{ fontSize: 9, color: theme.subText }}>{s.roomNumber || 'Room 101'}</Text>
              </View>
            );
          })}
        </View>

        {isAdmin && (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={{ marginRight: 12 }}>
              <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>Edit Properties</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteTimetable(item._id)}>
              <Text style={{ color: '#D32F2F', fontWeight: 'bold', fontSize: 12 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const safeBatches = Array.isArray(batchesFeed) ? batchesFeed : [];
  const safeClasses = Array.isArray(classesFeed) ? classesFeed : [];
  const safeSubjects = Array.isArray(subjectsFeed) ? subjectsFeed : [];
  const safeTeachers = Array.isArray(teachersFeed) ? teachersFeed : [];
  const safeTimetables = Array.isArray(timetables) ? timetables : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView 
          ref={(ref) => { MasterScrollRef = ref; }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* ========================================== */}
          {/* SECTION 1: MASTER EYE-VISIBLE FORM */}
          {/* ========================================== */}
          {/* 🌟 FORM HIDDEN FROM STUDENTS AND TEACHERS */}
          {currentUserRole === 'admin' ? (
            <View style={[styles.formWrapperBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.formHeaderRow}>
                <Text style={[styles.formTitle, { color: theme.text }]}>{editingId ? 'Modify Timetable Set' : 'Create Batch Timetable'}</Text>
                {editingId ? (
                  <TouchableOpacity onPress={resetFormState}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Target Cohort</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={selectedBatchId} onValueChange={(v) => setSelectedBatchId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                      <Picker.Item label="-- Select Batch --" value="" color={theme.subText} />
                      {safeBatches.map((b) => <Picker.Item key={b._id} label={b?.name || 'Unnamed'} value={b._id} />)}
                    </Picker>
                  </View>
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Educational Class</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={selectedClassId} onValueChange={(v) => setSelectedClassId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                      <Picker.Item label="-- Select Class --" value="" color={theme.subText} />
                      {safeClasses.map((cls) => <Picker.Item key={cls._id} label={cls?.name || 'Unnamed'} value={cls._id} />)}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Effective Start (YYYY-MM-DD)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="2026-06-01" placeholderTextColor={theme.subText} value={effectiveFromText} onChangeText={setEffectiveFromText} maxLength={10} />
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Effective End (Optional)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="YYYY-MM-DD" placeholderTextColor={theme.subText} value={effectiveToText} onChangeText={setEffectiveToText} maxLength={10} />
                </View>
              </View>

              {/* DYNAMIC SLOT CREATION BUILDER SUITE */}
              <View style={styles.subFormConsole}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.primary, marginBottom: 8 }}>Embed Target Daily Blocks</Text>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={[styles.label, { color: theme.text }]}>Target Assignment Day</Text>
                    <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 6 }]}>
                      <Picker selectedValue={slotDay} onValueChange={(v) => setSlotDay(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                        <Picker.Item label="Monday" value="monday" /><Picker.Item label="Tuesday" value="tuesday" /><Picker.Item label="Wednesday" value="wednesday" /><Picker.Item label="Thursday" value="thursday" /><Picker.Item label="Friday" value="friday" /><Picker.Item label="Saturday" value="saturday" /><Picker.Item label="Sunday" value="sunday" />
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.halfInput}>
                    <Text style={[styles.label, { color: theme.text }]}>Venue Room Mapping</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, marginBottom: 6 }]} placeholder="Room 101" placeholderTextColor={theme.subText} value={slotRoom} onChangeText={setSlotRoom} />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={[styles.label, { color: theme.text }]}>Target Subject</Text>
                    <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 6 }]}>
                      <Picker selectedValue={slotSubjectId} onValueChange={(v) => setSlotSubjectId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                        <Picker.Item label="-- Pick Subject --" value="" color={theme.subText} />
                        {safeSubjects.map(sub => <Picker.Item key={sub._id} label={sub.code || sub.name} value={sub._id} />)}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.halfInput}>
                    <Text style={[styles.label, { color: theme.text }]}>Instructor</Text>
                    <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 6 }]}>
                      <Picker selectedValue={slotTeacherId} onValueChange={(v) => setSlotTeacherId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                        <Picker.Item label="-- Pick Instructor --" value="" color={theme.subText} />
                        {safeTeachers.map(tea => <Picker.Item key={tea._id} label={`${tea.firstName} ${tea.lastName}`} value={tea._id} />)}
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, marginBottom: 0 }]} placeholder="Start (HH:MM)" placeholderTextColor={theme.subText} value={slotStartTime} onChangeText={setSlotStartTime} maxLength={5} />
                  </View>
                  <View style={styles.halfInput}>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, marginBottom: 0 }]} placeholder="End (HH:MM)" placeholderTextColor={theme.subText} value={slotEndTime} onChangeText={setSlotEndTime} maxLength={5} />
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={handlePushSlotToBuffer} 
                  style={[styles.pushSlotBtn, { backgroundColor: theme.surface === '#FFFFFF' ? '#E0F2FE' : '#0369A1' }]}
                >
                  <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>Append Slot Into Dynamic Buffer Array</Text>
                </TouchableOpacity>

                {slotsBuffer.length > 0 ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.text, marginBottom: 4 }}>Buffered Items ({slotsBuffer.length})</Text>
                    {slotsBuffer.map((slot, index) => {
                      const subObj = safeSubjects.find(s => s._id === slot.subjectId);
                      const teaObj = safeTeachers.find(t => t._id === slot.teacherId);
                      return (
                        <View key={index} style={styles.bufferSlotRow}>
                          <Text style={{ fontSize: 11, color: theme.text, flex: 1 }} numberOfLines={1}>
                            [{slot.day.substring(0,3).toUpperCase()}] {slot.startTime}-{slot.endTime} | {subObj?.code || 'Sub'} | {teaObj?.lastName || 'Tea'}
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveSlotFromBuffer(index)} style={{ paddingHorizontal: 6 }}>
                            <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              {editingId ? (
                <View style={styles.switchRow}>
                  <Text style={{ color: theme.text, fontWeight: '500' }}>Active State Record</Text>
                  <Switch value={isActive} onValueChange={setIsActive} thumbColor={theme.primary} />
                </View>
              ) : null}

              <TouchableOpacity style={[styles.mainButton, { backgroundColor: theme.primary }]} onPress={handleSaveOrUpdate} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{editingId ? 'Update Master Properties' : 'Commit Roster Timetable'}</Text>}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ========================================== */}
          {/* SECTION 2: CONTEXTUAL FEED PREVIEWS */}
          {/* ========================================== */}
          <View style={styles.miniRegistryBlock}>
            <Text style={[styles.registryHeading, { color: theme.text }]}>
              {currentUserRole === 'student' ? 'My Core Dynamic Timetable' : currentUserRole === 'teacher' ? 'My Instructional Slots' : 'Extracted Batch Timetables'}
            </Text>
            
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : safeTimetables.length > 0 ? (
              safeTimetables.map((item, index) => <View key={index}>{renderTimetableCard({ item })}</View>)
            ) : (
              <Text style={[styles.emptyText, { color: theme.subText }]}>No instructional rosters mapped within this runtime workspace.</Text>
            )}

            {currentUserRole === 'admin' && safeBatches.length > 0 ? (
              <TouchableOpacity 
                style={[styles.viewAllBtn, { borderColor: theme.primary }]}
                onPress={() => navigation.navigate('AllTimetablesFeed', { batchesList: safeBatches })}
              >
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>
                  Explore All Mapped Arrays ({safeBatches.length} Cohorts)
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
  subFormConsole: { padding: 12, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.02)', borderWidth: 0.5, borderColor: '#DDD', marginTop: 4, marginBottom: 10 },
  pushSlotBtn: { marginTop: 6, paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 0.5, borderColor: '#0288D1' },
  bufferSlotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#EEE' },
  miniRegistryBlock: { marginTop: 4 },
  registryHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  card: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitleText: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  slotPill: { width: '48%', padding: 8, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 0.5, borderColor: '#EEE', marginBottom: 8 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#EEE', marginTop: 6 },
  viewAllBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(2, 136, 209, 0.05)' },
  emptyText: { textAlign: 'center', fontSize: 13, marginVertical: 12 },
});

export default TimetableScreen;
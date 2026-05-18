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
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

// Themes and Upstream Network Client Service Layers
import { useTheme } from '../../theme/ThemeContext';
import { attendanceApi, AttendanceRecord, AttendanceSummary } from '../../api/attendanceApi';
import { batchApi, Batch } from '../../api/batchApi';
import { userApi, UserAccount } from '../../api/userApi';
import { lessonApi, Lesson } from '../../api/lessonApi'; 

// Validate execution environments mapping to the current active runtime scope
const ACTIVE_USER_ROLE: 'admin' | 'teacher' | 'student' = 'admin';

const AttendanceScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();

  // Workspace Metadata Extraction Caches
  const [batches, setBatches] = useState<Batch[]>([]);
  const [studentsFeed, setStudentsFeed] = useState<UserAccount[]>([]);
  const [lessonsFeed, setLessonsFeed] = useState<Lesson[]>([]);
  
  // Dynamic API query parameter inputs
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [queryStudentId, setQueryStudentId] = useState<string>('');

  // Local Output Display Maps
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      fetchCoreWorkspaceAssets();
    }, [])
  );

  const fetchCoreWorkspaceAssets = async () => {
    setIsLoading(true);
    try {
      if (typeof batchApi?.getAll !== 'function' || typeof userApi?.getAll !== 'function' || typeof lessonApi?.getAll !== 'function') {
        console.warn("API Hook Error: Downstream service client packages missing target function prototypes.");
        setIsLoading(false);
        return;
      }

      // Parallel data sweeps fetching entity lookups natively
      const [batchesRes, usersRes, lessonsRes] = await Promise.all([
        ACTIVE_USER_ROLE === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll(),
        userApi.getAll(),
        ACTIVE_USER_ROLE === 'teacher' ? lessonApi.getMyLessons() : lessonApi.getAll(),
      ]);

      if (batchesRes) {
        const rawBatches = Array.isArray(batchesRes) ? batchesRes : (batchesRes.data || batchesRes.result || batchesRes.batches || []);
        setBatches(Array.isArray(rawBatches) ? rawBatches : []);
      }

      if (usersRes) {
        const rawUsers = Array.isArray(usersRes) ? usersRes : (usersRes.data || usersRes.result || usersRes.users || []);
        const verifiedArr = Array.isArray(rawUsers) ? rawUsers : [];
        const filtered = verifiedArr.filter((u: any) => u && u.role === 'student' && !u.isDeleted);
        setStudentsFeed(filtered);
      }

      if (lessonsRes) {
        const rawLessons = Array.isArray(lessonsRes) ? lessonsRes : (lessonsRes.data || lessonsRes.result || lessonsRes.lessons || []);
        setLessonsFeed(Array.isArray(rawLessons) ? rawLessons : []);
      }

      // If active mode matches basic student context, pull authenticated telemetry straight away
      if (ACTIVE_USER_ROLE === 'student') {
        const myLogs = await attendanceApi.getMyAttendance();
        if (myLogs?.success) {
          setRecords(Array.isArray(myLogs.data) ? myLogs.data : []);
          if (myLogs.summary) setSummary(myLogs.summary);
        }
      }
    } catch (err: any) {
      console.warn("System Framework Extraction Exception:", err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Endpoint Trigger: Execute dynamic batch reporting queries
  const handleFetchBatchReport = async () => {
    if (!selectedBatchId) {
      Alert.alert('Selection Required', 'Pick an active cohort target from the dropdown array prior to executing dataset filtering.');
      return;
    }
    setIsQuerying(true);
    setSummary(null);
    try {
      const res = await attendanceApi.getBatchReport(selectedBatchId);
      if (res?.success) {
        setRecords(Array.isArray(res.data) ? res.data : []);
      } else {
        Alert.alert('Query Filter Drop', res?.message || 'Storage transmission returned zero operational records.');
      }
    } catch (error: any) {
      Alert.alert('Extraction Exception', error.response?.data?.message || 'Network read calls blocked.');
    } finally {
      setIsQuerying(false);
    }
  };

  // Endpoint Trigger: Run student specific pipeline checks
  const handleFetchStudentSpecific = async () => {
    if (!queryStudentId) {
      Alert.alert('Selection Required', 'Select a target student entity ID to extract specific instructional log matrices.');
      return;
    }
    setIsQuerying(true);
    setRecords([]);
    try {
      const res = await attendanceApi.getStudentAttendance(queryStudentId);
      if (res?.success) {
        setRecords(Array.isArray(res.data) ? res.data : []);
        if (res.summary) setSummary(res.summary);
      } else {
        Alert.alert('Query Filter Drop', res?.message || 'Storage read action refused.');
      }
    } catch (error: any) {
      Alert.alert('Extraction Exception', error.response?.data?.message || 'Transaction drop recorded.');
    } finally {
      setIsQuerying(false);
    }
  };

  // Navigate to single-page roster view mapping individual/bulk entries
  const handleTriggerLessonRegister = () => {
    if (!selectedLessonId) {
      Alert.alert('Selection Constraints', 'Select an instructional Lesson block from the picker array to launch live tracking rosters.');
      return;
    }
    navigation.navigate('LessonAttendanceRegister', { lessonId: selectedLessonId });
  };

  const renderAttendanceRow = ({ item }: { item: AttendanceRecord }) => {
    if (!item) return null;
    const stuObj = typeof item.studentId === 'object' && item.studentId ? item.studentId : null;
    const studentNameText = stuObj ? `${stuObj.firstName || ''} ${stuObj.lastName || ''}`.trim() : 'Unmapped Entity';

    let statusColor = '#3B82F6';
    if (item.status === 'present') statusColor = '#10B981';
    if (item.status === 'absent') statusColor = '#EF4444';
    if (item.status === 'late') statusColor = '#F59E0B';

    let dateStr = 'N/A';
    if (typeof item.date === 'string') dateStr = item.date.split('T')[0];

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{studentNameText}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={[styles.infoText, { color: theme.subText, marginBottom: 4 }]}>Lesson: {typeof item.lessonId === 'object' ? item.lessonId?.title || 'Untitled' : item.lessonId}</Text>
        <Text style={[styles.infoText, { color: theme.subText }]}>Date: {dateStr} | Remarks: {item.remarks || 'None mapped'}</Text>
      </View>
    );
  };

  const safeBatchesArr = Array.isArray(batches) ? batches : [];
  const safeStudentsArr = Array.isArray(studentsFeed) ? studentsFeed : [];
  const safeLessonsArr = Array.isArray(lessonsFeed) ? lessonsFeed : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        
        {/* TOP CONTROL FORM ENGINE */}
        {ACTIVE_USER_ROLE !== 'student' ? (
          <View style={[styles.queryFormBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            
            <Text style={[styles.sectionHeading, { color: theme.primary, marginTop: 0 }]}>1. Interactive Lesson Register Selection</Text>
            <View style={styles.row}>
              <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, flex: 0.65 }]}>
                <Picker selectedValue={selectedLessonId} onValueChange={(v) => setSelectedLessonId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                  <Picker.Item label="-- Select Lesson Block --" value="" color={theme.subText} />
                  {safeLessonsArr.map(l => (
                    <Picker.Item key={l._id} label={l?.title ? `${l.title}` : 'Untitled Task'} value={l._id} />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity onPress={handleTriggerLessonRegister} style={[styles.smallBtn, { backgroundColor: theme.primary, flex: 0.3 }]}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Launch Tool</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionHeading, { color: theme.primary }]}>2. Cohort Matrix Summary</Text>
            <View style={styles.row}>
              <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, flex: 0.65 }]}>
                <Picker selectedValue={selectedBatchId} onValueChange={(v) => setSelectedBatchId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                  <Picker.Item label="-- Select Cohort Group --" value="" color={theme.subText} />
                  {safeBatchesArr.map(b => <Picker.Item key={b._id} label={b?.name || 'Unnamed'} value={b._id} />)}
                </Picker>
              </View>
              <TouchableOpacity onPress={handleFetchBatchReport} disabled={isQuerying} style={[styles.smallBtn, { backgroundColor: theme.primary, flex: 0.3 }]}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Query Batch</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionHeading, { color: theme.primary }]}>3. Isolated Student Auditing</Text>
            <View style={styles.row}>
              <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, flex: 0.65 }]}>
                <Picker selectedValue={queryStudentId} onValueChange={(v) => setQueryStudentId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                  <Picker.Item label="-- Choose Entity Target --" value="" color={theme.subText} />
                  {safeStudentsArr.map(stu => <Picker.Item key={stu._id} label={stu?.firstName ? `${stu.firstName} ${stu.lastName}` : 'Unnamed Target'} value={stu._id} />)}
                </Picker>
              </View>
              <TouchableOpacity onPress={handleFetchStudentSpecific} disabled={isQuerying} style={[styles.smallBtn, { backgroundColor: theme.primary, flex: 0.3 }]}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Query Entity</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* METRICS PLATFORM GATEWAY BANNER */}
        {summary ? (
          <View style={[styles.summaryBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{summary.total || 0}</Text>
              <Text style={{ fontSize: 11, color: theme.subText }}>Total Logs</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#10B981' }}>{summary.present || 0}</Text>
              <Text style={{ fontSize: 11, color: theme.subText }}>Present</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#EF4444' }}>{summary.absent || 0}</Text>
              <Text style={{ fontSize: 11, color: theme.subText }}>Absent</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.primary }}>{summary.percentage || '0%'}</Text>
              <Text style={{ fontSize: 11, color: theme.subText }}>Success Gate</Text>
            </View>
          </View>
        ) : null}

        {/* LIST BUFFER ENGINE */}
        <View style={{ flex: 1 }}>
          <Text style={[styles.listHeader, { color: theme.text }]}>
            {ACTIVE_USER_ROLE === 'student' ? 'My Authenticated Logs' : `Extracted Operations Feed (${records.length})`}
          </Text>
          
          {isLoading || isQuerying ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={records}
              keyExtractor={(item) => item ? item._id : Math.random().toString()}
              renderItem={renderAttendanceRow}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              ListEmptyComponent={<Text style={{ textAlign: 'center', fontSize: 13, color: theme.subText, marginTop: 40 }}>No log entries currently discovered within selected structural ranges.</Text>}
            />
          )}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  queryFormBox: { padding: 14, margin: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  sectionHeading: { fontSize: 13, fontWeight: 'bold', marginBottom: 6, marginTop: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerWrapper: { height: 42, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },
  smallBtn: { height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  summaryBanner: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, marginHorizontal: 16, marginBottom: 8, borderRadius: 8, borderWidth: 1 },
  listHeader: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 16, marginBottom: 8 },
  card: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  infoText: { fontSize: 12 },
});

export default AttendanceScreen;
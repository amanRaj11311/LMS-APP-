import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { attendanceApi, AttendanceRecord, BulkAttendanceItem } from '../../api/attendanceApi';
import { userApi, UserAccount } from '../../api/userApi';

const LessonAttendanceRegisterScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { theme } = useTheme();
  const lessonId = route.params?.lessonId || '';

  const [studentsFeed, setStudentsFeed] = useState<UserAccount[]>([]);
  const [existingLogs, setExistingLogs] = useState<AttendanceRecord[]>([]);
  const [statusBuffers, setStatusBuffers] = useState<{ [key: string]: string }>({});
  const [remarksBuffers, setRemarksBuffers] = useState<{ [key: string]: string }>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchClassRegisterAssets();
  }, [lessonId]);

  const fetchClassRegisterAssets = async () => {
    setIsLoading(true);
    try {
      const [logsRes, usersRes] = await Promise.all([
        attendanceApi.getByLesson(lessonId),
        userApi.getAll(),
      ]);

      if (logsRes?.success) {
        const rawArray = Array.isArray(logsRes.data) ? logsRes.data : [];
        setExistingLogs(rawArray);
        const currStatusMap: any = {};
        rawArray.forEach((r: any) => {
          const sid = typeof r.studentId === 'object' ? r.studentId._id : r.studentId;
          currStatusMap[sid] = r.status;
        });
        setStatusBuffers(currStatusMap);
      }

      if (usersRes) {
        const allUsers = Array.isArray(usersRes) ? usersRes : (usersRes.data || []);
        const filtered = allUsers.filter((u: any) => u.role === 'student' && !u.isDeleted);
        setStudentsFeed(filtered);
        
        // Default state: present mark karke rakho agar pehle se record nahi hai
        setStatusBuffers(prev => {
           const updated = {...prev};
           filtered.forEach(s => { if(!updated[s._id]) updated[s._id] = 'present'; });
           return updated;
        });
      }
    } catch (error) {
      console.warn(error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🌟 TRUE BULK ACTION: Ek click mein sabka status badlo
  const markAllAs = (status: 'present' | 'absent') => {
    const updatedStatus: any = {};
    studentsFeed.forEach(s => {
      updatedStatus[s._id] = status;
    });
    setStatusBuffers(updatedStatus);
  };

  const handleCommitBulk = async () => {
    const records: BulkAttendanceItem[] = studentsFeed.map(s => ({
      studentId: s._id,
      status: (statusBuffers[s._id] as any) || 'present',
      remarks: remarksBuffers[s._id]
    }));

    setIsSubmitting(true);
    try {
      const res = await attendanceApi.markBulk(lessonId, records);
      if (res.success) {
        Alert.alert('Success', 'Attendance mark successfuly!');
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Error', 'Bulk update fail ho gaya');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: UserAccount }) => {
    const currentStatus = statusBuffers[item._id] || 'present';
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.name, { color: theme.text }]}>{item.firstName} {item.lastName}</Text>
        <View style={styles.btnRow}>
          {['present', 'absent', 'late'].map(s => (
            <TouchableOpacity 
              key={s}
              onPress={() => setStatusBuffers(prev => ({ ...prev, [item._id]: s }))}
              style={[styles.statusBtn, { 
                backgroundColor: currentStatus === s ? (s === 'present' ? '#10B981' : s === 'absent' ? '#EF4444' : '#F59E0B') : theme.background,
                borderColor: theme.border
              }]}
            >
              <Text style={{ color: currentStatus === s ? '#FFF' : theme.subText, fontSize: 10, fontWeight: 'bold' }}>{s.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Class Register</Text>
        
        {/* 🌟 QUICK BULK ACTIONS */}
        <View style={styles.quickActions}>
          <TouchableOpacity onPress={() => markAllAs('present')} style={styles.quickBtn}>
            <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 12 }}>ALL PRESENT</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => markAllAs('absent')} style={[styles.quickBtn, { marginLeft: 10 }]}>
            <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>ALL ABSENT</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList 
        data={studentsFeed}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 16 }}
      />

      <TouchableOpacity 
        style={[styles.mainCommit, { backgroundColor: theme.primary }]}
        onPress={handleCommitBulk}
        disabled={isSubmitting}
      >
        {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.commitText}>COMMIT ATTENDANCE</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold' },
  quickActions: { flexDirection: 'row' },
  quickBtn: { padding: 6, borderWidth: 1, borderRadius: 6, borderColor: '#DDD' },
  card: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', flex: 1 },
  btnRow: { flexDirection: 'row' },
  statusBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, marginLeft: 4 },
  mainCommit: { margin: 16, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  commitText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});

export default LessonAttendanceRegisterScreen;
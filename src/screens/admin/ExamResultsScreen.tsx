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
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { examApi, Result, BulkResultItem } from '../../api/examApi';
import { userApi, UserAccount } from '../../api/userApi';

const ExamResultsScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { theme } = useTheme();
  
  // Extract operational reference properties mapped down from primary parent views
  const { examId, examTitle, batchId, subjectId, passingMarks, totalMarks } = route.params || {};

  const [results, setResults] = useState<Result[]>([]);
  const [students, setStudents] = useState<UserAccount[]>([]);
  const [summary, setSummary] = useState<any>({ total: 0, passed: 0, failed: 0, passRate: "0%" });

  // Bulk memory array maintaining raw state bindings prior to broadcast executions
  const [bulkScoresBuffers, setBulkScoresBuffers] = useState<{ [key: string]: string }>({});
  const [bulkRemarksBuffers, setBulkRemarksBuffers] = useState<{ [key: string]: string }>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!examId) {
      Alert.alert('System Binding Error', 'Downstream overlay parameters missing primary identifier tracking links.');
      navigation.goBack();
      return;
    }
    fetchScoreboardDependencies();
  }, [examId]);

  const fetchScoreboardDependencies = async () => {
    setIsLoading(true);
    try {
      const [resultsRes, usersRes] = await Promise.all([
        examApi.getResultsByExam(examId),
        userApi.getAll(),
      ]);

      if (resultsRes?.success) {
        const rawArray = Array.isArray(resultsRes.data) ? resultsRes.data : [];
        setResults(rawArray);
        setSummary(resultsRes.summary || { total: 0, passed: 0, failed: 0, passRate: "0%" });

        // Pre-initialize buffer keys caching currently stored parameter models natively
        const marksMap: { [key: string]: string } = {};
        const remarksMap: { [key: string]: string } = {};
        rawArray.forEach((r: Result) => {
          const studentGuid = typeof r.studentId === 'object' && r.studentId ? r.studentId._id : r.studentId;
          if (studentGuid) {
            marksMap[studentGuid] = r.marksObtained !== undefined ? r.marksObtained.toString() : '';
            remarksMap[studentGuid] = r.remarks || '';
          }
        });
        setBulkScoresBuffers(marksMap);
        setBulkRemarksBuffers(remarksMap);
      }

      if (usersRes) {
        const rawUsers = Array.isArray(usersRes) ? usersRes : (usersRes.data || usersRes.result || usersRes.users || []);
        const verifiedUsers = Array.isArray(rawUsers) ? rawUsers : [];
        // Extract pure class students matching target application operational parameters
        const studentFeed = verifiedUsers.filter((u: any) => u && u.role === 'student' && !u.isDeleted);
        setStudents(studentFeed);
      }
    } catch (error: any) {
      console.warn("Scoreboard Loading Exception:", error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSingleScore = async (studentIdGuid: string) => {
    const rawScore = bulkScoresBuffers[studentIdGuid] || '';
    const parsedScore = parseFloat(rawScore.trim());

    if (isNaN(parsedScore)) {
      Alert.alert('Validation Error', 'Provide explicit numeric points assignment values.');
      return;
    }

    if (parsedScore > (totalMarks || 100)) {
      Alert.alert('Threshold Validation', `Points assignment parameters cannot exceed base assessment configurations (${totalMarks || 100}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate dynamic evaluation tags tracking basic passing logic metrics
      let dynamicGrade = 'B';
      const percentage = (parsedScore / (totalMarks || 100)) * 100;
      if (percentage >= 90) dynamicGrade = 'A+';
      else if (percentage >= 80) dynamicGrade = 'A';
      else if (percentage >= 70) dynamicGrade = 'B+';
      else if (parsedScore < (passingMarks || 33)) dynamicGrade = 'F';

      const res = await examApi.createResult({
        examId,
        studentId: studentIdGuid,
        batchId: batchId || 'unassigned',
        subjectId: subjectId || 'unassigned',
        marksObtained: parsedScore,
        grade: dynamicGrade,
        remarks: bulkRemarksBuffers[studentIdGuid]?.trim() || undefined,
      });

      if (res?.success) {
        Alert.alert('Transaction Complete', 'Scoreboard row stamped smoothly.');
        fetchScoreboardDependencies();
      } else {
        Alert.alert('Action Refused', res?.message || 'Database constraints blocked updates.');
      }
    } catch (err: any) {
      Alert.alert('Update Exception', err.response?.data?.message || 'Synchronization transaction dropped.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteBulkBroadcast = async () => {
    const outputPayloads: BulkResultItem[] = [];

    students.forEach((stu) => {
      const rawScore = bulkScoresBuffers[stu._id] || '';
      const parsed = parseFloat(rawScore.trim());
      if (!isNaN(parsed) && parsed <= (totalMarks || 100)) {
        let dynamicGrade = 'B';
        const percent = (parsed / (totalMarks || 100)) * 100;
        if (percent >= 90) dynamicGrade = 'A+';
        else if (percent >= 80) dynamicGrade = 'A';
        else if (parsed < (passingMarks || 33)) dynamicGrade = 'F';

        outputPayloads.push({
          studentId: stu._id,
          marksObtained: parsed,
          grade: dynamicGrade,
          remarks: bulkRemarksBuffers[stu._id]?.trim() || undefined,
        });
      }
    });

    if (outputPayloads.length === 0) {
      Alert.alert('Empty Buffer Payload', 'Populate valid marks models across available items prior to initiating single-channel bulk broadcast sweeps.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await examApi.createBulkResults(examId, outputPayloads);
      if (res?.success) {
        Alert.alert('Bulk Synchronization Complete', `${outputPayloads.length} student scores broadcasted down successfully.`);
        fetchScoreboardDependencies();
      } else {
        Alert.alert('Bulk Drop', res?.message || 'Transaction rejected.');
      }
    } catch (error: any) {
      Alert.alert('Synchronization Exception', error.response?.data?.message || 'Network update blocks failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStudentScoreboardRow = ({ item }: { item: UserAccount }) => {
    if (!item) return null;
    
    // Determine existing output records mapping specific current properties
    const existingObj = results.find(r => {
      const g = typeof r.studentId === 'object' && r.studentId ? r.studentId._id : r.studentId;
      return g === item._id;
    });

    const isCleared = existingObj?.isPassed || false;
    const currentScoreVal = bulkScoresBuffers[item._id] !== undefined ? bulkScoresBuffers[item._id] : '';
    const currentRemarkVal = bulkRemarksBuffers[item._id] !== undefined ? bulkRemarksBuffers[item._id] : '';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.studentNameText, { color: theme.text }]} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
          
          {existingObj ? (
            <View style={[styles.statusBadge, { backgroundColor: isCleared ? '#10B981' : '#EF4444' }]}>
              <Text style={styles.badgeText}>{isCleared ? 'PASSED' : 'FAILED'}</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 11, color: theme.subText, fontWeight: 'bold' }}>UNGRADED</Text>
          )}
        </View>

        <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 8 }}>{item.email}</Text>

        <View style={styles.inputsGrid}>
          <View style={{ flex: 0.45 }}>
            <Text style={{ fontSize: 11, color: theme.text, fontWeight: 'bold', marginBottom: 4 }}>Score Points</Text>
            <TextInput 
              style={[styles.inputField, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
              placeholder={`Max: ${totalMarks || 100}`} 
              placeholderTextColor={theme.subText}
              keyboardType="numeric"
              value={currentScoreVal}
              onChangeText={(text) => setBulkScoresBuffers(prev => ({ ...prev, [item._id]: text }))}
            />
          </View>

          <View style={{ flex: 0.5 }}>
            <Text style={{ fontSize: 11, color: theme.text, fontWeight: 'bold', marginBottom: 4 }}>Remarks Tracking</Text>
            <TextInput 
              style={[styles.inputField, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
              placeholder="Feedback..." 
              placeholderTextColor={theme.subText}
              value={currentRemarkVal}
              onChangeText={(text) => setBulkRemarksBuffers(prev => ({ ...prev, [item._id]: text }))}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
          <TouchableOpacity 
            onPress={() => handleUpdateSingleScore(item._id)} 
            style={[styles.singleCommitBtn, { backgroundColor: theme.surface === '#FFFFFF' ? '#E0F2FE' : '#0369A1' }]}
          >
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 11 }}>{existingObj ? 'Update Row' : 'Commit Single'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const safeStudentsFeed = Array.isArray(students) ? students : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        
        {/* TOP COMPONENT CONSOLE HEADER */}
        <View style={styles.consoleHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>← Back to Layouts</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.consoleTitle, { color: theme.text }]} numberOfLines={1}>{examTitle || 'Assessment Results Console'}</Text>
            <Text style={{ fontSize: 12, color: theme.subText }}>Passing Threshold Gate: {passingMarks || 33} / {totalMarks || 100}</Text>
          </View>
        </View>

        {/* ANALYTIC STATISTICS BANNER */}
        <View style={[styles.bannerBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.metricBlock}>
            <Text style={[styles.metricVal, { color: theme.primary }]}>{summary.total || 0}</Text>
            <Text style={[styles.metricLabel, { color: theme.subText }]}>Graded Rows</Text>
          </View>
          <View style={styles.metricBlock}>
            <Text style={[styles.metricVal, { color: '#10B981' }]}>{summary.passed || 0}</Text>
            <Text style={[styles.metricLabel, { color: theme.subText }]}>Passed</Text>
          </View>
          <View style={styles.metricBlock}>
            <Text style={[styles.metricVal, { color: '#EF4444' }]}>{summary.failed || 0}</Text>
            <Text style={[styles.metricLabel, { color: theme.subText }]}>Failed</Text>
          </View>
          <View style={styles.metricBlock}>
            <Text style={[styles.metricVal, { color: theme.text }]}>{summary.passRate || '0%'}</Text>
            <Text style={[styles.metricLabel, { color: theme.subText }]}>Success Rate</Text>
          </View>
        </View>

        {/* BULK ACTION COMMIT BUTTON TRIGGER */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <TouchableOpacity 
            style={[styles.bulkButton, { backgroundColor: theme.primary }]}
            onPress={handleExecuteBulkBroadcast}
            disabled={isSubmitting || safeStudentsFeed.length === 0}
          >
            {isSubmitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>Synchronize Bulk Modifications ({safeStudentsFeed.length} Items)</Text>}
          </TouchableOpacity>
        </View>

        {/* CENTRAL FEED FEED ENGINE */}
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={safeStudentsFeed}
            keyExtractor={(item) => item ? item._id : Math.random().toString()}
            renderItem={renderStudentScoreboardRow}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            ListEmptyComponent={<Text style={{ textAlign: 'center', fontSize: 13, color: theme.subText, marginTop: 40 }}>No primary student entities discovered matching active cohorts.</Text>}
          />
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  consoleHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#DDD' },
  consoleTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  bannerBox: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, margin: 16, borderRadius: 10, borderWidth: 1 },
  metricBlock: { alignItems: 'center' },
  metricVal: { fontSize: 18, fontWeight: 'bold' },
  metricLabel: { fontSize: 11, marginTop: 2 },
  bulkButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  studentNameText: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  inputsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  inputField: { height: 38, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, fontSize: 13 },
  singleCommitBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 0.5, borderColor: '#0288D1' },
});

export default ExamResultsScreen;
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Linking,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { assignmentApi } from '../../api/assignmentApi';

const AssignmentSubmissionsScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { theme } = useTheme();
  
  // Passed from previous screen
  const { assignmentId, assignmentTitle, totalMarks } = route.params;

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Grading State
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [marksToGive, setMarksToGive] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await assignmentApi.getSubmissionsByAssignment(assignmentId);
      if (res?.success) {
        setSubmissions(res.data || []);
      }
    } catch (error) {
      Alert.alert("Error", "Could not load student submissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitGrade = async (subId: string) => {
    const marks = parseInt(marksToGive, 10);
    if (isNaN(marks) || marks < 0 || marks > totalMarks) {
      Alert.alert("Invalid Score", `Marks must be between 0 and ${totalMarks}.`);
      return;
    }

    setIsSubmittingGrade(true);
    try {
      const res = await assignmentApi.gradeSubmission(subId, {
        marksObtained: marks,
        feedback: feedbackText.trim(),
      });

      if (res?.success) {
        Alert.alert("Graded", "Student has been graded successfully.");
        setGradingId(null);
        setMarksToGive('');
        setFeedbackText('');
        fetchSubmissions(); // Refresh the list
      }
    } catch (error: any) {
      Alert.alert("Grading Failed", error.response?.data?.message || "Network issue.");
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const renderSubmissionCard = ({ item }: { item: any }) => {
    const isGraded = item.status === 'graded';
    const studentName = item.studentId ? `${item.studentId.firstName} ${item.studentId.lastName}` : 'Unknown Student';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.studentName, { color: theme.text }]}>{studentName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isGraded ? '#10B981' : '#F59E0B' }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={[styles.infoText, { color: theme.subText, marginBottom: 8 }]}>Submitted on: {new Date(item.submittedAt || item.createdAt).toLocaleDateString()}</Text>

        <View style={styles.contentBox}>
          <Text style={[styles.answerText, { color: theme.text }]}>{item.content || 'No text content provided.'}</Text>
        </View>

        {item.attachments && item.attachments.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text, marginBottom: 4 }}>Attached Files:</Text>
            {item.attachments.map((url: string, idx: number) => (
              <TouchableOpacity key={idx} onPress={() => Linking.openURL(url)} style={{ marginBottom: 4 }}>
                <Text style={{ color: '#3B82F6', fontSize: 12, textDecorationLine: 'underline' }}>File {idx + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.gradingSection}>
          {isGraded ? (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>Awarded Score: {item.marksObtained} / {totalMarks}</Text>
              {item.feedback ? <Text style={{ color: theme.subText, fontSize: 13, marginTop: 4 }}>Feedback: {item.feedback}</Text> : null}
            </View>
          ) : (
            <View style={{ marginTop: 12, borderTopWidth: 0.5, borderTopColor: theme.border, paddingTop: 12 }}>
              {gradingId === item._id ? (
                <View>
                  <Text style={[styles.label, { color: theme.text }]}>Enter Score (Out of {totalMarks})</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                    placeholder="e.g., 85" 
                    placeholderTextColor={theme.subText} 
                    keyboardType="numeric" 
                    value={marksToGive} 
                    onChangeText={setMarksToGive} 
                  />
                  <Text style={[styles.label, { color: theme.text }]}>Feedback (Optional)</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                    placeholder="Good work..." 
                    placeholderTextColor={theme.subText} 
                    value={feedbackText} 
                    onChangeText={setFeedbackText} 
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                    <TouchableOpacity onPress={() => setGradingId(null)} style={{ marginRight: 16, justifyContent: 'center' }}>
                      <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => submitGrade(item._id)} 
                      style={{ backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                    >
                      {isSubmittingGrade ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Submit Grade</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setGradingId(item._id); setMarksToGive(''); setFeedbackText(''); }} style={{ alignSelf: 'flex-end' }}>
                  <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13, borderWidth: 1, borderColor: theme.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>Evaluate & Grade</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Text style={{ color: theme.primary, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ marginLeft: 8 }}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{assignmentTitle}</Text>
          <Text style={{ color: theme.subText, fontSize: 12 }}>Submissions ({submissions.length})</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item._id}
          renderItem={renderSubmissionCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: theme.subText }}>No students have submitted this assignment yet.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  title: { fontSize: 16, fontWeight: 'bold', width: '80%' },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 16, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  studentName: { fontSize: 15, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  infoText: { fontSize: 12 },
  contentBox: { padding: 10, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 6, borderWidth: 0.5, borderColor: '#EEE' },
  answerText: { fontSize: 13, lineHeight: 18 },
  gradingSection: { marginTop: 4 },
  label: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  input: { height: 40, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, marginBottom: 10, fontSize: 13 },
});

export default AssignmentSubmissionsScreen;
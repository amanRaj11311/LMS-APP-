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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DocumentPicker from 'react-native-document-picker'; 

import { useTheme } from '../../theme/ThemeContext';
import { assignmentApi, Assignment, CreateAssignmentPayload } from '../../api/assignmentApi';
import { subjectApi, Subject } from '../../api/subjectApi';
import { batchApi, Batch } from '../../api/batchApi';

// 🌟 Added 'navigation' prop here to allow moving to the Submissions screen
const AssignmentScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();

  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [dueDateText, setDueDateText] = useState<string>('2026-05-15');
  const [totalMarksText, setTotalMarksText] = useState<string>('100');
  const [isActive, setIsActive] = useState<boolean>(true);
  
  const [teacherFiles, setTeacherFiles] = useState<any[]>([]);
  const [studentFiles, setStudentFiles] = useState<any[]>([]);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [studentContent, setStudentContent] = useState<string>('');

  const fetchSmartDependencies = useCallback(async (roleOverride?: 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    try {
      const targetRole = roleOverride || currentUserRole;

      const assignRes = targetRole === 'student' 
        ? await assignmentApi.getMyAssignments() 
        : await assignmentApi.getAll();
      
      if (assignRes?.success) {
        setAssignments(assignRes.data || assignRes.result || assignRes.assignments || []);
      } else {
        setAssignments([]);
      }

      if (targetRole !== 'student') {
        const [subRes, batRes] = await Promise.all([
          subjectApi.getAll(),
          targetRole === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll()
        ]);

        if (subRes?.success) setAvailableSubjects(subRes.data || subRes.result || subRes.subjects || []);
        if (batRes?.success) setAvailableBatches(batRes.data || batRes.result || batRes.batches || []);
      }
    } catch (error: any) {
      console.warn("Session Evaluation Fallback Interrupted:", error?.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRole]);

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
          if (isMounted) await fetchSmartDependencies(evaluatedRole);
        } catch (err) {
          console.warn("Storage runtime error:", err);
          if (isMounted) setIsLoading(false);
        }
      };

      verifyAndInitializeRuntimeState();
      return () => { isMounted = false; };
    }, [fetchSmartDependencies])
  );

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    await fetchSmartDependencies();
    setIsRefreshing(false);
  };

  const resetFormState = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setSelectedSubjectId('');
    setSelectedBatchId('');
    setDueDateText('2026-05-15');
    setTotalMarksText('100');
    setIsActive(true);
    setTeacherFiles([]); 
    Keyboard.dismiss();
  };

  const handlePickTeacherFiles = async () => {
    try {
      const res = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
      });
      if (res.length > 5) {
        Alert.alert("Limit Exceeded", "You can only upload up to 5 files.");
        setTeacherFiles(res.slice(0, 5));
      } else {
        setTeacherFiles(res);
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) Alert.alert("Error", "Failed to pick documents");
    }
  };

  const handlePickStudentFiles = async () => {
    try {
      const res = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
      });
      if (res.length > 10) {
        Alert.alert("Limit Exceeded", "You can only upload up to 10 files.");
        setStudentFiles(res.slice(0, 10));
      } else {
        setStudentFiles(res);
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) Alert.alert("Error", "Failed to pick documents");
    }
  };

  const handleTriggerEdit = (item: Assignment) => {
    setEditingId(item._id);
    setTitle(item.title);
    setDescription(item.description);
    setSelectedSubjectId(typeof item.subjectId === 'object' && item.subjectId ? item.subjectId._id : item.subjectId);
    setSelectedBatchId(typeof item.batchId === 'object' && item.batchId ? item.batchId._id : item.batchId);
    setDueDateText(item.dueDate.split('T')[0]);
    setTotalMarksText(item.totalMarks.toString());
    setIsActive(item.isActive !== undefined ? item.isActive : true);
    setTeacherFiles([]); 
  };

  const handleSaveOrUpdate = async () => {
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    const cleanDue = dueDateText.trim();
    const parsedMarks = parseInt(totalMarksText.trim(), 10);

    if (!cleanTitle || !cleanDesc || !selectedSubjectId || !selectedBatchId || !cleanDue || isNaN(parsedMarks)) {
      Alert.alert('Missing Info', 'Please fill all Required Fields');
      return;
    }

    setIsSubmitting(true);
    let finalAttachmentUrls: string[] = [];

    try {
      if (teacherFiles.length > 0) {
        const formData = new FormData();
        teacherFiles.forEach((file) => {
          formData.append('files', { 
            uri: file.uri,
            type: file.type || 'application/pdf',
            name: file.name,
          } as any);
        });

        const uploadRes = await assignmentApi.uploadAssignmentFiles(formData);
        if (uploadRes?.success) {
          finalAttachmentUrls = uploadRes.data?.fileUrls || uploadRes.urls || [];
        } else {
          Alert.alert("Upload Warning", "Files failed to upload, submitting text only.");
        }
      }

      const payload: CreateAssignmentPayload = {
        title: cleanTitle,
        description: cleanDesc,
        subjectId: selectedSubjectId,
        batchId: selectedBatchId,
        dueDate: new Date(cleanDue).toISOString(),
        totalMarks: parsedMarks,
        attachments: finalAttachmentUrls.length > 0 ? finalAttachmentUrls : undefined,
      };

      let response;
      if (editingId) {
        response = await assignmentApi.update(editingId, { ...payload, isActive });
      } else {
        response = await assignmentApi.create(payload);
      }

      if (response?.success) {
        Alert.alert('Success', editingId ? 'Assignment updated.' : 'Assignment published successfully.');
        resetFormState();
        fetchSmartDependencies();
      } else {
        Alert.alert('Restricted Access', response?.message || 'Failed to save.');
      }
    } catch (error: any) {
      Alert.alert('Action Blocked', error.response?.data?.message || 'Network update connectivity failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentSubmission = async (assignmentId: string) => {
    if (!studentContent.trim() && studentFiles.length === 0) {
      Alert.alert('Empty Submission', 'Please write an answer or attach a file.');
      return;
    }

    setIsSubmitting(true);
    let finalSubmissionUrls: string[] = [];

    try {
      if (studentFiles.length > 0) {
        const formData = new FormData();
        studentFiles.forEach((file) => {
          formData.append('files', { 
            uri: file.uri,
            type: file.type || 'application/pdf',
            name: file.name,
          } as any);
        });

        const uploadRes = await assignmentApi.uploadSubmissionFiles(formData);
        if (uploadRes?.success) {
          finalSubmissionUrls = uploadRes.data?.fileUrls || uploadRes.urls || [];
        } else {
          Alert.alert("Upload Warning", "Files failed to upload.");
        }
      }

      const response = await assignmentApi.submitAssignment({
        assignmentId,
        content: studentContent.trim(),
        attachments: finalSubmissionUrls.length > 0 ? finalSubmissionUrls : undefined,
      });

      if (response?.success) {
        Alert.alert('Done!', response.message || 'Homework submitted successfully.');
        setSelectedAssignmentId(null);
        setStudentContent('');
        setStudentFiles([]);
        fetchSmartDependencies();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirm Wipe',
      'Are you sure you want to delete this assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await assignmentApi.delete(id);
              if (response?.success) {
                if (editingId === id) resetFormState();
                fetchSmartDependencies();
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete record.');
            }
          }
        }
      ]
    );
  };

  // =================================================================
  // 🌟 THE UPDATED CARD RENDERER (Includes View Submissions Button)
  // =================================================================
  // =================================================================
  // 🌟 THE UPDATED CARD RENDERER (Includes Student Feedback View)
  // =================================================================
  const renderAssignmentCard = ({ item }: { item: Assignment }) => {
    if (!item) return null;

    const uploaderId = typeof item.teacherId === 'object' ? item.teacherId?._id : (item.teacherId || item.createdBy);
    const canManage = currentUserRole === 'admin' || (currentUserRole === 'teacher' && uploaderId === currentUserId);
    
    const subjectName = typeof item.subjectId === 'object' && item.subjectId ? item.subjectId.name : 'Unknown Subject';
    const batchName = typeof item.batchId === 'object' && item.batchId ? item.batchId.name : 'Unknown Group';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{batchName}</Text>
          </View>
        </View>

        <Text style={[styles.descText, { color: theme.text }]}>{item.description}</Text>

        <View style={styles.infoGrid}>
          <Text style={[styles.infoText, { color: theme.subText }]}>Topic: {subjectName}</Text>
          <Text style={[styles.infoText, { color: theme.subText }]}>Total Marks: {item.totalMarks}</Text>
          <Text style={[styles.infoText, { color: theme.subText }]}>Due Date: {item.dueDate.split('T')[0]}</Text>
        </View>

        {currentUserRole !== 'student' ? (
          <View style={styles.actionRow}>
            {canManage && (
              <>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('AssignmentSubmissions', { 
                    assignmentId: item._id, 
                    assignmentTitle: item.title, 
                    totalMarks: item.totalMarks 
                  })} 
                  style={[styles.actionButton, { borderColor: '#10B981', borderWidth: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
                >
                  <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 13 }}>View Submissions</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={[styles.actionButton, { borderWidth: 1, borderColor: theme.border }]}>
                  <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleDelete(item._id)} style={[styles.actionButton, { borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.submissionContainer}>
            {item.mySubmission ? (
              // 🌟 YAHAN CHANGES HUE HAIN - Flex direction column kiya gaya hai taaki feedback niche aa sake
              <View style={[styles.statusBanner, { borderColor: theme.border, flexDirection: 'column' }]}>
                
                {/* Status aur Score ki Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[styles.statusText, { color: theme.text }]}>
                    Status: <Text style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{item.mySubmission.status}</Text>
                  </Text>
                  {item.mySubmission.marksObtained !== undefined && (
                    <Text style={[styles.statusText, { color: theme.primary, fontWeight: 'bold' }]}>
                      Score: {item.mySubmission.marksObtained} / {item.totalMarks}
                    </Text>
                  )}
                </View>

                {/* 🌟 STUDENT FEEDBACK UI */}
                {item.mySubmission.feedback ? (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
                    <Text style={{ fontSize: 13, color: theme.subText }}>
                      <Text style={{ fontWeight: 'bold', color: theme.text }}>Feedback: </Text>
                      {item.mySubmission.feedback}
                    </Text>
                  </View>
                ) : null}

              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                {selectedAssignmentId === item._id ? (
                  <View style={{ marginTop: 6 }}>
                    <TextInput
                      style={[styles.input, styles.submissionInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                      placeholder="Write your homework answer here..."
                      placeholderTextColor={theme.subText}
                      value={studentContent}
                      onChangeText={setStudentContent}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                    
                    <TouchableOpacity onPress={handlePickStudentFiles} style={styles.attachBtn}>
                      <MaterialIcons name="attach-file" size={18} color={theme.subText} />
                      <Text style={{ color: theme.subText, marginLeft: 6, fontSize: 12 }}>
                        {studentFiles.length > 0 ? `${studentFiles.length} file(s) attached` : 'Attach Documents (Max 10)'}
                      </Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                      <TouchableOpacity onPress={() => { setSelectedAssignmentId(null); setStudentContent(''); setStudentFiles([]); }} style={{ marginRight: 16 }}>
                        <Text style={{ color: '#D32F2F', fontWeight: '600' }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleStudentSubmission(item._id)} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Submit Answer</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setSelectedAssignmentId(item._id)} style={[styles.submitTriggerBtn, { borderColor: theme.primary }]}>
                    <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13 }}>Attempt Assignment</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const safeSubjects = Array.isArray(availableSubjects) ? availableSubjects : [];
  const safeBatches = Array.isArray(availableBatches) ? availableBatches : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <FlatList
        ListHeaderComponent={
          <>
            {currentUserRole !== 'student' && (
              <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.formHeaderRow}>
                  <Text style={[styles.formTitle, { color: theme.text }]}>
                    {editingId ? 'Edit Assignment' : 'Create New Homework'}
                  </Text>
                  {editingId && (
                    <TouchableOpacity onPress={resetFormState}>
                      <Text style={styles.cancelText}>Clear Array</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={[styles.label, { color: theme.text }]}>Homework Title</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="e.g. Chapter 1 Practice" placeholderTextColor={theme.subText} value={title} onChangeText={setTitle} />

                <View style={styles.row}>
                  <View style={styles.pickerContainerHalf}>
                    <Text style={[styles.label, { color: theme.text }]}>Subject</Text>
                    <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <Picker selectedValue={selectedSubjectId} onValueChange={setSelectedSubjectId} dropdownIconColor={theme.primary} style={{ color: theme.text }}>
                        <Picker.Item label="-- Subject --" value="" color={theme.subText} />
                        {safeSubjects.map(sub => <Picker.Item key={sub._id} label={sub.code || sub.name} value={sub._id} />)}
                      </Picker>
                    </View>
                  </View>
                  <View style={styles.pickerContainerHalf}>
                    <Text style={[styles.label, { color: theme.text }]}>Batch</Text>
                    <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <Picker selectedValue={selectedBatchId} onValueChange={setSelectedBatchId} dropdownIconColor={theme.primary} style={{ color: theme.text }}>
                        <Picker.Item label="-- Batch --" value="" color={theme.subText} />
                        {safeBatches.map(b => <Picker.Item key={b._id} label={b.name} value={b._id} />)}
                      </Picker>
                    </View>
                  </View>
                </View>

                <Text style={[styles.label, { color: theme.text }]}>Instructions</Text>
                <TextInput style={[styles.input, { height: 60, backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Type questions..." placeholderTextColor={theme.subText} value={description} onChangeText={setDescription} multiline />

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={[styles.label, { color: theme.text }]}>Due Date</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="2026-05-15" placeholderTextColor={theme.subText} value={dueDateText} onChangeText={setDueDateText} maxLength={10} />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={[styles.label, { color: theme.text }]}>Marks</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="100" placeholderTextColor={theme.subText} value={totalMarksText} onChangeText={setTotalMarksText} keyboardType="numeric" />
                  </View>
                </View>

                <TouchableOpacity onPress={handlePickTeacherFiles} style={[styles.attachBtn, { marginBottom: 12 }]}>
                  <MaterialIcons name="attach-file" size={18} color={theme.subText} />
                  <Text style={{ color: theme.subText, marginLeft: 6, fontSize: 12 }}>
                    {teacherFiles.length > 0 ? `${teacherFiles.length} file(s) ready to upload` : 'Attach Resource Files (Max 5)'}
                  </Text>
                </TouchableOpacity>

                {editingId && (
                  <View style={styles.switchRow}>
                    <Text style={{ color: theme.text, fontWeight: '500' }}>Active Status</Text>
                    <Switch value={isActive} onValueChange={setIsActive} thumbColor={theme.primary} />
                  </View>
                )}

                <TouchableOpacity style={[styles.mainButton, { backgroundColor: theme.primary }]} onPress={handleSaveOrUpdate} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{editingId ? 'Update' : 'Publish'}</Text>}
                </TouchableOpacity>
              </View>
            )}
            <Text style={[styles.listHeader, { color: theme.text }]}>Assigned Tasks Registry</Text>
          </>
        }
        data={assignments}
        keyExtractor={(item) => item._id}
        renderItem={renderAssignmentCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} colors={[theme.primary]} />}
        ListEmptyComponent={
          isLoading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> 
          : <Text style={[styles.emptyText, { color: theme.subText }]}>No homework items evaluated.</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  formCard: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { color: '#D32F2F', fontWeight: '600', fontSize: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  pickerContainerHalf: { width: '48%', marginBottom: 12 },
  pickerWrapper: { height: 46, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  listHeader: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  descText: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: '#DDD', paddingBottom: 8, marginBottom: 8 },
  infoText: { fontSize: 12, fontWeight: '500' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, marginTop: 4, borderTopWidth: 0.5, borderTopColor: '#EEE' },
  actionButton: { marginLeft: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  editText: { fontWeight: 'bold', fontSize: 13 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 13 },
  submissionContainer: { paddingTop: 4 },
  statusBanner: { flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.03)' },
  statusText: { fontSize: 13 },
  submissionInput: { height: 70, paddingTop: 8, marginBottom: 6 },
  submitTriggerBtn: { borderWidth: 1, borderRadius: 6, paddingVertical: 6, alignItems: 'center' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, borderWidth: 1, borderColor: '#DDD', borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.02)' },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 14 },
});

export default AssignmentScreen;
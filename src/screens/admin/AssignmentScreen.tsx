import React, { useState, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
  ActivityIndicator, Alert, Switch, Keyboard, RefreshControl, Platform, Modal, ScrollView,
  Linking // 🌟 Added Linking to open file URLs
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { pick } from '@react-native-documents/picker'; 

import { useTheme } from '../../theme/ThemeContext';
import { assignmentApi, Assignment, CreateAssignmentPayload } from '../../api/assignmentApi';
import { subjectApi, Subject } from '../../api/subjectApi';
import { batchApi, Batch } from '../../api/batchApi';
import { classApi } from '../../api/classApi'; 

const AssignmentScreen = ({ navigation }: { navigation: any }) => {
  const { theme, isDark } = useTheme(); 

  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal Visibilities
  const [isCreateModalVisible, setIsCreateModalVisible] = useState<boolean>(false);
  const [studentSubmitModalVisible, setStudentSubmitModalVisible] = useState<boolean>(false);

  // Create/Edit Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>(''); 
  const [dueDateText, setDueDateText] = useState<string>('2026-05-15');
  const [totalMarksText, setTotalMarksText] = useState<string>('100');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [teacherFiles, setTeacherFiles] = useState<any[]>([]);
  
  // 🌟 Added: Track already uploaded files when editing
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);

  // Student Submission States
  const [selectedAssignmentForSubmission, setSelectedAssignmentForSubmission] = useState<Assignment | null>(null);
  const [studentContent, setStudentContent] = useState<string>('');
  const [studentFiles, setStudentFiles] = useState<any[]>([]);

  const fetchSmartDependencies = useCallback(async (roleOverride?: 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    try {
      const targetRole = roleOverride || currentUserRole;

      const assignRes = targetRole === 'student' 
        ? await assignmentApi.getMyAssignments() 
        : await assignmentApi.getAll();
      
      setAssignments(assignRes?.data || assignRes?.result || assignRes?.assignments || []);

      if (targetRole !== 'student') {
        const [subRes, batRes, clsRes] = await Promise.allSettled([
          subjectApi.getAll(),
          targetRole === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll(),
          classApi.getAll()
        ]);

        if (subRes.status === 'fulfilled') setAvailableSubjects(subRes.value.data || []);
        if (batRes.status === 'fulfilled') setAvailableBatches(batRes.value.data || []);
        if (clsRes.status === 'fulfilled') setAvailableClasses(clsRes.value.data || []);
      }
    } catch (error: any) {
      console.log("Dependency Load Error:", error);
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
          if (isMounted) setIsLoading(false);
        }
      };

      verifyAndInitializeRuntimeState();
      return () => { isMounted = false; };
    }, [fetchSmartDependencies])
  );

  const resetCreateForm = () => {
    setEditingId(null); setTitle(''); setDescription('');
    setSelectedSubjectId(''); setSelectedBatchId(''); setSelectedClassId('');
    setDueDateText('2026-05-15'); setTotalMarksText('100'); setIsActive(true);
    setTeacherFiles([]); 
    setExistingAttachments([]); // 🌟 Reset existing files state
  };

  const resetSubmitForm = () => {
    setSelectedAssignmentForSubmission(null);
    setStudentContent('');
    setStudentFiles([]);
  };

  // --- FILE PICKERS ---
  const handlePickTeacherFiles = async () => {
    try {
      const res = await pick({ allowMultiSelection: true, type: ['*/*'] });
      const combined = [...teacherFiles, ...res];
      if (combined.length > 5) {
        Alert.alert("Limit Exceeded", "You can only upload up to 5 files.");
        setTeacherFiles(combined.slice(0, 5));
      } else {
        setTeacherFiles(combined);
      }
    } catch (err) { console.log(err); }
  };

  const handlePickStudentFiles = async () => {
    try {
      const res = await pick({ allowMultiSelection: true, type: ['*/*'] });
      const combined = [...studentFiles, ...res];
      if (combined.length > 10) {
        Alert.alert("Limit Exceeded", "You can only upload up to 10 files.");
        setStudentFiles(combined.slice(0, 10));
      } else {
        setStudentFiles(combined);
      }
    } catch (err) { console.log(err); }
  };

  // --- ACTION HANDLERS ---
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
    setExistingAttachments(item.attachments || []); // 🌟 Load previously uploaded files
    setIsCreateModalVisible(true);
  };

  const handleSaveOrUpdate = async () => {
    if (!title.trim() || !description.trim() || !selectedSubjectId || !selectedBatchId || !dueDateText.trim() || !totalMarksText.trim()) {
      return Alert.alert('Missing Info', 'Please fill all Required Fields');
    }

    setIsSubmitting(true);
    let finalAttachmentUrls: string[] = [];

    try {
      if (teacherFiles.length > 0) {
        const formData = new FormData();
        teacherFiles.forEach((file) => {
          formData.append('files', { 
            uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
            type: file.type || 'application/octet-stream',
            name: file.name,
          } as any);
        });

        const uploadRes = await assignmentApi.uploadAssignmentFiles(formData);
        finalAttachmentUrls = uploadRes?.data?.fileUrls || uploadRes?.urls || [];
      }

      // 🌟 Combine existing files and new files
      const allAttachments = [...existingAttachments, ...finalAttachmentUrls];

      const payload: CreateAssignmentPayload = {
        title: title.trim(),
        description: description.trim(),
        subjectId: selectedSubjectId,
        batchId: selectedBatchId,
        dueDate: new Date(dueDateText.trim()).toISOString(),
        totalMarks: parseInt(totalMarksText.trim(), 10),
        attachments: allAttachments.length > 0 ? allAttachments : undefined,
      };

      if (editingId) await assignmentApi.update(editingId, { ...payload, isActive });
      else await assignmentApi.create(payload);

      Alert.alert('Success', editingId ? 'Assignment updated.' : 'Assignment published successfully.');
      setIsCreateModalVisible(false);
      resetCreateForm();
      fetchSmartDependencies();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Save failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentSubmission = async () => {
    if (!selectedAssignmentForSubmission) return;
    if (!studentContent.trim() && studentFiles.length === 0) {
      return Alert.alert('Empty Submission', 'Please write an answer or attach a file.');
    }

    setIsSubmitting(true);
    let finalSubmissionUrls: string[] = [];

    try {
      if (studentFiles.length > 0) {
        const formData = new FormData();
        studentFiles.forEach((file) => {
          formData.append('files', { 
            uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
            type: file.type || 'application/octet-stream',
            name: file.name,
          } as any);
        });

        const uploadRes = await assignmentApi.uploadSubmissionFiles(formData);
        finalSubmissionUrls = uploadRes?.data?.fileUrls || uploadRes?.urls || [];
      }

      await assignmentApi.submitAssignment({
        assignmentId: selectedAssignmentForSubmission._id,
        content: studentContent.trim(),
        attachments: finalSubmissionUrls.length > 0 ? finalSubmissionUrls : undefined,
      });

      Alert.alert('Done!', 'Homework submitted successfully.');
      setStudentSubmitModalVisible(false);
      resetSubmitForm();
      fetchSmartDependencies();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Are you sure you want to delete this assignment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await assignmentApi.delete(id);
            fetchSmartDependencies();
          } catch (e) { Alert.alert("Error", "Delete failed"); }
        }
      }
    ]);
  };

  // --- RENDERERS ---
  const renderAssignmentCard = ({ item }: { item: Assignment }) => {
    const uploaderId = typeof item.teacherId === 'object' ? item.teacherId?._id : (item.teacherId || item.createdBy);
    const canManage = currentUserRole === 'admin' || (currentUserRole === 'teacher' && uploaderId === currentUserId);
    const subjectName = typeof item.subjectId === 'object' && item.subjectId ? item.subjectId.name : 'Subject';
    const batchName = typeof item.batchId === 'object' && item.batchId ? item.batchId.name : 'Group';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: theme.primary }]}><Text style={styles.badgeText}>{batchName}</Text></View>
        </View>
        <Text style={[styles.descText, { color: theme.text }]}>{item.description}</Text>
        
        <View style={styles.infoGrid}>
          <Text style={[styles.infoText, { color: theme.subText }]}>Topic: {subjectName}</Text>
          <Text style={[styles.infoText, { color: theme.subText }]}>Total Marks: {item.totalMarks}</Text>
          <Text style={[styles.infoText, { color: theme.subText }]}>Due: {item.dueDate.split('T')[0]}</Text>
        </View>

        {/* 🌟 View Attachments Feature inside the card */}
        {item.attachments && item.attachments.length > 0 && (
          <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#DDD' }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text, marginBottom: 4 }}>Attached Files:</Text>
            {item.attachments.map((url, idx) => (
              <TouchableOpacity key={idx} onPress={() => Linking.openURL(url)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <MaterialIcons name="attach-file" size={14} color={theme.primary} />
                <Text style={{ color: theme.primary, fontSize: 12, marginLeft: 4 }}>View File {idx + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {currentUserRole !== 'student' ? (
          <View style={styles.actionRow}>
            {canManage && (
              <>
                <TouchableOpacity onPress={() => navigation.navigate('AssignmentSubmissions', { assignmentId: item._id, assignmentTitle: item.title, totalMarks: item.totalMarks })} style={[styles.actionButton, { borderColor: '#10B981', borderWidth: 1, backgroundColor: isDark ? 'transparent' : 'rgba(16, 185, 129, 0.1)' }]}>
                  <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 13 }}>View Submissions</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={[styles.actionButton, { borderWidth: 1, borderColor: theme.border }]}>
                  <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={[styles.actionButton, { borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: isDark ? 'transparent' : '#FEF2F2' }]}>
                  <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 8 }}>
            {item.mySubmission ? (
              <View style={[styles.statusBanner, { borderColor: theme.border, flexDirection: 'column' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: theme.text }}>Status: <Text style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{item.mySubmission.status}</Text></Text>
                  {item.mySubmission.marksObtained !== undefined && (
                    <Text style={{ fontSize: 13, color: theme.primary, fontWeight: 'bold' }}>Score: {item.mySubmission.marksObtained} / {item.totalMarks}</Text>
                  )}
                </View>
                {item.mySubmission.feedback && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border }}>
                    <Text style={{ fontSize: 13, color: theme.subText }}><Text style={{ fontWeight: 'bold', color: theme.text }}>Feedback: </Text>{item.mySubmission.feedback}</Text>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setSelectedAssignmentForSubmission(item); setStudentSubmitModalVisible(true); }} style={[styles.submitTriggerBtn, { borderColor: theme.primary }]}>
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13 }}>Attempt Assignment</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.mainTitle, { color: theme.text }]}>Assignments</Text>
        {currentUserRole !== 'student' && (
          <TouchableOpacity style={[styles.newBtn, { backgroundColor: theme.primary }]} onPress={() => { resetCreateForm(); setIsCreateModalVisible(true); }}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>+ New Assignment</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* FEED LIST */}
      {isLoading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} /> : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item._id}
          renderItem={renderAssignmentCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchSmartDependencies().finally(()=>setIsRefreshing(false)); }} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: theme.subText }}>No assignments available.</Text>}
        />
      )}

      {/* 1. CREATE/EDIT MODAL (ADMIN/TEACHER) */}
      <Modal visible={isCreateModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editingId ? 'Edit Assignment' : 'Create Assignment'}</Text>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}><MaterialIcons name="close" size={24} color={theme.text}/></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <Text style={[styles.label, { color: theme.text }]}>TITLE *</Text>
              <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]} placeholder="Chapter 5 Exercise" placeholderTextColor={theme.subText} value={title} onChangeText={setTitle} />
              
              <Text style={[styles.label, { color: theme.text }]}>DESCRIPTION *</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]} placeholder="Add instructions..." placeholderTextColor={theme.subText} value={description} onChangeText={setDescription} multiline />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: theme.text }]}>CLASS *</Text>
                  <View style={[styles.pickerWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <Picker 
                      selectedValue={selectedClassId}  
                      onValueChange={setSelectedClassId}
                      style={{ color: theme.text }} 
                      itemStyle={{ color: theme.text }} 
                      dropdownIconColor={theme.text}
                    >
                      <Picker.Item label="Select class" value="" color={theme.subText} />
                      {availableClasses.map(c => <Picker.Item key={c._id} label={c.name} value={c._id} />)}
                    </Picker>
                  </View>
                </View>
                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: theme.text }]}>BATCH *</Text>
                  <View style={[styles.pickerWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <Picker 
                      selectedValue={selectedBatchId} 
                      onValueChange={setSelectedBatchId}
                      style={{ color: theme.text }} 
                      itemStyle={{ color: theme.text }} 
                      dropdownIconColor={theme.text}
                    >
                      <Picker.Item label="Select batch" value="" color={theme.subText} />
                      {availableBatches.map(b => <Picker.Item key={b._id} label={b.name} value={b._id} />)}
                    </Picker>
                  </View>
                </View>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>SUBJECT *</Text>
              <View style={[styles.pickerWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Picker 
                  selectedValue={selectedSubjectId} 
                  onValueChange={setSelectedSubjectId}
                  style={{ color: theme.text }} 
                  itemStyle={{ color: theme.text }} 
                  dropdownIconColor={theme.text}
                >
                  <Picker.Item label="Select subject" value="" color={theme.subText} />
                  {availableSubjects.map(s => <Picker.Item key={s._id} label={s.name} value={s._id} />)}
                </Picker>
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: theme.text }]}>DUE DATE *</Text>
                  <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]} placeholder="yyyy-mm-dd" placeholderTextColor={theme.subText} value={dueDateText} onChangeText={setDueDateText} />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: theme.text }]}>TOTAL MARKS *</Text>
                  <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]} placeholder="100" placeholderTextColor={theme.subText} keyboardType="numeric" value={totalMarksText} onChangeText={setTotalMarksText} />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>ASSIGNMENT FILES</Text>
              <TouchableOpacity onPress={handlePickTeacherFiles} style={[styles.uploadBox, { borderColor: theme.primary, backgroundColor: isDark ? 'transparent' : 'rgba(0,0,0,0.01)' }]}>
                <MaterialIcons name="cloud-upload" size={30} color={theme.primary} />
                <Text style={{ color: theme.text, marginTop: 8, fontWeight: 'bold' }}>Upload assignment files</Text>
                <Text style={{ color: theme.subText, fontSize: 11 }}>Click to select (up to 5 files)</Text>
              </TouchableOpacity>
              
              {/* 🌟 Added: Display Already Existing Files when Editing */}
              {existingAttachments.map((url, i) => (
                <View key={`ext-${i}`} style={[styles.fileRow, { borderColor: theme.border }]}> 
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(url)}>
                     <Text style={{ color: theme.primary, textDecorationLine: 'underline' }} numberOfLines={1}>Existing File {i + 1}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setExistingAttachments(existingAttachments.filter((_, idx)=>idx !== i))}><Text style={{color: '#EF4444'}}>X</Text></TouchableOpacity>
                </View>
              ))}

              {teacherFiles.map((f, i) => (
                <View key={i} style={[styles.fileRow, { borderColor: theme.border }]}> 
                  <Text style={{ flex: 1, color: theme.text }} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity onPress={() => setTeacherFiles(teacherFiles.filter((_, idx)=>idx !== i))}><Text style={{color: '#EF4444'}}>X</Text></TouchableOpacity>
                </View>
              ))}

              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setIsCreateModalVisible(false)}><Text style={{ color: theme.text }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveOrUpdate} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#FFF"/> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. SUBMIT MODAL (STUDENT) */}
      <Modal visible={studentSubmitModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Submit Assignment</Text>
              <TouchableOpacity onPress={() => setStudentSubmitModalVisible(false)}><MaterialIcons name="close" size={24} color={theme.text}/></TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
                <Text style={{ color: theme.subText, fontSize: 11, fontWeight: 'bold' }}>ASSIGNMENT</Text>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold', marginVertical: 4 }}>{selectedAssignmentForSubmission?.title}</Text>
                <Text style={{ color: theme.subText, fontSize: 12 }}>Due: {selectedAssignmentForSubmission?.dueDate.split('T')[0]} • {selectedAssignmentForSubmission?.totalMarks} marks</Text>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>ANSWER / NOTES</Text>
              <TextInput 
                style={[styles.input, { height: 100, textAlignVertical: 'top', borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]} 
                placeholder="Type your answer here..." 
                placeholderTextColor={theme.subText} 
                value={studentContent} 
                onChangeText={setStudentContent} 
                multiline 
              />

              <Text style={[styles.label, { color: theme.text }]}>UPLOAD SUBMISSION FILES *</Text>
              <TouchableOpacity onPress={handlePickStudentFiles} style={[styles.uploadBox, { borderColor: theme.primary, borderStyle: 'dashed', backgroundColor: isDark ? 'transparent' : 'rgba(0,0,0,0.01)' }]}>
                <MaterialIcons name="file-upload" size={30} color={theme.primary} />
                <Text style={{ color: theme.text, marginTop: 8, fontWeight: 'bold' }}>Upload your submission</Text>
                <Text style={{ color: theme.subText, fontSize: 11 }}>Click to select (up to 10 files)</Text>
              </TouchableOpacity>
              
              {studentFiles.map((f, i) => (
                <View key={i} style={[styles.fileRow, { borderColor: theme.border }]}>
                  <Text style={{ flex: 1, color: theme.text }} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity onPress={() => setStudentFiles(studentFiles.filter((_, idx)=>idx !== i))}><Text style={{color: '#EF4444'}}>X</Text></TouchableOpacity>
                </View>
              ))}

              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setStudentSubmitModalVisible(false)}><Text style={{ color: theme.text }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleStudentSubmission} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#FFF"/> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Submit</Text>}
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
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12, marginHorizontal: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  descText: { fontSize: 14, marginBottom: 12 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: '#DDD', paddingBottom: 8, marginBottom: 8 },
  infoText: { fontSize: 12, fontWeight: '500' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 },
  actionButton: { marginLeft: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  statusBanner: { flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  submitTriggerBtn: { borderWidth: 1, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 10
  },
  modalContent: { padding: 20, borderRadius: 12, maxHeight: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  label: { 
    fontSize: 11, 
    fontWeight: 'bold', 
    marginBottom: 4,
  },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, height: 44 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfWidth: { width: '48%' },
  pickerWrapper: { height: 44, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden', marginBottom: 12 },
  uploadBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 20, alignItems: 'center', marginBottom: 12 },
  fileRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, borderWidth: 1, borderRadius: 6, marginBottom: 6 },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderRadius: 8, marginRight: 10 },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 25, borderRadius: 8 },
  infoBanner: { padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1 }
});

export default AssignmentScreen;
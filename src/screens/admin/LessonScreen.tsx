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
  Platform,
  Linking,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { pick } from '@react-native-documents/picker'; 

// Themes and Upstream Core API Dependencies
import { useTheme } from '../../theme/ThemeContext';
import { lessonApi, Lesson, CreateLessonPayload } from '../../api/lessonApi';
import { subjectApi, Subject } from '../../api/subjectApi';
import { batchApi, Batch } from '../../api/batchApi';

const LessonScreen = () => {
  const { theme, isDark } = useTheme(); // 🌟 isDark added for safe picker colors

  // 🌟 DYNAMIC IDENTITY TRACKING
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Workspace Array States
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 🌟 MODAL & FORM STATES
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [lessonType, setLessonType] = useState<'lecture' | 'lab' | 'tutorial' | 'seminar'>('lecture');
  
  const [inputDate, setInputDate] = useState<string>('');
  const [inputTime, setInputTime] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [durationText, setDurationText] = useState<string>('60');
  const [contentText, setContentText] = useState<string>('');
  const [meetingLinkText, setMeetingLinkText] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // 🌟 FILE UPLOAD STATE
  const [lessonFiles, setLessonFiles] = useState<any[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]); // 🌟 Added to track existing files

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
          if (isMounted) setIsLoading(false);
        }
      };
      verifyAndInitializeRuntimeState();
      return () => { isMounted = false; };
    }, [])
  );

  const fetchOperationalWorkspaceAssets = async (roleOverride?: 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    try {
      const targetRole = roleOverride || currentUserRole;
      const [lessonsRes, subjectsRes, batchesRes] = await Promise.all([
        targetRole === 'student' ? lessonApi.getMyLessons() : lessonApi.getAll(),
        subjectApi.getAll(),
        targetRole !== 'student' ? (targetRole === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll()) : Promise.resolve([]),
      ]);

      if (lessonsRes?.success) setLessons(lessonsRes.data || []);
      if (subjectsRes?.success) setAvailableSubjects(subjectsRes.data || []);
      if (batchesRes?.success) setAvailableBatches(batchesRes.data || []);
    } catch (err: any) {
      Alert.alert("Error", "Failed to load lessons data.");
    } finally {
      setIsLoading(false);
    }
  };

  const closeAndResetModal = () => {
    setIsModalVisible(false);
    setEditingId(null);
    setTitle('');
    setSelectedBatchId('');
    setSelectedSubjectId('');
    setLessonType('lecture');
    setInputDate('');
    setInputTime('');
    setDurationText('60');
    setContentText('');
    setMeetingLinkText('');
    setLessonFiles([]);
    setExistingAttachments([]); // 🌟 Reset existing files
    setIsActive(true);
    Keyboard.dismiss();
  };

  // 🌟 FILE PICKER LOGIC (Max 5 files)
  const handlePickFiles = async () => {
   try {
     const res = await pick({
       allowMultiSelection: true,
       type: ['*/*'],
     });
 
     if (res.length > 5) {
       Alert.alert("Limit Exceeded", "You can only upload up to 5 files.");
       setLessonFiles(res.slice(0, 5));
     } else {
       setLessonFiles(res);
     }
   } catch (err) {
     console.log(err);
     Alert.alert("Error", "Failed to pick documents");
   }
  };
 
  const handleTriggerEdit = (item: any) => {
    if (!item) return;
    setEditingId(item._id);
    setTitle(item.title || '');
    setSelectedSubjectId(typeof item.subjectId === 'object' && item.subjectId ? item.subjectId._id : item.subjectId);
    setSelectedBatchId(typeof item.batchId === 'object' && item.batchId ? item.batchId._id : item.batchId);
    setLessonType(item.type || 'lecture');
    
    if (item.scheduledAt && typeof item.scheduledAt === 'string') {
      const parts = item.scheduledAt.split('T');
      if (parts.length >= 2) {
        setInputDate(parts[0]);
        setInputTime(parts[1].substring(0, 5));
      }
    }

    setDurationText(item.duration ? item.duration.toString() : '60');
    setContentText(item.content || '');
    setMeetingLinkText(item.meetingLink || '');
    setIsActive(item.isActive !== undefined ? item.isActive : true);
    
    // 🌟 Capture existing attachments for editing
    setExistingAttachments(item.attachments || []); 
    setLessonFiles([]); 
    
    setIsModalVisible(true);
  };

  const getTodayDateOnly = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const parseDateOnly = (dateText: string) => {
    const [year, month, day] = dateText.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const formatDateOnly = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleLessonDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (!selectedDate) return;

    const today = getTodayDateOnly();
    const pickedDate = new Date(selectedDate);
    pickedDate.setHours(0, 0, 0, 0);

    if (pickedDate < today) {
      Alert.alert('Invalid Date', 'Past dates are not allowed.');
      return;
    }

    setInputDate(formatDateOnly(pickedDate));
  };

  const handleSaveOrUpdate = async () => {
    const cleanTitle = title.trim();
    const cleanDate = inputDate.trim();
    const cleanTime = inputTime.trim();
    const parsedDur = parseInt(durationText.trim(), 10);

    // Editing mode doesn't technically need batch/subject validated again, but for safety:
    if (!cleanTitle || !cleanDate || !cleanTime || isNaN(parsedDur)) {
      Alert.alert('Missing Details', 'Title, Date, Time, and Duration are required.');
      return;
    }

    if (!editingId && (!selectedBatchId || !selectedSubjectId)) {
        Alert.alert('Missing Details', 'Batch and Subject are required for new lessons.');
        return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!dateRegex.test(cleanDate) || !timeRegex.test(cleanTime)) {
      Alert.alert('Format Error', 'Date must be YYYY-MM-DD and Time must be HH:MM.');
      return;
    }

    const today = getTodayDateOnly();
    const selectedLessonDate = parseDateOnly(cleanDate);
    if (selectedLessonDate < today) {
      Alert.alert('Invalid Date', 'Past dates are not allowed.');
      return;
    }

    setIsSubmitting(true);
    const formattedIsoTimestamp = `${cleanDate}T${cleanTime}:00.000Z`;
    let finalAttachmentUrls: string[] = [];

    try {
      // 🌟 UPLOAD NEW FILES FIRST
      if (lessonFiles.length > 0) {
        const formData = new FormData();
        lessonFiles.forEach((file) => {
          formData.append('files', { 
            uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
            type: file.type || 'application/octet-stream',
            name: file.name,
          } as any);
        });

        const uploadRes = await lessonApi.uploadLessonFiles(formData);
        if (uploadRes?.success) {
          finalAttachmentUrls = uploadRes.data?.fileUrls || uploadRes.urls || [];
        } else {
          Alert.alert("Upload Warning", "Files failed to upload, saving lesson without them.");
        }
      }

      // 🌟 Combine Old and New Attachments
      const allAttachments = [...existingAttachments, ...finalAttachmentUrls];

      let response;
      if (editingId) {
        // UPDATE PAYLOAD (Adheres to schema rules)
        const updatePayload = {
            title: cleanTitle,
            content: contentText.trim() || undefined,
            scheduledAt: formattedIsoTimestamp,
            duration: parsedDur,
            meetingLink: meetingLinkText.trim() || undefined,
            isActive: isActive,
            attachments: allAttachments.length > 0 ? allAttachments : undefined
        };
        response = await lessonApi.update(editingId, updatePayload);
      } else {
        // CREATE PAYLOAD
        const createPayload: any = {
            title: cleanTitle,
            subjectId: selectedSubjectId,
            batchId: selectedBatchId,
            scheduledAt: formattedIsoTimestamp,
            duration: parsedDur,
            type: lessonType,
            content: contentText.trim() || undefined,
            meetingLink: meetingLinkText.trim() || undefined,
            attachments: allAttachments.length > 0 ? allAttachments : undefined
        };
        response = await lessonApi.create(createPayload);
      }

      if (response?.success || response?._id) {
        Alert.alert('Success', editingId ? 'Lesson updated.' : 'Lesson created successfully.');
        closeAndResetModal();
        fetchOperationalWorkspaceAssets();
      } else {
        Alert.alert('Failed', response?.message || 'Could not save the lesson.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Server connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLesson = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this lesson?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              const res = await lessonApi.delete(id);
              if (res?.success) fetchOperationalWorkspaceAssets();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete lesson.');
            }
          }
        }
      ]
    );
  };

  const renderLessonCard = ({ item }: { item: any }) => {
    if (!item) return null;
    
    const uploaderId = typeof item.teacherId === 'object' ? item.teacherId?._id : (item.teacherId || item.createdBy);
    const canManage = currentUserRole === 'admin' || (currentUserRole === 'teacher' && uploaderId === currentUserId);

    let subjectName = 'Assigned Subject';
    if (item.subjectId && typeof item.subjectId === 'object') {
      subjectName = `${item.subjectId.name || 'Subject'} (${item.subjectId.code || ''})`;
    }

    let batchName = 'Target Cohort';
    if (item.batchId && typeof item.batchId === 'object') {
      batchName = item.batchId.name || 'Batch';
    }

    let rawDate = 'N/A';
    let rawTime = '';
    if (typeof item.scheduledAt === 'string') {
      const segs = item.scheduledAt.split('T');
      rawDate = segs[0];
      if (segs.length > 1) rawTime = ` @ ${segs[1].substring(0, 5)}`;
    }

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title || 'Untitled Session'}
          </Text>
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{item.type || 'LECTURE'}</Text>
          </View>
        </View>

        <Text style={[styles.infoText, { color: theme.text, fontWeight: '600' }]}>Subject: {subjectName}</Text>
        <Text style={[styles.infoText, { color: theme.subText, marginBottom: 8 }]}>Batch: {batchName}</Text>

        <View style={styles.grid}>
          <Text style={[styles.infoText, { color: theme.text }]}>Schedule: {rawDate}{rawTime}</Text>
          <Text style={[styles.infoText, { color: theme.text }]}>Duration: {item.duration || 0} Mins</Text>
        </View>

        {/* 🌟 View Attachments Feature inside the card */}
        {item.attachments && item.attachments.length > 0 && (
          <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: theme.border }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text, marginBottom: 4 }}>Attachments:</Text>
            {item.attachments.map((url: string, idx: number) => (
              <TouchableOpacity key={idx} onPress={() => Linking.openURL(url)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <MaterialIcons name="attach-file" size={14} color={theme.primary} />
                <Text style={{ color: theme.primary, fontSize: 12, marginLeft: 4 }}>View Document {idx + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.actionRow}>
          {item.meetingLink ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.meetingLink)} style={styles.joinBtn}>
              <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 12 }}>Join Link</Text>
            </TouchableOpacity>
          ) : <View style={{ flex: 1 }} />}

          {canManage && (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={styles.actionButton}>
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteLesson(item._id)} style={styles.actionButton}>
                <Text style={{ color: '#D32F2F', fontWeight: 'bold', fontSize: 12 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const safeSubjects = Array.isArray(availableSubjects) ? availableSubjects : [];
  const safeBatches = Array.isArray(availableBatches) ? availableBatches : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      
      {/* HEADER WITH ADD BUTTON */}
      <View style={styles.headerContainer}>
        <Text style={[styles.listHeader, { color: theme.text }]}>All Lessons</Text>
        {currentUserRole !== 'student' && (
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.addBtnText}>+ Create Lesson</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* FULL LESSONS LIST */}
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={lessons}
          keyExtractor={(item) => item ? item._id : Math.random().toString()}
          renderItem={renderLessonCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 40, color: theme.subText }}>No sessions available.</Text>
          }
        />
      )}

      {/* ========================================== */}
      {/* POPUP MODAL FOR CREATE / EDIT */}
      {/* ========================================== */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide" onRequestClose={closeAndResetModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            
            <View style={styles.formHeaderRow}>
              <Text style={[styles.formTitle, { color: theme.text }]}>
                {editingId ? 'Modify Lesson' : 'Create Lesson'}
              </Text>
              <TouchableOpacity onPress={closeAndResetModal}>
                <MaterialIcons name="close" size={24} color={theme.subText} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
              
              <View style={styles.pickerContainer}>
                <Text style={[styles.label, { color: theme.text }]}>LESSON TITLE *</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Introduction to Algebra" placeholderTextColor={theme.subText} value={title} onChangeText={setTitle} />
              </View>

              {/* 🌟 DISABLED DURING EDIT MODE */}
              <View style={[styles.pickerContainer, { opacity: editingId ? 0.6 : 1 }]}>
                <Text style={[styles.label, { color: theme.text }]}>BATCH *</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Picker enabled={!editingId} selectedValue={selectedBatchId} onValueChange={(v) => setSelectedBatchId(v)} dropdownIconColor={theme.text} style={{ color: theme.text }}>
                    <Picker.Item label="Select batch" value="" color={isDark ? '#FFF' : '#000'} />
                    {safeBatches.map((b) => <Picker.Item key={b._id} label={b?.name} value={b._id} color={isDark ? '#FFF' : '#000'} />)}
                  </Picker>
                </View>
              </View>

              {/* 🌟 DISABLED DURING EDIT MODE */}
              <View style={[styles.pickerContainer, { opacity: editingId ? 0.6 : 1 }]}>
                <Text style={[styles.label, { color: theme.text }]}>SUBJECT *</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Picker enabled={!editingId} selectedValue={selectedSubjectId} onValueChange={(v) => setSelectedSubjectId(v)} dropdownIconColor={theme.text} style={{ color: theme.text }}>
                    <Picker.Item label={selectedBatchId ? "Select subject" : "Select a batch first"} value="" color={isDark ? '#FFF' : '#000'} />
                    {safeSubjects.map((sub) => <Picker.Item key={sub._id} label={sub?.name} value={sub._id} color={isDark ? '#FFF' : '#000'} />)}
                  </Picker>
                </View>
              </View>

              <View style={styles.row}>
                {/* 🌟 DISABLED DURING EDIT MODE */}
                <View style={[styles.halfInput, { opacity: editingId ? 0.6 : 1 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>TYPE *</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker enabled={!editingId} selectedValue={lessonType} onValueChange={(v) => setLessonType(v)} dropdownIconColor={theme.text} style={{ color: theme.text }}>
                      <Picker.Item label="Lecture" value="lecture" color={isDark ? '#FFF' : '#000'} />
                      <Picker.Item label="Lab" value="lab" color={isDark ? '#FFF' : '#000'} />
                      <Picker.Item label="Tutorial" value="tutorial" color={isDark ? '#FFF' : '#000'} />
                    </Picker>
                  </View>
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>DURATION (MINS) *</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="60" placeholderTextColor={theme.subText} value={durationText} onChangeText={setDurationText} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.row}>
               <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>DATE *</Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowDatePicker(true)}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        justifyContent: 'center',
                      },
                    ]}>
                    <Text style={{ color: inputDate ? theme.text : theme.subText }}>
                      {inputDate || 'Select date'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>TIME (HH:MM) *</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="09:30" placeholderTextColor={theme.subText} value={inputTime} onChangeText={setInputTime} maxLength={5} />
                </View>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={[styles.label, { color: theme.text }]}>MEETING LINK</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="https://zoom.us/j/..." placeholderTextColor={theme.subText} value={meetingLinkText} onChangeText={setMeetingLinkText} autoCapitalize="none" />
                <Text style={{ fontSize: 11, color: theme.subText, marginTop: -4 }}>Zoom, Google Meet, or any video conference link</Text>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={[styles.label, { color: theme.text }]}>CONTENT / NOTES</Text>
                <TextInput style={[styles.input, { height: 70, backgroundColor: theme.background, color: theme.text, borderColor: theme.border, paddingTop: 10 }]} placeholder="Lesson notes or description..." placeholderTextColor={theme.subText} value={contentText} onChangeText={setContentText} multiline textAlignVertical="top" />
              </View>

              {/* 🌟 LESSON ATTACHMENTS (File Upload) */}
              <View style={styles.pickerContainer}>
                <Text style={[styles.label, { color: theme.text }]}>LESSON ATTACHMENTS</Text>
                <TouchableOpacity onPress={handlePickFiles} style={[styles.uploadBox, { borderColor: theme.primary, backgroundColor: isDark ? 'transparent' : 'rgba(59, 130, 246, 0.05)' }]}>
                  <MaterialIcons name="cloud-upload" size={28} color={theme.primary} style={{ marginBottom: 8 }} />
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>Upload lesson files</Text>
                  <Text style={{ color: theme.subText, fontSize: 11, marginTop: 4 }}>
                    {lessonFiles.length > 0 ? `${lessonFiles.length} new file(s) selected` : 'Click to select (up to 5 files)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 🌟 Existing Files (Edit Mode Only) */}
              {existingAttachments.map((url, i) => (
                <View key={`ext-${i}`} style={[styles.fileRow, { borderColor: theme.border }]}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(url)}>
                     <Text style={{ color: theme.primary, textDecorationLine: 'underline' }} numberOfLines={1}>Attached Document {i + 1}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setExistingAttachments(existingAttachments.filter((_, idx)=>idx !== i))}>
                     <Text style={{color: '#EF4444', fontWeight: 'bold'}}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* 🌟 New Files selected */}
              {lessonFiles.map((f, i) => (
                <View key={`new-${i}`} style={[styles.fileRow, { borderColor: theme.border }]}> 
                  <Text style={{ flex: 1, color: theme.text }} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity onPress={() => setLessonFiles(lessonFiles.filter((_, idx)=>idx !== i))}>
                     <Text style={{color: '#EF4444', fontWeight: 'bold'}}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {editingId && (
                <View style={styles.switchRow}>
                  <Text style={{ color: theme.text, fontWeight: '500' }}>Active Status</Text>
                  <Switch value={isActive} onValueChange={setIsActive} thumbColor={theme.primary} />
                </View>
              )}

              <View style={styles.modalActionRow}>
                <TouchableOpacity onPress={closeAndResetModal} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveOrUpdate} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.btnText}>{editingId ? 'Update' : 'Save'}</Text>}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>
      {showDatePicker && (
  <DateTimePicker
    value={
      inputDate && parseDateOnly(inputDate) >= getTodayDateOnly()
        ? parseDateOnly(inputDate)
        : getTodayDateOnly()
    }
    mode="date"
    minimumDate={getTodayDateOnly()}
    onChange={handleLessonDateChange}
  />
)}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  listHeader: { fontSize: 20, fontWeight: 'bold' },
  addBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  grid: { borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 8, marginTop: 4 },
  infoText: { fontSize: 13, marginBottom: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginTop: 6, borderTopWidth: 0.5, borderTopColor: '#EEE' },
  actionButton: { marginLeft: 16, paddingVertical: 4 },
  joinBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { borderRadius: 12, padding: 20, elevation: 5, maxHeight: '90%' },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formTitle: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 6, color: '#555' },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  pickerContainer: { marginBottom: 14 },
  pickerWrapper: { height: 44, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  halfInput: { width: '48%' },
  
  uploadBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  fileRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderWidth: 1, borderRadius: 6, marginBottom: 6, marginTop: 4 }, // 🌟 Added fileRow style
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },

  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, marginRight: 12, justifyContent: 'center' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 7, justifyContent: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});

export default LessonScreen;
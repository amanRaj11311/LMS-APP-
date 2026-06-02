import React, { useState, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, 
  Modal, ScrollView, ActivityIndicator, RefreshControl, Platform, Linking,
  Keyboard, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pick } from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../../theme/ThemeContext';
import { announcementApi, Announcement, CreateAnnouncementPayload } from '../../api/announcemnet';
import { batchApi, Batch } from '../../api/batchApi';

const AnnouncementScreen = () => {
  const { theme, isDark } = useTheme();

  // ==========================================
  // FEED LIFECYCLE & DYNAMIC USER STATES
  // ==========================================
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  // Active form management
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [audience, setAudience] = useState<'all' | 'students' | 'teachers' | 'batch'>('all');
  const [targetBatchId, setTargetBatchId] = useState<string>(''); 
  const [isPinned, setIsPinned] = useState<boolean>(false);
  
  // Date Picker States
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Attachment States
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);

  // 🌟 FIX: Dynamic User Initialization
  const fetchDependencies = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedStr = await AsyncStorage.getItem("user_data");
      let role: 'admin' | 'teacher' | 'student' = 'student';
      let uid = '';
      
      if (storedStr) {
        const userObj = JSON.parse(storedStr);
        uid = userObj._id || '';
        if (userObj.role) {
          if (typeof userObj.role === 'string') role = userObj.role.trim().toLowerCase() as any;
          else if (typeof userObj.role === 'object' && userObj.role.name) role = userObj.role.name.trim().toLowerCase() as any;
        }
      }
      if (!['admin', 'teacher', 'student'].includes(role)) role = 'student'; 

      setCurrentUserRole(role);
      setCurrentUserId(uid);

      await loadFeed(role);

      if (role !== 'student') {
        const batchRes = role === 'teacher' ? await batchApi.getMyBatches() : await batchApi.getAll();
        if (batchRes?.success) setAvailableBatches(batchRes.data || []);
      }
    } catch (error) {
      console.log("Init Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchDependencies(); }, [fetchDependencies]));

  // 🌟 FIX: Role-Based Feed Loading
  const loadFeed = async (role: string) => {
    let response;
    if (role === 'admin') {
      response = await announcementApi.getAll();
    } else if (role === 'teacher') {
      response = await announcementApi.getTeacherFeed();
    } else {
      response = await announcementApi.getStudentFeed();
    }

    if (response?.success) {
      setAnnouncements(response.data);
    }
  };

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadFeed(currentUserRole);
    } catch (error: any) {
      Alert.alert('Sync Drop', error.response?.data?.message || 'Unable to update noticeboard feed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetFormState = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setAudience(currentUserRole === 'teacher' ? 'batch' : 'all');
    setTargetBatchId('');
    setIsPinned(false);
    setExpiryDate(null);
    setSelectedFiles([]);
    setExistingAttachments([]);
    setIsModalVisible(false);
    Keyboard.dismiss();
  };

  const handleTriggerEdit = (item: Announcement) => {
    setEditingId(item._id);
    setTitle(item.title);
    setContent(item.content);
    
    // Map audience
    if (item.audience === 'class') {
      setAudience('all'); // Fallback if class was used previously
    } else {
      setAudience(item.audience as any);
    }
    
    if (item.audience === 'batch' && item.batchId) {
      setTargetBatchId(typeof item.batchId === 'object' ? item.batchId._id : item.batchId);
    } else {
      setTargetBatchId('');
    }

    setIsPinned(item.isPinned);
    
    if (item.expiresAt) {
      setExpiryDate(new Date(item.expiresAt));
    } else {
      setExpiryDate(null);
    }

    setExistingAttachments(item.attachments || []);
    setSelectedFiles([]);

    setIsModalVisible(true);
  };

  const handlePickFiles = async () => {
    try {
      const res = await pick({
        allowMultiSelection: true,
        type: ['*/*'],
      });
  
      const totalFiles = existingAttachments.length + res.length;
      if (totalFiles > 3) {
        Alert.alert("Limit Exceeded", "You can only upload up to 3 files total.");
        const allowedNewFiles = 3 - existingAttachments.length;
        if (allowedNewFiles > 0) setSelectedFiles(res.slice(0, allowedNewFiles));
      } else {
        setSelectedFiles(res);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const onChangeDate = (event: any, selectedDateValue?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDateValue) {
      setExpiryDate(selectedDateValue);
    }
  };

  const formatDateString = (date: Date | null) => {
    if (!date) return "dd/mm/yyyy --:--";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSaveOrUpdate = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Validation Error', 'Title and Content are required.');
      return;
    }

    if (audience === 'batch' && !targetBatchId.trim()) {
      Alert.alert('Validation Error', 'Please select a specific batch.');
      return;
    }

    if (currentUserRole === 'teacher' && audience === 'all') {
      Alert.alert('Permission Denied', 'Teachers can strictly broadcast to assigned specific batches.');
      return;
    }

    setIsSubmitting(true);
    let finalAttachmentUrls: string[] = [];

    try {
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', { 
            uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
            type: file.type || 'application/octet-stream',
            name: file.name,
          } as any);
        });

        const uploadRes = await announcementApi.uploadFiles ? await announcementApi.uploadFiles(formData) : { success: false, urls: [] };
        if (uploadRes?.success) {
          finalAttachmentUrls = uploadRes.data?.fileUrls || uploadRes.urls || [];
        }
      }

      const allAttachments = [...existingAttachments, ...finalAttachmentUrls];

      const payload: CreateAnnouncementPayload = {
        title: title.trim(),
        content: content.trim(),
        audience,
        isPinned,
        expiresAt: expiryDate ? expiryDate.toISOString() : undefined,
        ...(audience === 'batch' ? { batchId: targetBatchId.trim() } : {}),
        attachments: allAttachments.length > 0 ? allAttachments : undefined
      };

      let response;
      if (editingId) {
        response = await announcementApi.update(editingId, payload);
      } else {
        response = await announcementApi.create(payload);
      }

      if (response.success) {
        Alert.alert('Success', editingId ? 'Announcement updated' : 'Announcement broadcasted');
        resetFormState();
        await loadFeed(currentUserRole);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await announcementApi.delete(id);
              if (response.success) {
                if (editingId === id) resetFormState();
                await loadFeed(currentUserRole);
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete.');
            }
          }
        }
      ]
    );
  };

  const renderAnnouncementCard = ({ item }: { item: Announcement }) => {
    const isOwner = item.createdBy._id === currentUserId;
    const canModify = currentUserRole === 'admin' || (currentUserRole === 'teacher' && isOwner);

    let targetLabelName = 'EVERYONE';
    if (item.audience === 'batch' && typeof item.batchId === 'object') targetLabelName = item.batchId.name;
    else if (item.audience === 'students') targetLabelName = 'ALL STUDENTS';
    else if (item.audience === 'teachers') targetLabelName = 'ALL TEACHERS';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWrapper}>
            {item.isPinned && <Text style={{ fontSize: 16, marginRight: 4 }}>📌</Text>}
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
          </View>
          <View style={[styles.audienceBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{targetLabelName}</Text>
          </View>
        </View>

        <Text style={[styles.cardContent, { color: theme.text }]}>{item.content}</Text>

        {item.attachments && item.attachments.length > 0 && (
          <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>Attachments:</Text>
            {item.attachments.map((url: string, idx: number) => (
              <TouchableOpacity key={idx} onPress={() => Linking.openURL(url)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <MaterialIcons name="attach-file" size={16} color={theme.primary} />
                <Text style={{ color: theme.primary, fontSize: 13, marginLeft: 6, textDecorationLine: 'underline' }}>
                  View Attachment {idx + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.footerInfo}>
          <Text style={[styles.authorText, { color: theme.subText }]}>
            By: {item.createdBy.firstName} {item.createdBy.lastName} ({item.createdBy.role})
          </Text>
          <Text style={[styles.dateText, { color: theme.subText }]}>
            {item.createdAt.split('T')[0]}
          </Text>
        </View>

        {canModify && (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={styles.actionButton}>
              <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionButton}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      
      {/* HEADER SECTION */}
      <View style={styles.headerContainer}>
        <Text style={[styles.listHeader, { color: theme.text }]}>Announcements</Text>
        {currentUserRole !== 'student' && (
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            onPress={() => { resetFormState(); setIsModalVisible(true); }}
          >
            <Text style={styles.addBtnText}>+ Add Notice</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* FEED REGISTRY */}
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item._id}
          renderItem={renderAnnouncementCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} colors={[theme.primary]} />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.subText }]}>No active announcements available.</Text>
          }
        />
      )}

      {/* 🌟 MODAL FOR CREATE / EDIT */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide" onRequestClose={resetFormState}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            
            <View style={styles.formHeaderRow}>
              <Text style={[styles.formTitle, { color: theme.text }]}>
                {editingId ? 'Edit Announcement' : 'New Announcement'}
              </Text>
              <TouchableOpacity onPress={resetFormState}>
                <MaterialIcons name="close" size={24} color={theme.subText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              
              <Text style={[styles.label, { color: theme.text }]}>TITLE *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="Holiday Notice"
                placeholderTextColor={theme.subText}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[styles.label, { color: theme.text }]}>CONTENT *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="Type your message..."
                placeholderTextColor={theme.subText}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />

              {/* 🌟 AUDIENCE DROPDOWN */}
              <View style={{ opacity: editingId ? 0.6 : 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>AUDIENCE *</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 12 }]}>
                  <Picker 
                    enabled={!editingId} 
                    selectedValue={audience} 
                    onValueChange={(val) => { setAudience(val); setTargetBatchId(''); }} 
                    style={{ color: theme.text }} 
                    dropdownIconColor={theme.text}
                  >
                    {currentUserRole === 'admin' && <Picker.Item label="Everyone" value="all" color={isDark ? '#FFF' : '#000'} />}
                    {currentUserRole === 'admin' && <Picker.Item label="All Students" value="students" color={isDark ? '#FFF' : '#000'} />}
                    {currentUserRole === 'admin' && <Picker.Item label="All Teachers" value="teachers" color={isDark ? '#FFF' : '#000'} />}
                    <Picker.Item label="Specific Batch" value="batch" color={isDark ? '#FFF' : '#000'} />
                  </Picker>
                </View>
              </View>

              {/* 🌟 BATCH DROPDOWN */}
              {audience === 'batch' && (
                <View style={{ opacity: editingId ? 0.6 : 1 }}>
                  <Text style={[styles.label, { color: theme.text }]}>SELECT BATCH *</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 12 }]}>
                    <Picker enabled={!editingId} selectedValue={targetBatchId} onValueChange={setTargetBatchId} style={{ color: theme.text }} dropdownIconColor={theme.text}>
                      <Picker.Item label="Choose Batch..." value="" color={theme.subText} />
                      {availableBatches.map(b => <Picker.Item key={b._id} label={b.name} value={b._id} color={isDark ? '#FFF' : '#000'} />)}
                    </Picker>
                  </View>
                </View>
              )}

              {/* EXPIRY DATE */}
              <Text style={[styles.label, { color: theme.text }]}>EXPIRY DATE</Text>
              <TouchableOpacity 
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, justifyContent: 'center' }]} 
                onPress={() => setShowDatePicker(true)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: expiryDate ? theme.text : theme.subText }}>{formatDateString(expiryDate)}</Text>
                  <MaterialIcons name="event" size={20} color={theme.subText} />
                </View>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={expiryDate || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={onChangeDate}
                />
              )}

              {/* 🌟 ATTACHMENTS UPLOAD BOX */}
              <Text style={[styles.label, { color: theme.text, marginTop: 4 }]}>ATTACHMENTS</Text>
              <TouchableOpacity onPress={handlePickFiles} style={[styles.uploadBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <View style={styles.uploadIconCircle}>
                  <MaterialIcons name="file-upload" size={24} color="#3B82F6" />
                </View>
                <Text style={{ color: theme.text, fontWeight: 'bold', marginTop: 8 }}>Attach files to announcement</Text>
                <Text style={{ color: theme.subText, fontSize: 11, marginTop: 4 }}>Drag & drop or click to select (up to 3 files)</Text>
                <Text style={{ color: theme.subText, fontSize: 10, marginTop: 2 }}>PDF, JPG, JPEG, PNG, WEBP</Text>
              </TouchableOpacity>

              {/* Display Existing Files */}
              {existingAttachments.map((url, i) => (
                <View key={`ext-${i}`} style={[styles.fileRow, { borderColor: theme.border }]}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(url)}>
                     <Text style={{ color: theme.primary, textDecorationLine: 'underline' }} numberOfLines={1}>Attached File {i + 1}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setExistingAttachments(existingAttachments.filter((_, idx)=>idx !== i))}>
                     <Text style={{color: '#EF4444', fontWeight: 'bold'}}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Display New Files */}
              {selectedFiles.map((f, i) => (
                <View key={`new-${i}`} style={[styles.fileRow, { borderColor: theme.border }]}> 
                  <Text style={{ flex: 1, color: theme.text }} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedFiles(selectedFiles.filter((_, idx)=>idx !== i))}>
                     <Text style={{color: '#EF4444', fontWeight: 'bold'}}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* PIN TOGGLE */}
              <View style={styles.switchRow}>
                <View>
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase' }}>PIN THIS ANNOUNCEMENT</Text>
                  <Text style={{ color: theme.subText, fontSize: 12, marginTop: 2 }}>Pinned announcements appear at the top</Text>
                </View>
                <Switch value={isPinned} onValueChange={setIsPinned} thumbColor={isPinned ? theme.primary : '#f4f3f4'} trackColor={{ false: '#767577', true: 'rgba(59, 130, 246, 0.5)' }} />
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity onPress={resetFormState} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#4F46E5' }]}
                  onPress={handleSaveOrUpdate}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.btnText}>Save</Text>
                  )}
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
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  listHeader: { fontSize: 20, fontWeight: 'bold' },
  addBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { borderRadius: 12, padding: 20, elevation: 5, maxHeight: '95%' },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  formTitle: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 6, color: '#555' },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 16 },
  textArea: { height: 90, paddingVertical: 10 },
  pickerWrapper: { height: 44, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },
  
  uploadBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 24, marginBottom: 16, marginTop: 4 },
  uploadIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  fileRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderWidth: 1, borderRadius: 6, marginBottom: 6 },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDD' },
  
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, marginRight: 12, justifyContent: 'center', backgroundColor: '#FFF' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, justifyContent: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  listContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  titleWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flexShrink: 1 },
  audienceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  cardContent: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  footerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  authorText: { fontSize: 12, fontStyle: 'italic' },
  dateText: { fontSize: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 10, marginTop: 12 },
  actionButton: { marginLeft: 15, paddingVertical: 4 },
  editText: { fontWeight: 'bold', fontSize: 14 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 15 },
});

export default AnnouncementScreen;
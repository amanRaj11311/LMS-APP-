import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Switch,
  Modal,
  ScrollView,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { pick } from '@react-native-documents/picker';

import { useTheme } from '../../theme/ThemeContext';
import { studyMaterialApi } from '../../api/studyMaterialApi';
import { batchApi } from '../../api/batchApi';
import { subjectApi } from '../../api/subjectApi';

const StudyMaterialScreen = () => {
  const { theme } = useTheme();

  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student'>('student');

  const [materials, setMaterials] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [type, setType] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  
  // Single file state to prevent backend crash
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSubjectId('');
    setSelectedBatchIds([]);
  setType('');
    setFileUrl('');
    setDescription('');
    setIsPublic(false);
    setSelectedFile(null);
  };

  const fetchData = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_data');
      const user = stored ? JSON.parse(stored) : {};
      setCurrentUserRole(user.role);

      // Fetch Materials
      const mRes = user.role === 'student'
        ? await studyMaterialApi.getMyMaterials()
        : await studyMaterialApi.getAll();

      setMaterials(mRes.data || []);

      // Fetch Dependencies only if not student
      if (user.role !== 'student') {
        const [sRes, bRes] = await Promise.all([
          subjectApi.getAll(),
          batchApi.getAll(),
        ]);
        setSubjects(sRes.data || []);
        setBatches(bRes.data || []);
      }
    } catch (e) {
      console.log('FETCH ERROR:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchData().finally(() => setIsLoading(false));
    }, [])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const handleEdit = (item: any) => {
    setEditingId(item._id);
    setTitle(item.title);
    setSubjectId(item.subjectId?._id || '');
    setSelectedBatchIds(item.batchIds?.map((b: any) => b._id) || []);
    setType(item.type);
    setFileUrl(item.fileUrl || '');
    setDescription(item.description || '');
    setIsPublic(item.isPublic || false);
    setSelectedFile(null);
    setIsModalVisible(true);
  };

  const handleUpload = async () => {
    try {
      // Dynamic Picker Types
      let docTypes = ['*/*'];
      if (type === 'pdf') docTypes = ['application/pdf'];
      else if (type === 'video') docTypes = ['video/*'];
      else if (type === 'presentation') docTypes = ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];

      const res = await pick({
        type: docTypes,
        allowMultiSelection: false, // Restricted to single file as per DB schema
      });

      setSelectedFile(res[0]);
    } catch (err: any) {
      if (err.code !== 'DOCUMENT_PICKER_CANCELED') console.log('PICK ERROR:', err);
    }
  };

  const handleSave = async () => {
    if (!title || !subjectId) {
      return Alert.alert('Required', 'Please fill title and subject');
    }

    try {
      let finalFileUrl = fileUrl;

      // Only upload if a new file is selected and type is NOT link
      if (type !== 'link' && selectedFile) {
        const formData = new FormData();
        formData.append('file', { // 'file' key to match standard backend single upload
          uri: Platform.OS === 'ios' ? selectedFile.uri.replace('file://', '') : selectedFile.uri,
          name: selectedFile.name || `file_${Date.now()}`,
          type: selectedFile.type || 'application/octet-stream',
        } as any);

        const uploadRes = await studyMaterialApi.uploadStudyMaterialFiles(formData);
        const resData = uploadRes.data || uploadRes;

        // Robust URL Extraction from Response
        if (resData.fileUrl) finalFileUrl = resData.fileUrl;
        else if (resData.url) finalFileUrl = resData.url;
        else if (Array.isArray(resData.fileUrls)) finalFileUrl = resData.fileUrls[0];
        else if (Array.isArray(resData.urls)) finalFileUrl = resData.urls[0];
        else if (typeof resData === 'string') finalFileUrl = resData;

        if (!finalFileUrl) {
          return Alert.alert('Upload Failed', 'Failed to retrieve file URL from server');
        }
      }

      if (!finalFileUrl && type !== 'link') {
        return Alert.alert("Upload Required", "Please upload a file");
      }

      const payload = {
        title,
        subjectId,
        batchIds: selectedBatchIds,
        type,
        fileUrl: finalFileUrl,
        description,
        isPublic,
      };

      if (editingId) {
        await studyMaterialApi.update(editingId, payload);
      } else {
        await studyMaterialApi.create(payload as any);
      }

      Alert.alert('Success', editingId ? 'Material updated successfully' : 'Material added successfully');
      setIsModalVisible(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save material');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete', 'Are you sure you want to delete this material?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await studyMaterialApi.delete(id);
            Alert.alert('Success', 'Material deleted successfully');
            fetchData();
          } catch (err: any) {
            Alert.alert('Error', 'Failed to delete material');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loaderContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.listHeader, { color: theme.text }]}>Study Materials</Text>
        {currentUserRole !== 'student' && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            onPress={() => { resetForm(); setIsModalVisible(true); }}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>+ Add Material</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* LIST */}
      <FlatList
        data={materials}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.subText }}>No study materials found</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text }}>{item.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#10B981' : '#EF4444' }]}>
                    <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
            </View>
            <Text style={{ color: theme.subText, fontSize: 13, marginTop: 2 }}>Subject: {item.subjectId?.name || '-'}</Text>
            <Text style={{ color: theme.subText, fontSize: 13, marginTop: 2 }}>
              Batches: {item.batchIds?.map((b: any) => b.name).join(', ') || 'Public'}
            </Text>
            <Text style={{ color: theme.subText, fontSize: 13, marginTop: 2 }}>Visibility: {item.isPublic ? 'Public' : 'Batch Only'}</Text>

            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => { if (item.fileUrl) Linking.openURL(item.fileUrl); }}>
                <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Open {item.type === 'link' ? 'Link' : 'File'}</Text>
              </TouchableOpacity>

              {currentUserRole !== 'student' && (
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity onPress={() => handleEdit(item)} style={{ marginRight: 15 }}>
                    <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item._id)}>
                    <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      />

      {/* MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.formTitle, { color: theme.text }]}>
                {editingId ? 'Edit' : 'Add'} Study Material
              </Text>
              <TouchableOpacity onPress={() => { setIsModalVisible(false); resetForm(); }}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              {/* TITLE */}
              <Text style={styles.label}>TITLE *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                value={title} onChangeText={setTitle} placeholder="Enter title" placeholderTextColor="#999"
              />

              {/* ROW: TYPE & SUBJECT */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>TYPE *</Text>
                  <View style={[styles.pickerWrapper, { borderColor: theme.border }]}>
  <Picker
  mode="dropdown"
    selectedValue={type}
    dropdownIconColor={theme.text}
    itemStyle={{ color: theme.text }}
    style={{ color: theme.text, height: 50 }}
    onValueChange={(val) => {
      setType(val);
      setSelectedFile(null);
      setFileUrl('');
    }}>
    
    <Picker.Item label="Select Type" value="" color="#999" />
    <Picker.Item label="PDF" value="pdf" />
    <Picker.Item label="Notes" value="notes" />
    <Picker.Item label="Video" value="video" />
    <Picker.Item label="Presentation" value="presentation" />
    <Picker.Item label="Link" value="link" />
    <Picker.Item label="Other" value="other" />
  </Picker>
</View>
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.label}>SUBJECT *</Text>
                 <View style={[styles.pickerWrapper, { borderColor: theme.border }]}>
  <Picker
  mode="dropdown"
    selectedValue={subjectId}
    dropdownIconColor={theme.text}
    itemStyle={{ color: theme.text }}
    style={{ color: theme.text, height: 50 }}
    onValueChange={setSubjectId}>
    
    <Picker.Item label="Select Subject" value="" color="#999" />

    {subjects.map((s: any) => (
      <Picker.Item
        key={s._id}
        label={s.name}
        value={s._id}
      />
    ))}
  </Picker>
</View>
                </View>
              </View>

              {/* BATCHES */}
              <Text style={styles.label}>BATCHES</Text>
              {batches.map((b: any) => (
                <TouchableOpacity
                  key={b._id} style={styles.checkboxRow}
                  onPress={() => setSelectedBatchIds((prev) =>
                      prev.includes(b._id) ? prev.filter((id) => id !== b._id) : [...prev, b._id]
                  )}>
                  <MaterialIcons name={selectedBatchIds.includes(b._id) ? 'check-box' : 'check-box-outline-blank'} size={24} color={theme.primary} />
                  <Text style={{ marginLeft: 10, color: theme.text }}>{b.name}</Text>
                </TouchableOpacity>
              ))}

              {/* FILE / LINK INPUT */}
              {type === 'link' ? (
                <>
                  <Text style={styles.label}>URL / LINK *</Text>
                  <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    value={fileUrl} onChangeText={setFileUrl} placeholder="https://..." placeholderTextColor="#999" autoCapitalize="none"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>UPLOAD FILE (1 File) *</Text>
                  {selectedFile ? (
                    <View style={[styles.fileRow, { borderColor: theme.border, backgroundColor: theme.background }]}>
                       <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 13 }}>{selectedFile.name}</Text>
                       <TouchableOpacity onPress={() => setSelectedFile(null)}>
                          <MaterialIcons name="cancel" size={22} color="#EF4444" />
                       </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={[styles.uploadBox, { borderColor: theme.border }]} onPress={handleUpload}>
                      <MaterialIcons name="cloud-upload" size={30} color={theme.primary} />
                      <Text style={{ textAlign: 'center', marginTop: 10, color: theme.text }}>Click to select file</Text>
                    </TouchableOpacity>
                  )}
                  {editingId && fileUrl && !selectedFile && (
                      <Text style={{color: theme.primary, fontSize: 11, marginBottom: 10}}>* Note: Existing file will be kept if no new file is selected.</Text>
                  )}
                </>
              )}

              {/* DESCRIPTION */}
              <Text style={styles.label}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, height: 80, textAlignVertical: 'top' }]}
                value={description} onChangeText={setDescription} multiline placeholder="Enter description" placeholderTextColor="#999"
              />

              {/* PUBLIC */}
              <View style={styles.switchRow}>
                <Text style={{ fontWeight: 'bold', color: theme.text }}>MAKE PUBLIC</Text>
                <Switch value={isPublic} onValueChange={setIsPublic} />
              </View>

              {/* ACTION BUTTONS */}
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: theme.border }]}
                    onPress={() => { setIsModalVisible(false); resetForm(); }}>
                    <Text style={{color: theme.text, fontWeight: 'bold', fontSize: 15}}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                    onPress={handleSave}>
                    <Text style={styles.btnText}>{editingId ? 'Save Changes' : 'Add Material'}</Text>
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
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  listHeader: { fontSize: 20, fontWeight: 'bold' },
  addBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  card: { padding: 16, marginHorizontal: 12, marginBottom: 12, borderRadius: 10, borderWidth: 1 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 0.5, paddingTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalContent: { margin: 20, borderRadius: 12, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 15 },
 pickerWrapper: {
  borderWidth: 1,
  borderRadius: 8,
  marginBottom: 15,
  justifyContent: 'center',
  overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
},
  uploadBox: { height: 90, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderRadius: 8, padding: 10 },
  fileRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 10 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  saveBtn: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, marginRight: 5 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  label: { fontSize: 11, fontWeight: 'bold', marginBottom: 6, color: '#555' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  row: { flexDirection: 'row' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, color: '#FFF', fontWeight: 'bold' }
});

export default StudyMaterialScreen;
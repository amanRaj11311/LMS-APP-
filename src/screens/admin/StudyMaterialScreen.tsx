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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Core Themes and Target Network Service Definitions
import { useTheme } from '../../theme/ThemeContext';
import { studyMaterialApi, StudyMaterial, CreateMaterialPayload } from '../../api/studyMaterialApi';
import { batchApi, Batch } from '../../api/batchApi';
import { subjectApi, Subject } from '../../api/subjectApi';

const StudyMaterialScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();

  // 🌟 DYNAMIC ROLE TRACKER
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Relational Memory Buffers
  const [materialsFeed, setMaterialsFeed] = useState<StudyMaterial[]>([]);
  const [subjectsFeed, setSubjectsFeed] = useState<Subject[]>([]);
  const [batchesFeed, setBatchesFeed] = useState<Batch[]>([]);

  // Telemetry Filtering Inputs
  const [filterSubjectId, setFilterSubjectId] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Core Form Input Registers
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState<string>('');
  const [descInput, setDescInput] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [resourceType, setResourceType] = useState<'notes' | 'video' | 'pdf' | 'link' | 'presentation' | 'other'>('notes');
  const [fileUrlInput, setFileUrlInput] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [isPublicState, setIsPublicState] = useState<boolean>(false);
  const [isActiveState, setIsActiveState] = useState<boolean>(true);

  // Fetch Master Data Sets based heavily on resolved dynamic runtime scopes
  const fetchLibraryDependencies = useCallback(async (roleOverride?: 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    try {
      const targetRole = roleOverride || currentUserRole;
      
      const queryParams: any = {};
      if (filterSubjectId) queryParams.subjectId = filterSubjectId;
      if (filterType) queryParams.type = filterType;

      // 🌟 EXACT BACKEND ROUTE MAPPING
      const [matsRes, subsRes, batchesRes] = await Promise.all([
        targetRole === 'student' ? studyMaterialApi.getMyMaterials(queryParams) : studyMaterialApi.getAll(queryParams),
        subjectApi.getAll(),
        targetRole !== 'student' ? batchApi.getAll() : Promise.resolve([]),
      ]);

      if (matsRes?.success) {
        setMaterialsFeed(Array.isArray(matsRes.data) ? matsRes.data : []);
      } else {
        setMaterialsFeed([]);
      }

      if (subsRes) {
        const rawSubs = Array.isArray(subsRes) ? subsRes : (subsRes.data || []);
        setSubjectsFeed(Array.isArray(rawSubs) ? rawSubs : []);
      }

      if (batchesRes) {
        const rawBatches = Array.isArray(batchesRes) ? batchesRes : (batchesRes.data || []);
        setBatchesFeed(Array.isArray(rawBatches) ? rawBatches : []);
      }
    } catch (error: any) {
      console.warn("Library Synchronization Extraction Exception:", error?.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRole, filterSubjectId, filterType]);

  // Handle Authentication Evaluation Lifecycles
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
          if (isMounted) await fetchLibraryDependencies(evaluatedRole);
        } catch (err) {
          console.warn("Storage runtime evaluation error:", err);
          if (isMounted) setIsLoading(false);
        }
      };

      verifyAndInitializeRuntimeState();
      return () => { isMounted = false; };
    }, [filterSubjectId, filterType, fetchLibraryDependencies])
  );

  const resetFormState = () => {
    setEditingId(null);
    setTitleInput('');
    setDescInput('');
    setSelectedSubjectId('');
    setSelectedBatchId('');
    setResourceType('notes');
    setFileUrlInput('');
    setTagsInput('');
    setIsPublicState(false);
    setIsActiveState(true);
    Keyboard.dismiss();
  };

  const handleTriggerEdit = (item: StudyMaterial) => {
    if (!item) return;
    setEditingId(item._id);
    setTitleInput(item.title || '');
    setDescInput(item.description || '');
    setSelectedSubjectId(typeof item.subjectId === 'object' ? item.subjectId._id : item.subjectId);
    setSelectedBatchId(item.batchId ? (typeof item.batchId === 'object' ? item.batchId._id : item.batchId) : '');
    setResourceType(item.type || 'notes');
    setFileUrlInput(item.fileUrl || '');
    setIsPublicState(item.isPublic || false);
    setIsActiveState(item.isActive !== undefined ? item.isActive : true);
    
    if (Array.isArray(item.tags)) setTagsInput(item.tags.join(', '));
    else setTagsInput('');

    MasterScrollRef?.scrollTo({ y: 0, animated: true });
  };

  let MasterScrollRef: ScrollView | null = null;

  const handleSaveOrUpdate = async () => {
    const cleanTitle = titleInput.trim();
    const cleanUrl = fileUrlInput.trim();

    if (!cleanTitle || !selectedSubjectId || !cleanUrl) {
      Alert.alert('Validation Error', 'Title, target subject assignment, and explicit source file URL are strictly required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = tagsInput.trim() ? tagsInput.split(',').map(s => s.trim()).filter(Boolean) : undefined;
      const payload: CreateMaterialPayload = {
        title: cleanTitle,
        description: descInput.trim() || undefined,
        subjectId: selectedSubjectId,
        batchId: selectedBatchId || undefined,
        type: resourceType,
        fileUrl: cleanUrl,
        isPublic: isPublicState,
        tags: tagsArray,
      };

      let res;
      if (editingId) {
        res = await studyMaterialApi.update(editingId, { ...payload, isActive: isActiveState });
      } else {
        res = await studyMaterialApi.create(payload);
      }

      if (res?.success) {
        Alert.alert('Success', editingId ? 'Material updated.' : 'Document uploaded seamlessly.');
        resetFormState();
        fetchLibraryDependencies();
      } else {
        Alert.alert('Transmission Refused', res?.message || 'Action command blocked.');
      }
    } catch (error: any) {
      Alert.alert('Validation Error', error.response?.data?.message || 'Network logic failure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this study material?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await studyMaterialApi.delete(id);
              if (res?.success) {
                if (editingId === id) resetFormState();
                fetchLibraryDependencies();
              }
            } catch (error: any) {
              Alert.alert('Action Refused', error.response?.data?.message || 'Deletion failed.');
            }
          }
        }
      ]
    );
  };

  const renderMaterialLibraryCard = ({ item }: { item: StudyMaterial }) => {
    if (!item) return null;
    
    // Evaluate display conditions explicitly matching runtime logic structures
    const uploaderId = typeof item.uploadedBy === 'object' ? item.uploadedBy?._id : item.uploadedBy;
    const canManage = currentUserRole === 'admin' || (currentUserRole === 'teacher' && uploaderId === currentUserId);
    
    const subObj = typeof item.subjectId === 'object' && item.subjectId ? item.subjectId : null;
    const subjectName = subObj ? `${subObj.name} (${subObj.code || ''})` : 'Unmapped Subject Base';
    
    let dateStr = 'N/A';
    if (typeof item.createdAt === 'string') dateStr = item.createdAt.split('T')[0];

    const isPubColor = item.isPublic ? '#10B981' : '#F59E0B';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitleText, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 12, color: theme.text, fontWeight: '500', marginBottom: 2 }}>Topic Context: {subjectName}</Text>
        <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 8 }} numberOfLines={2}>Brief: {item.description || 'No description assigned.'}</Text>
        
        <View style={styles.metadataGrid}>
          <Text style={{ fontSize: 11, color: theme.subText }}>Uploaded: {dateStr}</Text>
          <Text style={{ fontSize: 11, color: isPubColor, fontWeight: 'bold' }}>{item.isPublic ? 'PUBLIC ACCESS' : 'RESTRICTED'}</Text>
        </View>

        <View style={styles.actionConsoleRow}>
          <TouchableOpacity 
            onPress={() => Linking.openURL(item.fileUrl)} 
            style={[styles.launchBtn, { borderColor: '#0288D1', backgroundColor: 'rgba(2, 136, 209, 0.05)' }]}
          >
            <MaterialIcons name="cloud-download" size={14} color="#0288D1" style={{ marginRight: 4 }} />
            <Text style={{ color: '#0288D1', fontWeight: 'bold', fontSize: 12 }}>Access Resource File</Text>
          </TouchableOpacity>

          {canManage && (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteMaterial(item._id)} style={{ paddingLeft: 12, paddingVertical: 6 }}>
                <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const safeMaterials = Array.isArray(materialsFeed) ? materialsFeed : [];
  const safeSubjects = Array.isArray(subjectsFeed) ? subjectsFeed : [];
  const safeBatches = Array.isArray(batchesFeed) ? batchesFeed : [];
  const topPreviewList = safeMaterials.slice(0, 3);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={(ref) => { MasterScrollRef = ref; }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
          
          {/* UPLOAD FORM (RESTRICTED TO ADMINS & TEACHERS) */}
          {currentUserRole !== 'student' && (
            <View style={[styles.formWrapperBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.formHeaderRow}>
                <Text style={[styles.formTitle, { color: theme.text }]}>{editingId ? 'Modify Material' : 'Upload Study Material'}</Text>
                {editingId && (
                  <TouchableOpacity onPress={resetFormState}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Document Title</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Chapter 3 Overview..." placeholderTextColor={theme.subText} value={titleInput} onChangeText={setTitleInput} />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Subject Mapping</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={selectedSubjectId} onValueChange={(v) => setSelectedSubjectId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                      <Picker.Item label="-- Subject --" value="" color={theme.subText} />
                      {safeSubjects.map(sub => <Picker.Item key={sub._id} label={sub.code || sub.name} value={sub._id} />)}
                    </Picker>
                  </View>
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Format Type</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={resourceType} onValueChange={(v) => setResourceType(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                      <Picker.Item label="PDF" value="pdf" /><Picker.Item label="Notes" value="notes" /><Picker.Item label="Video" value="video" /><Picker.Item label="Link" value="link" /><Picker.Item label="Presentation" value="presentation" /><Picker.Item label="Other" value="other" />
                    </Picker>
                  </View>
                </View>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Cloud Storage Payload URL Base</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="https://storage.engine.com/file..." placeholderTextColor={theme.subText} value={fileUrlInput} onChangeText={setFileUrlInput} autoCapitalize="none" />

              <Text style={[styles.label, { color: theme.text }]}>Target Deployment Batch (Optional)</Text>
              <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Picker selectedValue={selectedBatchId} onValueChange={(v) => setSelectedBatchId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                  <Picker.Item label="-- All Batches (None Specific) --" value="" color={theme.subText} />
                  {safeBatches.map(b => <Picker.Item key={b._id} label={b.name} value={b._id} />)}
                </Picker>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Description Notes</Text>
              <TextInput style={[styles.input, { height: 50, backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Provide brief context..." placeholderTextColor={theme.subText} value={descInput} onChangeText={setDescInput} multiline />

              <View style={styles.toggleCluster}>
                <View style={styles.switchRow}>
                  <Text style={{ color: theme.text, fontWeight: '500', fontSize: 12 }}>Make Public (Visible to all)</Text>
                  <Switch value={isPublicState} onValueChange={setIsPublicState} thumbColor={theme.primary} />
                </View>
                {editingId && (
                  <View style={styles.switchRow}>
                    <Text style={{ color: theme.text, fontWeight: '500', fontSize: 12 }}>Active Status</Text>
                    <Switch value={isActiveState} onValueChange={setIsActiveState} thumbColor={theme.primary} />
                  </View>
                )}
              </View>

              <TouchableOpacity style={[styles.mainButton, { backgroundColor: theme.primary }]} onPress={handleSaveOrUpdate} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{editingId ? 'Update Master Properties' : 'Upload Resource Data'}</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* TELEMETRY FILTER CONTROLS */}
          <View style={[styles.filterBarBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.primary, marginBottom: 6 }}>Evaluate Library Catalog</Text>
            <View style={styles.row}>
              <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, flex: 0.48, height: 38 }]}>
                <Picker selectedValue={filterSubjectId} onValueChange={(v) => setFilterSubjectId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                  <Picker.Item label="-- Sub All --" value="" color={theme.subText} />
                  {safeSubjects.map(sub => <Picker.Item key={sub._id} label={sub.code || sub.name} value={sub._id} />)}
                </Picker>
              </View>
              <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, flex: 0.48, height: 38 }]}>
                <Picker selectedValue={filterType} onValueChange={(v) => setFilterType(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                  <Picker.Item label="-- Type All --" value="" color={theme.subText} /><Picker.Item label="PDF" value="pdf" /><Picker.Item label="Video" value="video" /><Picker.Item label="Notes" value="notes" /><Picker.Item label="Link" value="link" /><Picker.Item label="Presentation" value="presentation" />
                </Picker>
              </View>
            </View>
          </View>

          {/* OUTPUT PREVIEW CONTAINER */}
          <View style={styles.miniRegistryBlock}>
            <Text style={[styles.registryHeading, { color: theme.text }]}>Current Digital Library (Top 3)</Text>

            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : topPreviewList.length > 0 ? (
              topPreviewList.map((item, idx) => <View key={idx}>{renderMaterialLibraryCard({ item })}</View>)
            ) : (
              <Text style={[styles.emptyText, { color: theme.subText }]}>No operational material files found.</Text>
            )}

            {safeMaterials.length > 0 && (
              <TouchableOpacity 
                style={[styles.viewAllBtn, { borderColor: theme.primary }]}
                onPress={() => navigation.navigate('AllMaterialsFeed', { materialsList: safeMaterials, currentUserRole, currentUserId })}
              >
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13 }}>
                  Explore Absolute Digital Catalog ({safeMaterials.length} Items)
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  formWrapperBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { color: '#D32F2F', fontWeight: '600', fontSize: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  pickerWrapper: { height: 46, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden', marginBottom: 10 },
  toggleCluster: { marginVertical: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  filterBarBox: { padding: 10, borderRadius: 8, borderWidth: 0.5, marginBottom: 16 },
  miniRegistryBlock: { marginTop: 4 },
  registryHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  card: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitleText: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  metadataGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#EEE', paddingTop: 8, marginTop: 4 },
  actionConsoleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  launchBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  
  viewAllBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(2, 136, 209, 0.05)' },
  emptyText: { textAlign: 'center', fontSize: 13, marginVertical: 12 },
});

export default StudyMaterialScreen;
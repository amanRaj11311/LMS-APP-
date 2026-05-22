import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Keyboard,
  RefreshControl,
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// System API Integrations
import { useTheme } from '../../theme/ThemeContext';
import { batchApi, Batch } from '../../api/batchApi';
import { classApi, ClassItem } from '../../api/classApi';
import { userApi, UserAccount } from '../../api/userApi';
import { enrollmentApi, Enrollment } from '../../api/enrollmentApi'; 

const EnrollmentScreen = () => {
  const { theme } = useTheme();

  // ==========================================
  // DYNAMIC ROLE STATE
  // ==========================================
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student' | null>(null);

  // ==========================================
  // DATA REGISTRY STATES
  // ==========================================
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [availableStudents, setAvailableStudents] = useState<UserAccount[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ==========================================
  // MODAL & FORM BUFFER STATES
  // ==========================================
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // 🌟 Muti-Select State for Students
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  
  const [editingStudentName, setEditingStudentName] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const verifyAndInitializeRuntimeState = async () => {
        try {
          const storedString = await AsyncStorage.getItem("user_data");
          let evaluatedRole: 'admin' | 'teacher' | 'student' = 'student';
          
          if (storedString) {
            const userObj = JSON.parse(storedString);
            if (userObj?.role) {
              if (typeof userObj.role === 'string') evaluatedRole = userObj.role.trim().toLowerCase() as any;
              else if (typeof userObj.role === 'object' && userObj.role.name) evaluatedRole = userObj.role.name.trim().toLowerCase() as any;
            }
            if (!['admin', 'teacher', 'student'].includes(evaluatedRole)) evaluatedRole = 'student'; 
            if (isMounted) setCurrentUserRole(evaluatedRole);
          }
          if (isMounted) await fetchOperationalDependencies(evaluatedRole);
        } catch (err) {
          console.warn("Storage runtime error:", err);
          if (isMounted) setIsLoading(false);
        }
      };

      verifyAndInitializeRuntimeState();
      return () => { isMounted = false; };
    }, [])
  );

  const fetchOperationalDependencies = async (roleOverride?: 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    try {
      const targetRole = roleOverride || currentUserRole;

      const [enrollRes, batchRes, classRes, userRes] = await Promise.all([
        targetRole === 'student' ? enrollmentApi.getMyEnrollments() : enrollmentApi.getAll(),
        targetRole === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll(),
        classApi.getAll(),
        targetRole === 'admin' ? userApi.getAll() : Promise.resolve({ data: [] }),
      ]);

      if (enrollRes?.success) setEnrollments(enrollRes.data || []);
      if (batchRes?.success) setAvailableBatches(batchRes.data || []);
      if (classRes?.success) setAvailableClasses(classRes.data || []);
      
      if (userRes?.success) {
        const filteredStudents = (userRes.data || []).filter((u: any) => u.role === 'student' && !u.isDeleted);
        setAvailableStudents(filteredStudents);
      }
    } catch (error: any) {
      console.warn("API Error:", error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    await fetchOperationalDependencies();
    setIsRefreshing(false);
  };

  const closeAndResetModal = () => {
    setIsModalVisible(false);
    setEditingId(null);
    setSelectedStudentIds([]); // Reset array
    setSelectedClassId('');
    setSelectedBatchId('');
    setSelectedStatus('active');
    setEditingStudentName('');
    Keyboard.dismiss();
  };

  const handleTriggerEdit = (item: any) => {
    if (!item) return;
    
    setEditingId(item._id);
    setSelectedStatus(item.status || 'active');

    const studentObj = typeof item.studentId === 'object' && item.studentId ? item.studentId : null;
    const sName = studentObj ? `${studentObj.firstName || ''} ${studentObj.lastName || ''}`.trim() : 'Unknown Student';
    setEditingStudentName(sName);

    setIsModalVisible(true);
  };

  // 🌟 Logic to Add/Remove students from Multi-select chips
  const handleSelectStudent = (studentId: string) => {
    if (studentId && !selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds((prev) => [...prev, studentId]);
    }
  };

  const handleRemoveStudent = (studentIdToRemove: string) => {
    setSelectedStudentIds((prev) => prev.filter((id) => id !== studentIdToRemove));
  };

  const handleSaveOrUpdate = async () => {
    if (!editingId && (selectedStudentIds.length === 0 || !selectedClassId || !selectedBatchId)) {
      Alert.alert('Missing Details', 'Please select a Class, a Batch, and at least one Student.');
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      if (editingId) {
        response = await enrollmentApi.updateStatus(editingId, selectedStatus);
      } else {
        // Backend multi-enrollment support uses studentIds array
        response = await enrollmentApi.enrollStudent({
          studentIds: selectedStudentIds, 
          classId: selectedClassId,
          batchId: selectedBatchId,
        });
      }

      if (response?.success || response?._id) {
        Alert.alert('Success', editingId ? 'Enrollment status updated.' : 'Students enrolled successfully.');
        closeAndResetModal();
        fetchOperationalDependencies();
      } else {
        Alert.alert('Failed', response?.message || 'Could not process the request.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Server error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEnrollment = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to remove this enrollment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              const res = await enrollmentApi.delete(id);
              if (res?.success) fetchOperationalDependencies();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Could not delete enrollment.');
            }
        }}
      ]
    );
  };

  const renderEnrollmentCard = ({ item }: { item: any }) => {
    if (!item) return null;
    const isAdmin = currentUserRole === 'admin';

    const studentObj = typeof item.studentId === 'object' && item.studentId ? item.studentId : null;
    const studentName = studentObj ? `${studentObj.firstName || ''} ${studentObj.lastName || ''}`.trim() : 'Unknown Student';
    const studentEmail = studentObj ? studentObj.email : 'No Email';

    const batchObj = typeof item.batchId === 'object' && item.batchId ? item.batchId : null;
    const batchName = batchObj ? batchObj.name : 'Unmapped Batch';

    const classObj = typeof item.classId === 'object' && item.classId ? item.classId : null;
    const className = classObj ? classObj.name : 'Unmapped Class';

    let statusBg = '#3B82F6'; 
    if (item.status === 'active') statusBg = '#10B981'; 
    if (item.status === 'suspended') statusBg = '#F59E0B'; 
    if (item.status === 'dropped') statusBg = '#EF4444'; 

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{studentName}</Text>
          <View style={[styles.badge, { backgroundColor: statusBg }]}>
            <Text style={styles.badgeText}>{item.status || 'ACTIVE'}</Text>
          </View>
        </View>
        <Text style={[styles.infoText, { color: theme.subText, marginBottom: 6 }]}>{studentEmail}</Text>
        <View style={styles.infoGrid}>
          <Text style={[styles.infoText, { color: theme.text }]}>Class: <Text style={{ fontWeight: '600' }}>{className}</Text></Text>
          <Text style={[styles.infoText, { color: theme.text }]}>Batch: <Text style={{ fontWeight: '500' }}>{batchName}</Text></Text>
          {item.enrollmentDate && <Text style={[styles.infoText, { color: theme.subText }]}>Enrolled: {item.enrollmentDate.split('T')[0]}</Text>}
        </View>
        {isAdmin && (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={styles.actionButton}>
              <Text style={[styles.editText, { color: theme.primary }]}>Change Status</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteEnrollment(item._id)} style={styles.actionButton}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const safeStudentsArray = Array.isArray(availableStudents) ? availableStudents : [];
  const safeClassesArray = Array.isArray(availableClasses) ? availableClasses : [];
  const safeBatchesArray = Array.isArray(availableBatches) ? availableBatches : [];

  // Helper to get student name for the chips
  const getStudentNameById = (id: string) => {
    const student = safeStudentsArray.find(s => s._id === id);
    return student ? `${student.firstName} ${student.lastName}` : 'Unknown';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      
      <View style={styles.headerContainer}>
        <Text style={[styles.listHeader, { color: theme.text }]}>All Enrollments</Text>
        {currentUserRole === 'admin' && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={() => setIsModalVisible(true)}>
            <Text style={styles.addBtnText}>+ New Enrollment</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={enrollments}
          keyExtractor={(item) => item ? item._id : Math.random().toString()}
          renderItem={renderEnrollmentCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} colors={[theme.primary]} />}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.subText }]}>No active enrollments found.</Text>}
        />
      )}

      {/* ========================================== */}
      {/* POPUP MODAL */}
      {/* ========================================== */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={closeAndResetModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            
            <View style={styles.formHeaderRow}>
              <Text style={[styles.formTitle, { color: theme.text }]}>
                {editingId ? 'Update Status' : 'Enroll Students'}
              </Text>
              <TouchableOpacity onPress={closeAndResetModal}>
                <MaterialIcons name="close" size={24} color={theme.subText} />
              </TouchableOpacity>
            </View>

            {/* 🌟 INSTRUCTIONS SUBTITLE (For Create Mode) */}
            {!editingId && (
              <Text style={[styles.instructionText, { color: theme.subText }]}>
                Select a class, then a batch, then add one or more students
              </Text>
            )}

            {/* EDIT MODE */}
            {editingId ? (
              <View>
                <Text style={{ color: theme.text, fontSize: 14, marginBottom: 12 }}>
                  Student: <Text style={{ fontWeight: 'bold' }}>{editingStudentName}</Text>
                </Text>
                <Text style={[styles.label, { color: theme.text }]}>Enrollment Status</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Picker selectedValue={selectedStatus} onValueChange={(itemValue) => setSelectedStatus(itemValue)} dropdownIconColor={theme.primary} style={{ color: theme.text }}>
                    <Picker.Item label="Active" value="active" />
                    <Picker.Item label="Completed" value="completed" />
                    <Picker.Item label="Dropped" value="dropped" />
                    <Picker.Item label="Suspended" value="suspended" />
                  </Picker>
                </View>
              </View>
            ) : (
              /* CREATE MODE */
              <View>
                <View style={styles.pickerContainer}>
                  <Text style={[styles.label, { color: theme.text }]}>CLASS *</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={selectedClassId} onValueChange={(v) => setSelectedClassId(v)} dropdownIconColor={theme.primary} style={{ color: theme.text }}>
                      <Picker.Item label="Select class" value="" color={theme.subText} />
                      {safeClassesArray.map((cls) => (
                        <Picker.Item key={cls._id} label={cls?.name} value={cls._id} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.pickerContainer}>
                  <Text style={[styles.label, { color: theme.text }]}>BATCH *</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={selectedBatchId} onValueChange={(v) => setSelectedBatchId(v)} dropdownIconColor={theme.primary} style={{ color: theme.text }}>
                      <Picker.Item label={selectedClassId ? "Select a batch" : "Select a class first"} value="" color={theme.subText} />
                      {/* Filter batches based on selected class */}
                      {safeBatchesArray
                        .filter(b => typeof b.classId === 'object' ? b.classId._id === selectedClassId : b.classId === selectedClassId)
                        .map((bat) => (
                          <Picker.Item key={bat._id} label={bat?.name} value={bat._id} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.pickerContainer}>
                  <Text style={[styles.label, { color: theme.text }]}>STUDENTS *</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    {/* Standard dropdown used to ADD to the chips array */}
                    <Picker 
                      selectedValue="" 
                      onValueChange={(v) => handleSelectStudent(v)} 
                      dropdownIconColor={theme.primary} 
                      style={{ color: theme.text }}
                    >
                      <Picker.Item label="Add a student..." value="" color={theme.subText} />
                      {safeStudentsArray
                        .filter(stu => !selectedStudentIds.includes(stu._id)) // Hide already selected
                        .map((stu) => (
                        <Picker.Item key={stu._id} label={`${stu.firstName} ${stu.lastName}`} value={stu._id} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* 🌟 CHIPS RENDERER */}
                <View style={styles.chipsContainer}>
                  {selectedStudentIds.length === 0 ? (
                    <Text style={{ color: theme.subText, fontSize: 13, marginTop: 4 }}>No students selected yet.</Text>
                  ) : (
                    selectedStudentIds.map(id => (
                      <View key={id} style={[styles.chip, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3B82F6' }]}>
                        <Text style={[styles.chipText, { color: '#1D4ED8' }]}>{getStudentNameById(id)}</Text>
                        <TouchableOpacity onPress={() => handleRemoveStudent(id)}>
                          <MaterialIcons name="close" size={16} color="#1D4ED8" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>

              </View>
            )}

            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={closeAndResetModal} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }]}
                onPress={handleSaveOrUpdate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.btnText}>{editingId ? 'Save' : 'Enroll'}</Text>
                )}
              </TouchableOpacity>
            </View>

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
  
  listContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  infoGrid: { borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 8, marginTop: 4 },
  infoText: { fontSize: 13, marginBottom: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, marginTop: 4 },
  actionButton: { marginLeft: 16, paddingVertical: 4 },
  editText: { fontWeight: 'bold', fontSize: 13 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 13 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 12, padding: 24, elevation: 5 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  formTitle: { fontSize: 20, fontWeight: 'bold' },
  instructionText: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, color: '#555', textTransform: 'uppercase' },
  pickerContainer: { marginBottom: 16 },
  pickerWrapper: { height: 46, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },
  
  // CHIPS STYLES
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', minHeight: 40, padding: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, margin: 4 },
  chipText: { fontSize: 13, fontWeight: '600', marginRight: 6 },

  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, marginRight: 12, justifyContent: 'center' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, justifyContent: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});

export default EnrollmentScreen;
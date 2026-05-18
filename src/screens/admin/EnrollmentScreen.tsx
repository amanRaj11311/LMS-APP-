import React, { useState, useEffect } from 'react';
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
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker'; // Native Core Selector

// System API Integrations and Primary Interface Styling Encoders
import { useTheme } from '../../theme/ThemeContext';
import { batchApi, Batch } from '../../api/batchApi';
import { classApi, ClassItem } from '../../api/classApi';
import { userApi, UserAccount } from '../../api/userApi';
import { enrollmentApi, Enrollment } from '../../api/enrollmentApi'; 

// Ensure this execution layer maps to the active session parameters cleanly
const ACTIVE_USER_ROLE: 'admin' | 'teacher' | 'student' = 'admin';

const EnrollmentScreen = () => {
  const { theme } = useTheme();

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
  // ACTIVE FORM BUFFER STATES
  // ==========================================
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');

  // Filter configurations processing backend query attributes
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Setup core operations on layout mount
  useEffect(() => {
    fetchOperationalDependencies();
  }, []);

  // Concurrent parallel extractions parsing underlying database arrays securely
  const fetchOperationalDependencies = async () => {
    setIsLoading(true);
    try {
      // Validate runtime service module methods prior to promise iterations
      if (typeof enrollmentApi?.getAll !== 'function' || typeof userApi?.getAll !== 'function') {
        console.warn("API Hook Error: Confirm interface methods export valid connection structures.");
        setIsLoading(false);
        return;
      }

      const [enrollRes, batchRes, classRes, userRes] = await Promise.all([
        ACTIVE_USER_ROLE === 'student' ? enrollmentApi.getMyEnrollments() : enrollmentApi.getAll(),
        ACTIVE_USER_ROLE === 'teacher' ? batchApi.getMyBatches() : batchApi.getAll(),
        classApi.getAll(),
        userApi.getAll(),
      ]);

      // Unbox returned payload arrays defending against interceptor modifications safely
      if (enrollRes) {
        const rawPayload = Array.isArray(enrollRes) 
          ? enrollRes 
          : (enrollRes.data || enrollRes.result || enrollRes.enrollments || []);
        
        const verifiedArray = Array.isArray(rawPayload) ? rawPayload : [rawPayload].filter(Boolean);
        setEnrollments(verifiedArray);
      }

      if (batchRes) {
        const rawBatches = Array.isArray(batchRes) 
          ? batchRes 
          : (batchRes.data || batchRes.result || batchRes.batches || []);
        
        setAvailableBatches(Array.isArray(rawBatches) ? rawBatches : []);
      }

      if (classRes) {
        const rawClasses = Array.isArray(classRes) 
          ? classRes 
          : (classRes.data || classRes.result || classRes.classes || []);
        
        setAvailableClasses(Array.isArray(rawClasses) ? rawClasses : []);
      }

      if (userRes) {
        const rawUsers = Array.isArray(userRes) 
          ? userRes 
          : (userRes.data || userRes.result || usersRes.users || []);
        
        const verifiedUsersArray = Array.isArray(rawUsers) ? rawUsers : [];
        const filteredStudents = verifiedUsersArray.filter((u: any) => u && u.role === 'student' && !u.isDeleted);
        setAvailableStudents(filteredStudents);
      }
    } catch (error: any) {
      console.warn("API System Access Exception:", error?.message || "Operation dropped.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    await fetchOperationalDependencies();
    setIsRefreshing(false);
  };

  // Safe manual property reset sweeps
  const resetFormState = () => {
    setEditingId(null);
    setSelectedStudentId('');
    setSelectedClassId('');
    setSelectedBatchId('');
    setSelectedStatus('active');
    Keyboard.dismiss();
  };

  // Process data variables mapping properties cleanly into user entry layers
  const handleTriggerEdit = (item: any) => {
    if (!item) return;
    
    setEditingId(item._id);
    setSelectedStudentId(typeof item.studentId === 'object' && item.studentId ? item.studentId._id : item.studentId);
    setSelectedClassId(typeof item.classId === 'object' && item.classId ? item.classId._id : item.classId);
    setSelectedBatchId(typeof item.batchId === 'object' && item.batchId ? item.batchId._id : item.batchId);
    setSelectedStatus(item.status || 'active');
  };

  // Form submission engine verifying values and routing REST payload chains
  const handleSaveOrUpdate = async () => {
    if (!selectedStudentId || !selectedClassId || !selectedBatchId) {
      Alert.alert('Incomplete Configuration', 'Please select a valid target Student, Class, and assigned Batch.');
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      if (editingId) {
        // Execute structural updates pushing active fields directly to persistent targets
        if (typeof enrollmentApi?.updateStatus !== 'function') {
          Alert.alert('Execution Error', 'Service interface omitting explicit update target method.');
          setIsSubmitting(false);
          return;
        }
        response = await enrollmentApi.updateStatus(editingId, selectedStatus);
      } else {
        if (typeof enrollmentApi?.enrollStudent !== 'function') {
          Alert.alert('Execution Error', 'Service interface omitting explicit standard enrollment function.');
          setIsSubmitting(false);
          return;
        }
        response = await enrollmentApi.enrollStudent({
          studentId: selectedStudentId,
          classId: selectedClassId,
          batchId: selectedBatchId,
        });
      }

      if (response?.success || response?._id) {
        Alert.alert('Transaction Complete', editingId ? 'Enrollment flow updated cleanly.' : 'Student successfully enrolled into study workflow.');
        resetFormState();
        fetchOperationalDependencies();
      } else {
        Alert.alert('Action Refused', response?.message || 'Storage constraints rejected mapping transaction.');
      }
    } catch (error: any) {
      Alert.alert('Registration Conflict', error.response?.data?.message || 'Transaction drop recorded.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Perform soft deletion unlinking actions securely
  const handleDeleteEnrollment = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to softly unlink this student enrollment from database operations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (typeof enrollmentApi?.delete !== 'function') return;
              const res = await enrollmentApi.delete(id);
              if (res?.success || res?.message) {
                if (editingId === id) resetFormState();
                fetchOperationalDependencies();
              }
            } catch (error: any) {
              Alert.alert('Wipe Interrupted', error.response?.data?.message || 'Removal transaction blocked.');
            }
          }
        }
      ]
    );
  };

  // Item preview template unboxing relational object properties cleanly
  const renderEnrollmentCard = ({ item }: { item: any }) => {
    if (!item) return null;
    const isAdmin = ACTIVE_USER_ROLE === 'admin';

    // Parse internal string maps securely catching nested backend object targets
    const studentObj = typeof item.studentId === 'object' && item.studentId ? item.studentId : null;
    const studentName = studentObj ? `${studentObj.firstName || ''} ${studentObj.lastName || ''}`.trim() : 'Unmapped Target';
    const studentEmail = studentObj ? studentObj.email : 'Unknown Core Account Link';

    const batchObj = typeof item.batchId === 'object' && item.batchId ? item.batchId : null;
    const batchName = batchObj ? batchObj.name : 'Unmapped Batch';

    const classObj = typeof item.classId === 'object' && item.classId ? item.classId : null;
    const className = classObj ? classObj.name : 'Unmapped Class';

    // Distinct background tags matching Swagger schema operations safely
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
          {item.enrollmentDate ? (
            <Text style={[styles.infoText, { color: theme.subText }]}>Enrolled: {item.enrollmentDate.split('T')[0]}</Text>
          ) : null}
        </View>

        {isAdmin && (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={styles.actionButton}>
              <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
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
  const safeEnrollmentsArray = Array.isArray(enrollments) ? enrollments : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        {/* 1. MASTER ENTRY FORM ENGINE (Fully Scrollable, Unified Flex Layout) */}
        {ACTIVE_USER_ROLE === 'admin' ? (
          <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]}>
            <View style={styles.formHeaderRow}>
              <Text style={[styles.formTitle, { color: theme.text }]}>
                {editingId ? 'Modify Workflow Status' : 'Link Student Enrollment'}
              </Text>
              {editingId ? (
                <TouchableOpacity onPress={resetFormState}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView 
              contentContainerStyle={{ paddingBottom: 16 }} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.pickerContainer}>
                <Text style={[styles.label, { color: theme.text }]}>Target Student User Account</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Picker
                    selectedValue={selectedStudentId}
                    onValueChange={(itemValue) => setSelectedStudentId(itemValue)}
                    dropdownIconColor={theme.primary}
                    style={{ color: theme.text }}
                    enabled={!editingId} // Locks selector strings safely during single property target updates
                  >
                    <Picker.Item label="-- Click to Choose Student --" value="" color={theme.subText} />
                    {safeStudentsArray.map((stu) => (
                      <Picker.Item 
                        key={stu._id} 
                        label={stu?.firstName ? `${stu.firstName} ${stu.lastName} (${stu.email})` : 'Unnamed Target Account'} 
                        value={stu._id} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={[styles.label, { color: theme.text }]}>Target Educational Class</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Picker
                    selectedValue={selectedClassId}
                    onValueChange={(itemValue) => setSelectedClassId(itemValue)}
                    dropdownIconColor={theme.primary}
                    style={{ color: theme.text }}
                    enabled={!editingId}
                  >
                    <Picker.Item label="-- Click to Choose Class --" value="" color={theme.subText} />
                    {safeClassesArray.map((cls) => (
                      <Picker.Item key={cls._id} label={cls?.name || 'Unnamed Class'} value={cls._id} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={[styles.label, { color: theme.text }]}>Target Student Group / Batch</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Picker
                    selectedValue={selectedBatchId}
                    onValueChange={(itemValue) => setSelectedBatchId(itemValue)}
                    dropdownIconColor={theme.primary}
                    style={{ color: theme.text }}
                    enabled={!editingId}
                  >
                    <Picker.Item label="-- Click to Choose Batch --" value="" color={theme.subText} />
                    {safeBatchesArray.map((bat) => (
                      <Picker.Item key={bat._id} label={bat?.name || 'Unnamed Batch'} value={bat._id} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Status Modifier Selector strictly embedded during edit mode flows */}
              {editingId ? (
                <View style={styles.pickerContainer}>
                  <Text style={[styles.label, { color: theme.text }]}>Active Enrollment Status</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker
                      selectedValue={selectedStatus}
                      onValueChange={(itemValue) => setSelectedStatus(itemValue)}
                      dropdownIconColor={theme.primary}
                      style={{ color: theme.text }}
                    >
                      <Picker.Item label="Active" value="active" />
                      <Picker.Item label="Completed" value="completed" />
                      <Picker.Item label="Dropped" value="dropped" />
                      <Picker.Item label="Suspended" value="suspended" />
                    </Picker>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.mainButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveOrUpdate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnText}>{editingId ? 'Update System Status' : 'Commit Enrollment Link'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : null}

        {/* 2. REGISTRY FEED (Flex layout scaling dynamically supporting interface actions) */}
        <View style={{ flex: ACTIVE_USER_ROLE === 'admin' ? 0.7 : 1 }}>
          <Text style={[styles.listHeader, { color: theme.text }]}>Mapped Enrollments Registry</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={safeEnrollmentsArray}
              keyExtractor={(item) => item ? item._id : Math.random().toString()}
              renderItem={renderEnrollmentCard}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handlePullToRefresh}
                  colors={[theme.primary]}
                  tintColor={theme.primary}
                />
              }
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: theme.subText }]}>No active workflow enrollments mapped inside database operations.</Text>
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  formCard: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { color: '#D32F2F', fontWeight: '600', fontSize: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  
  pickerContainer: { marginBottom: 12 },
  pickerWrapper: { height: 46, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },

  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  listHeader: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 4, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
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
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 13 },
});

export default EnrollmentScreen;
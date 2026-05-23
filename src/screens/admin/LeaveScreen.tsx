import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Keyboard,
  Modal,
  RefreshControl,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../../theme/ThemeContext';
import { leaveApi, LeaveApplication, ApplyLeavePayload } from '../../api/leaveApi';
import { userApi, UserAccount } from '../../api/userApi';

const LeaveScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();

  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [leavesFeed, setLeavesFeed] = useState<LeaveApplication[]>([]);
  const [substituteTeachers, setSubstituteTeachers] = useState<UserAccount[]>([]);
  
  // Filtering States
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Apply Leave Modal State
  const [isApplyModalVisible, setIsApplyModalVisible] = useState<boolean>(false);

  // Form States
  const [leaveType, setLeaveType] = useState<'sick' | 'casual' | 'earned' | 'unpaid' | 'other'>('casual');
  const [fromDateInput, setFromDateInput] = useState<string>('');
  const [toDateInput, setToDateInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string>('');

  // Admin Review State
  const [reviewRemarksBuffer, setReviewRemarksBuffer] = useState<{ [key: string]: string }>({});

  const fetchMasterLeaveTelemetry = useCallback(async (roleOverride?: 'admin' | 'teacher' | 'student') => {
    try {
      const activeRole = roleOverride || currentUserRole;
      let leavesData: LeaveApplication[] = [];
      
      const queryParams: any = {};
      if (filterStatus) queryParams.status = filterStatus.toLowerCase();
      if (filterType && activeRole === 'admin') queryParams.type = filterType.toLowerCase();

      if (activeRole === 'admin') {
        const res = await leaveApi.getAll(queryParams);
        if (res?.success) leavesData = Array.isArray(res.data) ? res.data : [];
      } else {
        const res = await leaveApi.getMyLeaves(queryParams);
        if (res?.success) leavesData = Array.isArray(res.data) ? res.data : [];
      }

      setLeavesFeed(leavesData);

      const remarksMap: { [key: string]: string } = {};
      leavesData.forEach(l => { remarksMap[l._id] = l.reviewRemarks || ''; });
      setReviewRemarksBuffer(remarksMap);

      if (activeRole === 'teacher') {
        const usersRes = await userApi.getAll();
        if (usersRes && Array.isArray(usersRes)) {
          setSubstituteTeachers(usersRes.filter((u: any) => u && u.role === 'teacher' && !u.isDeleted));
        }
      }
    } catch (error: any) {
      console.warn("API Fetch Failed:", error?.message);
    }
  }, [currentUserRole, filterStatus, filterType]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const storedString = await AsyncStorage.getItem("user_data");
      let evaluatedRole: 'admin' | 'teacher' | 'student' = 'student';
      if (storedString) {
        const userObj = JSON.parse(storedString);
        if (userObj?.role) {
          if (typeof userObj.role === 'string') evaluatedRole = userObj.role.trim().toLowerCase() as any;
          else if (typeof userObj.role === 'object' && userObj.role.name) evaluatedRole = userObj.role.name.trim().toLowerCase() as any;
        }
      }
      if (!['admin', 'teacher', 'student'].includes(evaluatedRole)) evaluatedRole = 'student'; 
      setCurrentUserRole(evaluatedRole);
      await fetchMasterLeaveTelemetry(evaluatedRole);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [filterStatus, filterType]));

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchMasterLeaveTelemetry();
    setIsRefreshing(false);
  };

  const resetFormState = () => {
    setLeaveType('casual');
    setFromDateInput('');
    setToDateInput('');
    setReasonInput('');
    setSelectedSubstituteId('');
    Keyboard.dismiss();
  };

  const handleApplyLeaveSubmission = async () => {
    const cleanFrom = fromDateInput.trim();
    const cleanTo = toDateInput.trim();
    const cleanReason = reasonInput.trim();

    if (!cleanFrom || !cleanTo || !cleanReason) {
      Alert.alert('Validation Error', 'Provide all mandatory fields (Dates and Reason).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ApplyLeavePayload = {
        type: leaveType,
        fromDate: cleanFrom,
        toDate: cleanTo,
        reason: cleanReason,
        substituteTeacherId: currentUserRole === 'teacher' && selectedSubstituteId ? selectedSubstituteId : undefined,
      };

      const res = await leaveApi.apply(payload);
      if (res?.success || res?.data) {
        Alert.alert('Success', 'Leave request submitted successfully.');
        resetFormState();
        setIsApplyModalVisible(false);
        fetchMasterLeaveTelemetry();
      } else {
        Alert.alert('Refused', res?.message || 'Transaction blocked.');
      }
    } catch (error: any) {
      Alert.alert('Transmission Exception', error.response?.data?.message || 'Network failure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteReviewAction = async (id: string, decisionStatus: 'approved' | 'rejected') => {
    setIsSubmitting(true);
    try {
      const res = await leaveApi.review(id, {
        status: decisionStatus,
        reviewRemarks: reviewRemarksBuffer[id]?.trim() || undefined,
      });

      if (res?.success) {
        Alert.alert('Success', `Application flagged as ${decisionStatus.toUpperCase()}.`);
        fetchMasterLeaveTelemetry();
      }
    } catch (error: any) {
      Alert.alert('Execution Error', error.response?.data?.message || 'Access blocked.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteCancelApplication = (id: string) => {
    Alert.alert(
      'Cancel Leave',
      'Are you sure you want to cancel this pending leave request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await leaveApi.cancel(id);
              if (res?.success) {
                Alert.alert('Success', 'Application cancelled successfully.');
                fetchMasterLeaveTelemetry();
              }
            } catch (error: any) {
              Alert.alert('Denied', error.response?.data?.message || 'Command failed.');
            }
          }
        }
      ]
    );
  };

  const renderLeaveCard = ({ item }: { item: LeaveApplication }) => {
    if (!item) return null;
    
    const isAdmin = currentUserRole === 'admin';
    const currentStatus = String(item.status || 'pending').toLowerCase();
    const currentType = String(item.type || 'Leave').toUpperCase();
    
    const userObj = typeof item.userId === 'object' && item.userId ? item.userId : null;
    const applicantName = userObj ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() : 'My Leave Request';
    
    let statusColor = '#3B82F6'; // Blue for pending
    if (currentStatus === 'approved') statusColor = '#10B981';
    if (currentStatus === 'rejected') statusColor = '#EF4444';
    if (currentStatus === 'cancelled') statusColor = '#9CA3AF';

    let fromStr = 'N/A';
    let toStr = 'N/A';
    if (typeof item.fromDate === 'string') fromStr = item.fromDate.split('T')[0];
    if (typeof item.toDate === 'string') toStr = item.toDate.split('T')[0];

    const currentRemarkText = reviewRemarksBuffer[item._id] !== undefined ? reviewRemarksBuffer[item._id] : '';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitleText, { color: theme.text }]} numberOfLines={1}>
            {isAdmin ? applicantName : currentType}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{currentStatus.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 13, color: theme.text, fontWeight: '500', marginBottom: 4 }}>
           <MaterialIcons name="date-range" size={14} color={theme.subText} /> {fromStr} to {toStr} ({item.totalDays || 0} Days)
        </Text>
        <Text style={{ fontSize: 13, color: theme.subText, marginBottom: 8 }} numberOfLines={3}>Reason: {item.reason || 'None'}</Text>

        {item.reviewRemarks ? (
          <View style={styles.reviewContextBox}>
            <Text style={{ fontSize: 12, color: theme.subText, fontStyle: 'italic' }}>Admin Note: {item.reviewRemarks}</Text>
          </View>
        ) : null}

        {/* ADMIN ACTION PANEL */}
        {isAdmin && currentStatus === 'pending' && (
          <View style={styles.adminActionConsole}>
            <TextInput 
              style={[styles.smallInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
              placeholder="Add admin review remark (optional)..." 
              placeholderTextColor={theme.subText}
              value={currentRemarkText}
              onChangeText={(text) => setReviewRemarksBuffer(prev => ({ ...prev, [item._id]: text }))}
            />
            <View style={styles.decisionRow}>
              <TouchableOpacity onPress={() => handleExecuteReviewAction(item._id, 'approved')} style={[styles.decisionBtn, { backgroundColor: '#10B981' }]}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleExecuteReviewAction(item._id, 'rejected')} style={[styles.decisionBtn, { backgroundColor: '#EF4444', marginLeft: 10 }]}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* USER CANCELLATION BUTTON (Only if pending & not admin) */}
        {!isAdmin && currentStatus === 'pending' && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, borderTopWidth: 0.5, borderTopColor: '#EEE', paddingTop: 12 }}>
            <TouchableOpacity 
              onPress={() => handleExecuteCancelApplication(item._id)}
              style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#FECACA' }}
            >
              <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 13 }}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const safeLeavesFeed = Array.isArray(leavesFeed) ? leavesFeed : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      
      {/* MODERN HEADER & FILTER SECTION */}
      <View style={[styles.headerSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.headerTitleRow}>
              <Text style={[styles.mainHeading, { color: theme.text }]}>Leave Management</Text>
              {currentUserRole !== 'admin' && (
                  <TouchableOpacity 
                     style={[styles.applyBtn, { backgroundColor: theme.primary }]}
                     onPress={() => setIsApplyModalVisible(true)}
                  >
                     <MaterialIcons name="add" size={18} color="#FFF" style={{marginRight: 4}} />
                     <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Apply Leave</Text>
                  </TouchableOpacity>
              )}
          </View>

          <View style={styles.filterRow}>
            <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, flex: 1, marginRight: currentUserRole === 'admin' ? 8 : 0 }]}>
              <Picker 
  selectedValue={filterStatus} 
  onValueChange={(v) => setFilterStatus(v)} 
  style={{
    color: theme.text,
    height: Platform.OS === 'android' ? 50 : 40,
  }}
  itemStyle={{ color: theme.text }}
  dropdownIconColor={theme.primary}
>
                <Picker.Item label="All Status" value="" color={theme.subText} />
                <Picker.Item label="Pending" value="pending" />
                <Picker.Item label="Approved" value="approved" />
                <Picker.Item label="Rejected" value="rejected" />
                <Picker.Item label="Cancelled" value="cancelled" />
              </Picker>
            </View>
            
            {currentUserRole === 'admin' && (
              <View
  style={[
    styles.pickerWrapper,
    {
      backgroundColor: theme.background,
      borderColor: theme.border,
      flex: 1,
      marginLeft: 8,
      height: 50,
      justifyContent: 'center',
    },
  ]}
>
   <Picker
  selectedValue={filterType}
  onValueChange={(v) => setFilterType(v)}
  dropdownIconColor={theme.primary}
  style={{
    color: theme.text,
    height: 54,
    marginTop: Platform.OS === 'android' ? -2 : 0,
  }}
  itemStyle={{
    color: theme.text,
  }}
>
                  <Picker.Item label="All Types" value="" color={theme.subText} />
                  <Picker.Item label="Casual" value="casual" />
                  <Picker.Item label="Sick" value="sick" />
                  <Picker.Item label="Earned" value="earned" />
                  <Picker.Item label="Unpaid" value="unpaid" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            )}
          </View>
      </View>

      {/* LIST SECTION */}
      {isLoading && safeLeavesFeed.length === 0 ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
           <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={safeLeavesFeed}
          keyExtractor={(item) => item ? item._id : Math.random().toString()}
          renderItem={renderLeaveCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <MaterialIcons name="insert-drive-file" size={60} color="#D1D5DB" />
               <Text style={[styles.emptyText, { color: theme.subText }]}>No leave records found matching your criteria.</Text>
            </View>
          }
        />
      )}

      {/* APPLY LEAVE MODAL (For Student/Teacher) */}
      <Modal visible={isApplyModalVisible} animationType="slide" transparent={true}>
         <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{width: '100%', alignItems: 'center'}}>
              <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                <View style={styles.modalHeaderRow}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Apply for Leave</Text>
                    <TouchableOpacity onPress={() => setIsApplyModalVisible(false)}><MaterialIcons name="close" size={24} color={theme.subText}/></TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: theme.text }]}>Leave Type *</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 15 }]}>
                  <Picker selectedValue={leaveType} onValueChange={(v) => setLeaveType(v)} style={{ color: theme.text }}>
                    <Picker.Item label="Casual Leave" value="casual" /><Picker.Item label="Sick Leave" value="sick" /><Picker.Item label="Earned Leave" value="earned" /><Picker.Item label="Unpaid Leave" value="unpaid" /><Picker.Item label="Other" value="other" />
                  </Picker>
                </View>

                {currentUserRole === 'teacher' && (
                   <>
                     <Text style={[styles.label, { color: theme.text }]}>Substitute Teacher (Optional)</Text>
                     <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 15 }]}>
                       <Picker selectedValue={selectedSubstituteId} onValueChange={(v) => setSelectedSubstituteId(v)} style={{ color: theme.text }}>
                         <Picker.Item label="-- None --" value="" color={theme.subText} />
                         {substituteTeachers.map(tea => <Picker.Item key={tea._id} label={`${tea.firstName} ${tea.lastName}`} value={tea._id} />)}
                       </Picker>
                     </View>
                   </>
                )}

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={[styles.label, { color: theme.text }]}>Start Date *</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="YYYY-MM-DD" placeholderTextColor={theme.subText} value={fromDateInput} onChangeText={setFromDateInput} maxLength={10} />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={[styles.label, { color: theme.text }]}>End Date *</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="YYYY-MM-DD" placeholderTextColor={theme.subText} value={toDateInput} onChangeText={setToDateInput} maxLength={10} />
                  </View>
                </View>

                <Text style={[styles.label, { color: theme.text }]}>Reason for Leave *</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Please explain why you need leave..." placeholderTextColor={theme.subText} value={reasonInput} onChangeText={setReasonInput} multiline />

                <TouchableOpacity style={[styles.mainButton, { backgroundColor: theme.primary }]} onPress={handleApplyLeaveSubmission} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Submit Application</Text>}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
         </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: { padding: 16, borderBottomWidth: 1 },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  mainHeading: { fontSize: 22, fontWeight: '800' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', padding: 20, borderRadius: 12 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', color: '#6B7280' },
  input: { height: 46, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  pickerWrapper: {
  borderWidth: 1,
  borderRadius: 8,
  
  height: Platform.OS === 'android' ? 50 : 45,
},
  mainButton: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitleText: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  reviewContextBox: { marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: '#E5E7EB' },
  
  adminActionConsole: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 15 },
  smallInput: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, marginBottom: 10 },
  decisionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  decisionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', fontSize: 14, marginTop: 16, fontWeight: '500' },
});

export default LeaveScreen;
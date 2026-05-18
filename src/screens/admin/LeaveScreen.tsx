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
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../../theme/ThemeContext';
import { leaveApi, LeaveApplication, ApplyLeavePayload } from '../../api/leaveApi';
import { userApi, UserAccount } from '../../api/userApi';

const LeaveScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();

  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [leavesFeed, setLeavesFeed] = useState<LeaveApplication[]>([]);
  const [substituteTeachers, setSubstituteTeachers] = useState<UserAccount[]>([]);
  
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [leaveType, setLeaveType] = useState<'sick' | 'casual' | 'earned' | 'unpaid' | 'other'>('casual');
  const [fromDateInput, setFromDateInput] = useState<string>('2026-05-20');
  const [toDateInput, setToDateInput] = useState<string>('2026-05-22');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string>('');

  const [reviewRemarksBuffer, setReviewRemarksBuffer] = useState<{ [key: string]: string }>({});

  const fetchMasterLeaveTelemetry = useCallback(async (roleOverride?: 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    try {
      const activeRole = roleOverride || currentUserRole;
      
      let leavesData: LeaveApplication[] = [];
      
      // 🌟 SAFE API CALLS WITH STRICT FALLBACKS
      if (activeRole === 'admin') {
        const queryParams: any = {};
        if (filterStatus) queryParams.status = filterStatus.toLowerCase();
        if (filterType) queryParams.type = filterType.toLowerCase();
        const res = await leaveApi.getAll(queryParams);
        if (res?.success) leavesData = Array.isArray(res.data) ? res.data : [];
      } else {
        const queryParams: any = {};
        if (filterStatus) queryParams.status = filterStatus.toLowerCase();
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
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRole, filterStatus, filterType]);

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
          if (isMounted) await fetchMasterLeaveTelemetry(evaluatedRole);
        } catch (err) {
          console.warn("Storage runtime error:", err);
          if (isMounted) setIsLoading(false);
        }
      };

      verifyAndInitializeRuntimeState();
      return () => { isMounted = false; };
    }, [filterStatus, filterType, fetchMasterLeaveTelemetry])
  );

  const resetFormState = () => {
    setLeaveType('casual');
    setFromDateInput('2026-05-20');
    setToDateInput('2026-05-22');
    setReasonInput('');
    setSelectedSubstituteId('');
    Keyboard.dismiss();
  };

  const handleApplyLeaveSubmission = async () => {
    const cleanFrom = fromDateInput.trim();
    const cleanTo = toDateInput.trim();
    const cleanReason = reasonInput.trim();

    if (!cleanFrom || !cleanTo || !cleanReason) {
      Alert.alert('Validation Error', 'Provide mandatory parameter fields.');
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

  const renderMiniLeaveCard = ({ item }: { item: LeaveApplication }) => {
    if (!item) return null;
    
    const isAdmin = currentUserRole === 'admin';
    const currentStatus = String(item.status || 'pending').toLowerCase();
    const currentType = String(item.type || 'Leave').toUpperCase();
    
    const userObj = typeof item.userId === 'object' && item.userId ? item.userId : null;
    const applicantName = userObj ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() : 'My Leave';
    
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

        <Text style={{ fontSize: 12, color: theme.text, fontWeight: '500', marginBottom: 2 }}>Duration: {fromStr} to {toStr} ({item.totalDays || 0} Days)</Text>
        <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 8 }} numberOfLines={2}>Reason: {item.reason || 'None'}</Text>

        {item.reviewRemarks ? (
          <View style={styles.reviewContextBox}>
            <Text style={{ fontSize: 11, color: theme.subText, fontStyle: 'italic' }}>Admin Note: {item.reviewRemarks}</Text>
          </View>
        ) : null}

        {/* ADMIN ACTION PANEL */}
        {isAdmin && currentStatus === 'pending' && (
          <View style={styles.adminActionConsole}>
            <TextInput 
              style={[styles.smallInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
              placeholder="Add admin review remark..." 
              placeholderTextColor={theme.subText}
              value={currentRemarkText}
              onChangeText={(text) => setReviewRemarksBuffer(prev => ({ ...prev, [item._id]: text }))}
            />
            <View style={styles.decisionRow}>
              <TouchableOpacity onPress={() => handleExecuteReviewAction(item._id, 'approved')} style={[styles.decisionBtn, { backgroundColor: '#10B981' }]}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11 }}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleExecuteReviewAction(item._id, 'rejected')} style={[styles.decisionBtn, { backgroundColor: '#EF4444', marginLeft: 8 }]}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11 }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 🌟 USER CANCELLATION BUTTON (VISIBLE ONLY IF PENDING AND NOT ADMIN) */}
        {!isAdmin && currentStatus === 'pending' && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, borderTopWidth: 0.5, borderTopColor: '#EEE', paddingTop: 10 }}>
            <TouchableOpacity 
              onPress={() => handleExecuteCancelApplication(item._id)}
              style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#FECACA' }}
            >
              <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const safeLeavesFeed = Array.isArray(leavesFeed) ? leavesFeed : [];
  const safeTeachersFeed = Array.isArray(substituteTeachers) ? substituteTeachers : [];
  const topThreeLeaves = safeLeavesFeed.slice(0, 3);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
          
          {/* APPLICATION FORM (Hidden for Admins) */}
          {currentUserRole !== 'admin' && (
            <View style={[styles.formWrapperBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.formTitle, { color: theme.text, marginBottom: 12 }]}>Apply for Leave</Text>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Leave Type</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={leaveType} onValueChange={(v) => setLeaveType(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                      <Picker.Item label="Casual" value="casual" /><Picker.Item label="Sick" value="sick" /><Picker.Item label="Earned" value="earned" /><Picker.Item label="Unpaid" value="unpaid" /><Picker.Item label="Other" value="other" />
                    </Picker>
                  </View>
                </View>

                {currentUserRole === 'teacher' ? (
                  <View style={styles.halfInput}>
                    <Text style={[styles.label, { color: theme.text }]}>Substitute (Optional)</Text>
                    <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <Picker selectedValue={selectedSubstituteId} onValueChange={(v) => setSelectedSubstituteId(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                        <Picker.Item label="-- None --" value="" color={theme.subText} />
                        {safeTeachersFeed.map(tea => <Picker.Item key={tea._id} label={`${tea.firstName} ${tea.lastName}`} value={tea._id} />)}
                      </Picker>
                    </View>
                  </View>
                ) : <View style={styles.halfInput} />}
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Start Date (YYYY-MM-DD)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="2026-05-20" placeholderTextColor={theme.subText} value={fromDateInput} onChangeText={setFromDateInput} maxLength={10} />
                </View>

                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>End Date (YYYY-MM-DD)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="2026-05-22" placeholderTextColor={theme.subText} value={toDateInput} onChangeText={setToDateInput} maxLength={10} />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Reason</Text>
              <TextInput style={[styles.input, { height: 56, backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Provide reason..." placeholderTextColor={theme.subText} value={reasonInput} onChangeText={setReasonInput} multiline />

              <TouchableOpacity style={[styles.mainButton, { backgroundColor: theme.primary }]} onPress={handleApplyLeaveSubmission} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Submit Request</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* FILTER CONTROLS */}
          <View style={[styles.filterBarBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.primary, marginBottom: 6 }}>Filter Records</Text>
            <View style={styles.row}>
              <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, flex: 0.48, height: 38 }]}>
                <Picker selectedValue={filterStatus} onValueChange={(v) => setFilterStatus(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                  <Picker.Item label="-- Status All --" value="" color={theme.subText} /><Picker.Item label="Pending" value="pending" /><Picker.Item label="Approved" value="approved" /><Picker.Item label="Rejected" value="rejected" /><Picker.Item label="Cancelled" value="cancelled" />
                </Picker>
              </View>
              {currentUserRole === 'admin' && (
                <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border, flex: 0.48, height: 38 }]}>
                  <Picker selectedValue={filterType} onValueChange={(v) => setFilterType(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                    <Picker.Item label="-- Type All --" value="" color={theme.subText} /><Picker.Item label="Casual" value="casual" /><Picker.Item label="Sick" value="sick" /><Picker.Item label="Earned" value="earned" /><Picker.Item label="Unpaid" value="unpaid" /><Picker.Item label="Other" value="other" />
                  </Picker>
                </View>
              )}
            </View>
          </View>

          {/* OUTPUT PREVIEW CONTAINER */}
          <View style={styles.miniRegistryBlock}>
            <Text style={[styles.registryHeading, { color: theme.text }]}>
              {currentUserRole === 'admin' ? `All Leaves Queue` : 'My History (Top 3)'}
            </Text>

            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : topThreeLeaves.length > 0 ? (
              topThreeLeaves.map((item, idx) => <View key={idx}>{renderMiniLeaveCard({ item })}</View>)
            ) : (
              <Text style={[styles.emptyText, { color: theme.subText }]}>No leave records found.</Text>
            )}

            {safeLeavesFeed.length > 0 && (
              <TouchableOpacity 
                style={[styles.viewAllBtn, { borderColor: theme.primary }]}
                onPress={() => navigation.navigate('AllLeavesFeed', { leavesList: safeLeavesFeed, currentUserRole })}
              >
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13 }}>
                  View Complete History ({safeLeavesFeed.length} Items)
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
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  pickerWrapper: { height: 46, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden', marginBottom: 10 },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  filterBarBox: { padding: 10, borderRadius: 8, borderWidth: 0.5, marginBottom: 16 },
  miniRegistryBlock: { marginTop: 4 },
  registryHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  card: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitleText: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  reviewContextBox: { marginTop: 6, padding: 8, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 0.5, borderColor: '#EEE' },
  adminActionConsole: { marginTop: 10, borderTopWidth: 0.5, borderTopColor: '#EEE', paddingTop: 10 },
  smallInput: { height: 38, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, fontSize: 12, marginBottom: 8 },
  decisionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  decisionBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  viewAllBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(2, 136, 209, 0.05)' },
  emptyText: { textAlign: 'center', fontSize: 13, marginVertical: 12 },
});

export default LeaveScreen;
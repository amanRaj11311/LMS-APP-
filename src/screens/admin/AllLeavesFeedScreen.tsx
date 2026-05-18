import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { leaveApi, LeaveApplication } from '../../api/leaveApi';

const AllLeavesFeedScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { theme } = useTheme();
  
  // Accept safe list and role from the master screen
  const [leavesList, setLeavesList] = useState<LeaveApplication[]>(route.params?.leavesList || []);
  const currentUserRole = route.params?.currentUserRole || 'student';
  const isAdmin = currentUserRole === 'admin';

  const [remarksBuffer, setRemarksBuffer] = useState<{ [key: string]: string }>({});

  const handleReviewAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await leaveApi.review(id, {
        status,
        reviewRemarks: remarksBuffer[id]?.trim() || undefined
      });
      if (res?.success) {
        Alert.alert('Success', `Application flagged as ${status.toUpperCase()}.`);
        setLeavesList(prev => prev.map(l => l._id === id ? { ...l, status, reviewRemarks: remarksBuffer[id]?.trim() } : l));
      }
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Network failure.');
    }
  };

  const handleRetractRequest = async (id: string) => {
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
                Alert.alert('Success', 'Application successfully dropped.');
                setLeavesList(prev => prev.map(l => l._id === id ? { ...l, status: 'cancelled' } : l));
              }
            } catch (e: any) {
              Alert.alert('Failed', e.message || 'Network failure.');
            }
          }
        }
      ]
    );
  };

  const renderComprehensiveLeaveCard = ({ item }: { item: LeaveApplication }) => {
    if (!item) return null;
    
    const currentStatus = String(item.status || 'pending').toLowerCase();
    const currentType = String(item.type || 'Leave').toUpperCase();

    const userObj = typeof item.userId === 'object' && item.userId ? item.userId : null;
    const applicantName = userObj ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() : 'My Leave';
    
    let statusColor = '#3B82F6';
    if (currentStatus === 'approved') statusColor = '#10B981';
    if (currentStatus === 'rejected') statusColor = '#EF4444';
    if (currentStatus === 'cancelled') statusColor = '#9CA3AF';

    let fromStr = 'N/A';
    let toStr = 'N/A';
    if (typeof item.fromDate === 'string') fromStr = item.fromDate.split('T')[0];
    if (typeof item.toDate === 'string') toStr = item.toDate.split('T')[0];

    const currentRemarkText = remarksBuffer[item._id] !== undefined ? remarksBuffer[item._id] : '';

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
        <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 8 }}>Reason: {item.reason || 'None provided.'}</Text>

        {item.reviewRemarks ? (
          <View style={styles.reviewContextBox}>
            <Text style={{ fontSize: 11, color: theme.subText, fontStyle: 'italic' }}>Admin Note: {item.reviewRemarks}</Text>
          </View>
        ) : null}

        {isAdmin && currentStatus === 'pending' && (
          <View style={styles.adminActionConsole}>
            <TextInput 
              style={[styles.smallInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
              placeholder="Admin review comments..." 
              placeholderTextColor={theme.subText}
              value={currentRemarkText}
              onChangeText={(text) => setRemarksBuffer(prev => ({ ...prev, [item._id]: text }))}
            />
            <View style={styles.decisionRow}>
              <TouchableOpacity onPress={() => handleReviewAction(item._id, 'approved')} style={[styles.decisionBtn, { backgroundColor: '#10B981' }]}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11 }}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleReviewAction(item._id, 'rejected')} style={[styles.decisionBtn, { backgroundColor: '#EF4444', marginLeft: 8 }]}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11 }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 🌟 2. NON-ADMIN CAN ONLY SEE CANCEL IF PENDING */}
        {!isAdmin && currentStatus === 'pending' && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, borderTopWidth: 0.5, borderTopColor: '#EEE', paddingTop: 10 }}>
            <TouchableOpacity 
              onPress={() => handleRetractRequest(item._id)}
              style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#FECACA' }}
            >
              <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>← Go Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Leave History</Text>
      </View>

      <FlatList
        data={leavesList}
        keyExtractor={(item) => item ? item._id : Math.random().toString()}
        renderItem={renderComprehensiveLeaveCard}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#DDD' },
  backBtn: { marginRight: 16 },
  title: { fontSize: 16, fontWeight: 'bold' },
  listContent: { padding: 16, paddingBottom: 24 },
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
});

export default AllLeavesFeedScreen;
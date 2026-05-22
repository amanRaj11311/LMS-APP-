import React, { useState, useEffect } from 'react';
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { academicYearApi, AcademicYear } from '../../api/academicYearApi';

const AcademicYearScreen = () => {
  const { theme } = useTheme();

  // ==========================================
  // APPLICATION ENGINE STATES
  // ==========================================

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Controlled text inputs expecting explicit ISO string syntax
  const [startDateText, setStartDateText] = useState<string>('2026-05-12');
  const [endDateText, setEndDateText] = useState<string>('2027-05-12');

  const [isCurrent, setIsCurrent] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  // ==========================================
  // LIFECYCLE & POLLING SYNC
  // ==========================================

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Background auto-polling engine executing updates at 2000ms intervals
  useEffect(() => {
    // Suppress network updates when editing to protect local active values
    if (editingId) return;

    const intervalId = setInterval(() => {
      fetchSilentData();
    }, 2000);

    return () => clearInterval(intervalId);
  }, [editingId]);

  // Primary API retrieval routine displaying absolute UI loaders
  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const response = await academicYearApi.getAll();
      if (response.success) {
        setYears(response.data);
      }
    } catch (error: any) {
      Alert.alert(
        'Network Exception',
        error.response?.data?.message || 'Failed to populate registry data.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Unobtrusive background polling handler bypassing UI loading states
  const fetchSilentData = async () => {
    try {
      const response = await academicYearApi.getAll();
      if (response.success) {
        setYears(response.data);
      }
    } catch (error) {
      // Suppress unhandled exceptions to prevent background interface locking
    }
  };

  // Pull-to-refresh flatlist trigger processing loop
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await academicYearApi.getAll();
      if (response.success) {
        setYears(response.data);
      }
    } catch (error: any) {
      Alert.alert(
        'Synchronization Error',
        error.response?.data?.message || 'Unable to sync records.'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Complete field state purification routine
  const resetForm = () => {
    setEditingId(null);
    setStartDateText('2026-05-12');
    setEndDateText('2027-05-12');
    setIsCurrent(false);
    setIsActive(true);
    Keyboard.dismiss();
  };

  // Populate form configuration directly from target record properties
  const handleTriggerEdit = (item: AcademicYear) => {
    setEditingId(item._id);
    // Strip trailing timestamp values to map raw YYYY-MM-DD input parameters cleanly
    setStartDateText(item.startDate.split('T')[0]);
    setEndDateText(item.endDate.split('T')[0]);
    setIsCurrent(item.isCurrent);
    setIsActive(item.isActive ?? true);
  };

  // ==========================================
  // TRANSACTION SUBMISSION ENGINE
  // ==========================================

  const handleSaveOrUpdate = async () => {
    const cleanStart = startDateText.trim();
    const cleanEnd = endDateText.trim();

    // 1. Strict ISO Date Syntax Evaluation
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(cleanStart) || !isoRegex.test(cleanEnd)) {
      Alert.alert(
        'Format Validation Error',
        'Dates must strictly adhere to the YYYY-MM-DD standard (e.g., 2026-05-12).'
      );
      return;
    }

    // 2. Safe Timestamp Chronological Boundary Evaluation
    const startMetric = new Date(cleanStart).getTime();
    const endMetric = new Date(cleanEnd).getTime();

    if (isNaN(startMetric) || isNaN(endMetric)) {
      Alert.alert('Date Evaluation Error', 'Provided parameter numbers resolve to invalid temporal metrics.');
      return;
    }

    if (startMetric >= endMetric) {
      Alert.alert(
        'Timeline Consistency Error',
        'The operational end date must occur strictly after the defined start date.'
      );
      return;
    }

    // 3. Dynamic Application Label Generation
    const derivedStartYear = cleanStart.split('-')[0];
    const derivedEndYear = cleanEnd.split('-')[0];
    const systemGeneratedLabel = `${derivedStartYear}-${derivedEndYear}`;

    setIsSubmitting(true);

    const payload = {
      label: systemGeneratedLabel,
      startDate: cleanStart,
      endDate: cleanEnd,
      isCurrent,
      isActive,
    };

    try {
      let response;
      if (editingId) {
        response = await academicYearApi.update(editingId, payload);
      } else {
        response = await academicYearApi.create(payload);
      }

      if (response.success) {
        Alert.alert(
          'Transaction Successful',
          editingId
            ? 'Academic year record updated successfully.'
            : 'New academic year configuration mapped securely.'
        );
        resetForm();
        fetchInitialData();
      }
    } catch (error: any) {
      Alert.alert(
        'Execution Dropped',
        error.response?.data?.message || 'Server connection failure.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soft delete execution tracking system DB parameters
  const handleDelete = (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      Alert.alert(
        'Constraint Violation',
        'The operational current academic year cannot be flagged for deletion.'
      );
      return;
    }

    Alert.alert(
      'Confirm Wipe Target',
      'Are you sure you want to remove this academic configuration from operations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await academicYearApi.delete(id);
              if (response.success) {
                if (editingId === id) resetForm();
                fetchInitialData();
              }
            } catch (error: any) {
              Alert.alert(
                'Wipe Dropped',
                error.response?.data?.message || 'Record termination execution failed.'
              );
            }
          },
        },
      ]
    );
  };

  // ==========================================
  // PROFILE COMPONENT BUILDER
  // ==========================================

  const renderYearCard = ({ item }: { item: AcademicYear }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{item.label}</Text>

        {item.isCurrent && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>Current</Text>
          </View>
        )}
      </View>

      <Text style={[styles.dateText, { color: theme.subText }]}>
        Duration: {item.startDate.split('T')[0]} to {item.endDate.split('T')[0]}
      </Text>

      {item.createdBy && (
        <Text style={[styles.authorText, { color: theme.subText }]}>
          Created by: {item.createdBy.firstName} {item.createdBy.lastName}
        </Text>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={styles.actionButton}>
          <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleDelete(item._id, item.isCurrent)} style={styles.actionButton}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ==========================================
  // CORE INTERFACE EXECUTION
  // ==========================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      
      {/* MANAGEMENT FORM ENGINE */}
      <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.formHeaderRow}>
          <Text style={[styles.formTitle, { color: theme.text }]}>
            {editingId ? 'Modify Record Setup' : 'Create Record Setup'}
          </Text>

          {editingId && (
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* INPUT: START DATE STRING */}
        <Text style={[styles.inputLabel, { color: theme.text }]}>Start date (YYYY-MM-DD)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="2026-05-12"
          placeholderTextColor={theme.subText}
          value={startDateText}
          onChangeText={setStartDateText}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          maxLength={10}
        />

        {/* INPUT: END DATE STRING */}
        <Text style={[styles.inputLabel, { color: theme.text }]}>End Date (YYYY-MM-DD)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="2027-05-12"
          placeholderTextColor={theme.subText}
          value={endDateText}
          onChangeText={setEndDateText}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          maxLength={10}
        />

        {/* SYSTEM STATUS PARAMETERS */}
        <View style={styles.switchRow}>
          <Text style={{ color: theme.text, fontWeight: '500' }}>Set as Current Year</Text>
          <Switch value={isCurrent} onValueChange={setIsCurrent} thumbColor={theme.primary} />
        </View>

        {editingId && (
          <View style={styles.switchRow}>
            <Text style={{ color: theme.text, fontWeight: '500' }}>General Activity Operational State</Text>
            <Switch value={isActive} onValueChange={setIsActive} thumbColor={theme.primary} />
          </View>
        )}

        <TouchableOpacity
          style={[styles.mainButton, { backgroundColor: theme.primary }]}
          onPress={handleSaveOrUpdate}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>
              {editingId ? 'Commit Record Update' : 'Save'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* RENDERED REGISTRY ENGINE */}
      <Text style={[styles.listHeader, { color: theme.text }]}>Acad</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={years}
          keyExtractor={(item) => item._id}
          renderItem={renderYearCard}
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
            <Text style={[styles.emptyText, { color: theme.subText }]}>No active configurations detected.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  formCard: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { color: '#D32F2F', fontWeight: '600', fontSize: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { height: 46, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  listHeader: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  dateText: { fontSize: 14, marginBottom: 4 },
  authorText: { fontSize: 12, fontStyle: 'italic', marginBottom: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 10 },
  actionButton: { marginLeft: 16, paddingVertical: 4 },
  editText: { fontWeight: 'bold', fontSize: 14 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 15 },
});

export default AcademicYearScreen;
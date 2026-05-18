import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { timetableApi } from '../../api/timetableApi';
import { Batch } from '../../api/batchApi';

const AllTimetablesFeedScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { theme } = useTheme();
  const batchesList: Batch[] = route.params?.batchesList || [];

  const [timetablesFeed, setTimetablesFeed] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAllCohortTables();
  }, []);

  const fetchAllCohortTables = async () => {
    setIsLoading(true);
    try {
      const outputFeed: any[] = [];
      for (const b of batchesList) {
        const res = await timetableApi.getByBatch(b._id);
        if (res?.success && res.data) {
          outputFeed.push(res.data);
        }
      }
      setTimetablesFeed(outputFeed);
    } catch (error) {} finally {
      setIsLoading(false);
    }
  };

  const renderDetailedTimetableCard = ({ item }: { item: any }) => {
    if (!item) return null;
    const batchObj = typeof item.batchId === 'object' && item.batchId ? item.batchId : null;
    const batchName = batchObj ? batchObj.name : 'Unmapped Cohort';
    const classObj = typeof item.classId === 'object' && item.classId ? item.classId : null;
    const className = classObj ? classObj.name : 'Unmapped Class';

    let effFrom = 'N/A';
    if (typeof item.effectiveFrom === 'string') effFrom = item.effectiveFrom.split('T')[0];

    const slotsArr = Array.isArray(item.slots) ? item.slots : [];

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitleText, { color: theme.text }]} numberOfLines={1}>Cohort: {batchName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.isActive !== false ? theme.primary : '#757575' }]}>
            <Text style={styles.badgeText}>{item.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 13, color: theme.text, fontWeight: '600', marginBottom: 2 }}>Class Base: {className}</Text>
        <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 8 }}>Effective Gate: {effFrom}</Text>

        <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.primary, marginBottom: 4 }}>Assigned Slots Array ({slotsArr.length})</Text>
        <View style={styles.slotsGrid}>
          {slotsArr.map((s: any, idx: number) => {
            const subObj = typeof s.subjectId === 'object' && s.subjectId ? s.subjectId : null;
            const subName = subObj ? subObj.code || subObj.name : 'Sub';
            const teacherObj = typeof s.teacherId === 'object' && s.teacherId ? s.teacherId : null;
            const tName = teacherObj ? teacherObj.lastName || teacherObj.firstName : 'Instructor';

            return (
              <View key={idx} style={styles.slotBox}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#B48600', textTransform: 'uppercase' }}>{s.day?.substring(0,3)}</Text>
                <Text style={{ fontSize: 10, color: theme.text, fontWeight: '500' }}>{s.startTime}-{s.endTime}</Text>
                <Text style={{ fontSize: 10, color: theme.subText }} numberOfLines={1}>{subName} | {tName}</Text>
                <Text style={{ fontSize: 9, color: theme.subText }}>{s.roomNumber || 'Room 101'}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>← Layouts Form</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>All Registered Cohort Tables</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={timetablesFeed}
          keyExtractor={(item) => item ? item._id : Math.random().toString()}
          renderItem={renderDetailedTimetableCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={{ textAlign: 'center', fontSize: 13, color: theme.subText, marginTop: 40 }}>No persistent master timeline files evaluated matching target ranges.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#DDD' },
  backBtn: { marginRight: 16 },
  title: { fontSize: 16, fontWeight: 'bold' },
  listContent: { padding: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitleText: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  slotBox: { width: '48%', padding: 8, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 0.5, borderColor: '#EEE', marginBottom: 8 },
});

export default AllTimetablesFeedScreen;
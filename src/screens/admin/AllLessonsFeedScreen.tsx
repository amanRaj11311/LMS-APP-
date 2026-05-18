import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

const AllLessonsFeedScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { theme } = useTheme();
  const lessons = route.params?.lessonsData || [];

  const renderComprehensiveLessonCard = ({ item }: { item: any }) => {
    if (!item) return null;
    const subObj = typeof item.subjectId === 'object' && item.subjectId ? item.subjectId : null;
    const subjectName = subObj ? `${subObj.name} (${subObj.code || ''})` : 'Unmapped Context Base';
    const batchObj = typeof item.batchId === 'object' && item.batchId ? item.batchId : null;
    const batchName = batchObj ? batchObj.name : 'Unmapped Target Group';

    let rawDate = 'N/A';
    let rawTime = '';
    if (typeof item.scheduledAt === 'string') {
      const segs = item.scheduledAt.split('T');
      rawDate = segs[0];
      if (segs.length > 1) rawTime = ` @ ${segs[1].substring(0, 5)}`;
    }

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title || 'Untitled Schedule Task'}</Text>
          <View style={[styles.badge, { backgroundColor: item.isActive !== false ? theme.primary : '#757575' }]}>
            <Text style={styles.badgeText}>{item.type || 'LECTURE'}</Text>
          </View>
        </View>

        <Text style={[styles.infoText, { color: theme.text, fontWeight: '600', marginBottom: 4 }]}>Subject: {subjectName}</Text>
        <Text style={[styles.infoText, { color: theme.subText, marginBottom: 8 }]}>Cohort Context: {batchName}</Text>

        <View style={styles.grid}>
          <Text style={[styles.infoText, { color: theme.text }]}>Schedule mapping: {rawDate}{rawTime}</Text>
          <Text style={[styles.infoText, { color: theme.text }]}>Total Length: {item.duration || 0} Mins</Text>
          <Text style={[styles.infoText, { color: theme.subText, marginTop: 4 }]}>Content Outline: {item.content || 'None declared.'}</Text>
        </View>

        {item.meetingLink ? (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => Linking.openURL(item.meetingLink)} style={[styles.joinBtn, { borderColor: '#10B981' }]}>
              <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 12 }}>Launch Gateway</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>← Return to Dashboard</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Class Timeline Register ({lessons.length})</Text>
      </View>

      <FlatList
        data={lessons}
        keyExtractor={(item) => item ? item._id : Math.random().toString()}
        renderItem={renderComprehensiveLessonCard}
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
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  grid: { borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 8, marginTop: 4 },
  infoText: { fontSize: 13, marginBottom: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, marginTop: 6, borderTopWidth: 0.5, borderTopColor: '#EEE' },
  joinBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
});

export default AllLessonsFeedScreen;
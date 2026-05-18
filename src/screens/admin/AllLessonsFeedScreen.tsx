import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

const AllLessonsFeedScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { theme } = useTheme();
  
  // Safely grab the passed data
  const lessons = route.params?.lessonsData || [];

  const renderComprehensiveLessonCard = ({ item }: { item: any }) => {
    if (!item) return null;
    
    // 🌟 FRONTEND FIX: Super-Safe Object Parsing
    // Agar item.subjectId ek string hai (Student case), toh fallback text use hoga.
    // Agar item.subjectId ek object hai (Admin case), toh proper name extract hoga.
    
    let subjectName = 'Enrolled Subject';
    if (item.subjectId && typeof item.subjectId === 'object') {
      subjectName = `${item.subjectId.name || 'Subject'} (${item.subjectId.code || ''})`;
    } else if (typeof item.subjectId === 'string') {
      subjectName = 'Assigned Subject Area'; 
    }
    
    let batchName = 'My Cohort';
    if (item.batchId && typeof item.batchId === 'object') {
      batchName = item.batchId.name || 'Target Cohort';
    } else if (typeof item.batchId === 'string') {
      batchName = 'My Active Batch'; 
    }

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
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title || 'Untitled Session'}
          </Text>
          <View style={[styles.badge, { backgroundColor: item.isActive !== false ? theme.primary : '#757575' }]}>
            <Text style={styles.badgeText}>{item.type || 'LECTURE'}</Text>
          </View>
        </View>

        <Text style={[styles.infoText, { color: theme.text, fontWeight: '600', marginBottom: 4 }]}>
          Subject: {subjectName}
        </Text>
        <Text style={[styles.infoText, { color: theme.subText, marginBottom: 8 }]}>
          Batch: {batchName}
        </Text>

        <View style={styles.grid}>
          <Text style={[styles.infoText, { color: theme.text }]}>Schedule : {rawDate}{rawTime}</Text>
          <Text style={[styles.infoText, { color: theme.text }]}>Total Length: {item.duration || 0} Mins</Text>
          <Text style={[styles.infoText, { color: theme.subText, marginTop: 4 }]}>
            Outline: {item.content || 'None declared.'}
          </Text>
        </View>

        {item.meetingLink ? (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              onPress={() => Linking.openURL(item.meetingLink)} 
              style={[styles.joinBtn, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
            >
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
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40, color: theme.subText }}>
            No sessions available in this view.
          </Text>
        }
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
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  grid: { borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 8, marginTop: 4 },
  infoText: { fontSize: 13, marginBottom: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, marginTop: 6, borderTopWidth: 0.5, borderTopColor: '#EEE' },
  joinBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
});

export default AllLessonsFeedScreen;
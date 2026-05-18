import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

const AllStudentProfilesScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { theme } = useTheme();
  const profiles = route.params?.profilesData || [];

  const renderComprehensiveCard = ({ item }: { item: any }) => {
    if (!item) return null;
    const userObj = typeof item.userId === 'object' && item.userId ? item.userId : null;
    const studentName = userObj ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() : 'Unmapped Target';
    const dobString = typeof item.dateOfBirth === 'string' ? item.dateOfBirth.split('T')[0] : 'N/A';
    
    const guardianString = item.guardian ? `${item.guardian.name || ''} (${item.guardian.relation || ''})` : 'None';
    const schoolStr = item.previousSchool?.name ? `${item.previousSchool.name} (${item.previousSchool.percentage || 0}%)` : 'N/A';
    const healthStr = item.healthInfo?.bloodGroup ? `Blood: ${item.healthInfo.bloodGroup} | Emergency: ${item.healthInfo.emergencyContact || 'N/A'}` : 'N/A';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{studentName}</Text>
          <Text style={[styles.badgeText, { color: theme.primary }]}>{item.admissionNumber}</Text>
        </View>

        <Text style={[styles.infoText, { color: theme.subText, marginBottom: 8 }]}>{userObj?.email || 'No Identity Linked'}</Text>

        <View style={styles.grid}>
          <Text style={[styles.infoText, { color: theme.text }]}>Gender: {item.gender || 'N/A'} | {item.category || 'Gen'}</Text>
          <Text style={[styles.infoText, { color: theme.text }]}>DOB: {dobString} | Religion: {item.religion || 'N/A'}</Text>
          <Text style={[styles.infoText, { color: theme.subText, marginTop: 4 }]}>Guardian: {guardianString}</Text>
          <Text style={[styles.infoText, { color: theme.subText }]}>Prior History: {schoolStr}</Text>
          <Text style={[styles.infoText, { color: theme.subText }]}>Medical Context: {healthStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>← Back to Master Form</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>All Student Records ({profiles.length})</Text>
      </View>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item ? item._id : Math.random().toString()}
        renderItem={renderComprehensiveCard}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  grid: { borderTopWidth: 0.5, borderTopColor: '#EEE', paddingTop: 8, marginTop: 4 },
  infoText: { fontSize: 13, marginBottom: 3 },
});

export default AllStudentProfilesScreen;
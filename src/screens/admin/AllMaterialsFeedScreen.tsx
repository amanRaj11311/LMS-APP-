import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeContext';
import { StudyMaterial } from '../../api/studyMaterialApi';

const AllMaterialsFeedScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { theme } = useTheme();
  
  // Master List aur Role ko pichli screen se receive karein
  const [materialsList] = useState<StudyMaterial[]>(route.params?.materialsList || []);
  const currentUserRole = route.params?.currentUserRole || 'student';

  const handleAccessFile = async (url: string) => {
    if (!url) {
      Alert.alert('Link Missing', 'Is material ke sath koi valid URL link nahi hai.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Browser Error', 'Aapke device par yeh link open nahi ho paa raha hai.');
    }
  };

  const renderComprehensiveMaterialCard = ({ item }: { item: StudyMaterial }) => {
    if (!item) return null;
    
    const subObj = typeof item.subjectId === 'object' && item.subjectId ? item.subjectId : null;
    const subjectName = subObj ? `${subObj.name} (${subObj.code || ''})` : 'Unmapped Subject Base';
    
    let dateStr = 'N/A';
    if (typeof item.createdAt === 'string') dateStr = item.createdAt.split('T')[0];

    const isPubColor = item.isPublic ? '#10B981' : '#F59E0B';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitleText, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 13, color: theme.text, fontWeight: '600', marginBottom: 2 }}>Topic: {subjectName}</Text>
        <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 8 }}>Brief: {item.description || 'No description assigned.'}</Text>
        
        <View style={styles.metadataGrid}>
          <Text style={{ fontSize: 12, color: theme.subText }}>Uploaded: {dateStr}</Text>
          <Text style={{ fontSize: 11, color: isPubColor, fontWeight: 'bold' }}>{item.isPublic ? 'PUBLIC ACCESS' : 'RESTRICTED'}</Text>
        </View>

        <View style={styles.actionConsoleRow}>
          <TouchableOpacity 
            onPress={() => handleAccessFile(item.fileUrl)} 
            style={[styles.launchBtn, { borderColor: '#0288D1', backgroundColor: 'rgba(2, 136, 209, 0.05)' }]}
          >
            <MaterialIcons name="cloud-download" size={16} color="#0288D1" style={{ marginRight: 6 }} />
            <Text style={{ color: '#0288D1', fontWeight: 'bold', fontSize: 13 }}>Access Resource File</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>← Master Console</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Digital Library Catalog</Text>
      </View>

      <FlatList
        data={materialsList}
        keyExtractor={(item) => item ? item._id : Math.random().toString()}
        renderItem={renderComprehensiveMaterialCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', fontSize: 13, color: theme.subText, marginTop: 40 }}>
            No operational material files found mapped matching parameters.
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
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitleText: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  metadataGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#EEE', paddingTop: 8, marginTop: 4 },
  actionConsoleRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12 },
  launchBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
});

export default AllMaterialsFeedScreen;
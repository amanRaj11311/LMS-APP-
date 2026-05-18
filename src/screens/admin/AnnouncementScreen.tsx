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
  ActionSheetIOS,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { announcementApi, Announcement, CreateAnnouncementPayload } from '../../api/announcemnet';

// Modify this explicit mock role variable to wire up to your global auth state context
const ACTIVE_USER_ROLE: 'admin' | 'teacher' | 'student' = 'admin';
const ACTIVE_USER_ID = '6a019d2af2fe3f27cc61a55c'; // Current testing profile reference

const AnnouncementScreen = () => {
  const { theme } = useTheme();

  // ==========================================
  // FEED LIFECYCLE STATES
  // ==========================================
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active form management mapping
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [audience, setAudience] = useState<'all' | 'students' | 'teachers' | 'batch' | 'class'>('all');
  const [targetId, setTargetId] = useState<string>(''); // General payload input tracking batchId/classId references
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [hasExpiration, setHasExpiration] = useState<boolean>(false);
  const [expiresAtText, setExpiresAtText] = useState<string>('');

  useEffect(() => {
    fetchFeedData();
  }, []);

  // Primary network querying mapping role specific queries
  const fetchFeedData = async () => {
    setIsLoading(true);
    try {
      let response;
      if (ACTIVE_USER_ROLE === 'admin') {
        response = await announcementApi.getAll();
      } else if (ACTIVE_USER_ROLE === 'teacher') {
        response = await announcementApi.getTeacherFeed();
      } else {
        response = await announcementApi.getStudentFeed();
      }

      if (response?.success) {
        setAnnouncements(response.data);
      }
    } catch (error: any) {
      Alert.alert(
        'Network Error',
        error.response?.data?.message || 'Data sync operation dropped.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Pull-to-refresh execution flow
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      let response;
      if (ACTIVE_USER_ROLE === 'admin') {
        response = await announcementApi.getAll();
      } else if (ACTIVE_USER_ROLE === 'teacher') {
        response = await announcementApi.getTeacherFeed();
      } else {
        response = await announcementApi.getStudentFeed();
      }

      if (response?.success) {
        setAnnouncements(response.data);
      }
    } catch (error: any) {
      Alert.alert('Sync Drop', error.response?.data?.message || 'Unable to update noticeboard feed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Clear tracking contexts cleanly
  const resetFormState = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setAudience(ACTIVE_USER_ROLE === 'teacher' ? 'batch' : 'all');
    setTargetId('');
    setIsPinned(false);
    setHasExpiration(false);
    setExpiresAtText('');
    Keyboard.dismiss();
  };

  // Populate dynamic form attributes from record mappings
  const handleTriggerEdit = (item: Announcement) => {
    setEditingId(item._id);
    setTitle(item.title);
    setContent(item.content);
    setAudience(item.audience);
    
    // Resolve dynamic parameter variables mapped internally
    if (item.audience === 'batch' && item.batchId) {
      setTargetId(typeof item.batchId === 'object' ? item.batchId._id : item.batchId);
    } else if (item.audience === 'class' && item.classId) {
      setTargetId(typeof item.classId === 'object' ? item.classId._id : item.classId);
    } else {
      setTargetId('');
    }

    setIsPinned(item.isPinned);
    if (item.expiresAt) {
      setHasExpiration(true);
      setExpiresAtText(item.expiresAt.split('T')[0]);
    } else {
      setHasExpiration(false);
      setExpiresAtText('');
    }
  };

  // Native input dialog option selection mapping audiences cleanly
  const handleAudienceSelection = () => {
    const options = ACTIVE_USER_ROLE === 'teacher' 
      ? ['Cancel', 'Specific Batch', 'Specific Class'] 
      : ['Cancel', 'Broadcast All', 'Students Only', 'Teachers Only', 'Specific Batch', 'Specific Class'];

    const audiencesMapping: { [key: string]: 'all' | 'students' | 'teachers' | 'batch' | 'class' } = ACTIVE_USER_ROLE === 'teacher'
      ? { 'Specific Batch': 'batch', 'Specific Class': 'class' }
      : { 
          'Broadcast All': 'all', 
          'Students Only': 'students', 
          'Teachers Only': 'teachers', 
          'Specific Batch': 'batch', 
          'Specific Class': 'class' 
        };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedText = options[buttonIndex];
            setAudience(audiencesMapping[selectedText]);
            setTargetId(''); // Clear target mappings if tracking boundaries shift
          }
        }
      );
    } else {
      // Alert mapping fallback processing standard Android input selectors
      Alert.alert('Select Target Audience', 'Choose notice group mapping targets:', [
        { text: 'Broadcast All', onPress: () => { setAudience('all'); setTargetId(''); } },
        { text: 'Students Only', onPress: () => { setAudience('students'); setTargetId(''); } },
        { text: 'Specific Batch', onPress: () => { setAudience('batch'); setTargetId(''); } },
        { text: 'Specific Class', onPress: () => { setAudience('class'); setTargetId(''); } },
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  // Process commit instructions formatting database records
  const handleSaveOrUpdate = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Input Validation', 'Title aur Content parameters required hain.');
      return;
    }

    if (audience === 'batch' && !targetId.trim()) {
      Alert.alert('Input Validation', 'Batch announcement ke liye target batchId required hai.');
      return;
    }

    if (audience === 'class' && !targetId.trim()) {
      Alert.alert('Input Validation', 'Class announcement ke liye target classId required hai.');
      return;
    }

    // Role mapping fallback validations
    if (ACTIVE_USER_ROLE === 'teacher' && audience === 'all') {
      Alert.alert('Permission Denied', 'Teacher profiles strictly broadcast to assigned classes or specific batches.');
      return;
    }

    let parsedExpiresAt: string | null = null;
    if (hasExpiration) {
      const cleanExp = expiresAtText.trim();
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoRegex.test(cleanExp)) {
        Alert.alert('Format Error', 'Expiration parameter string ko strictly YYYY-MM-DD format mein set karein.');
        return;
      }
      parsedExpiresAt = new Date(cleanExp).toISOString();
    }

    setIsSubmitting(true);

    const payload: CreateAnnouncementPayload = {
      title: title.trim(),
      content: content.trim(),
      audience,
      isPinned,
      expiresAt: parsedExpiresAt,
      ...(audience === 'batch' ? { batchId: targetId.trim() } : {}),
      ...(audience === 'class' ? { classId: targetId.trim() } : {})
    };

    try {
      let response;
      if (editingId) {
        response = await announcementApi.update(editingId, payload);
      } else {
        response = await announcementApi.create(payload);
      }

      if (response.success) {
        Alert.alert('Transaction Successful', editingId ? 'Updated Successfully' : 'Noticeboard broadcast setup complete.');
        resetFormState();
        fetchFeedData();
      }
    } catch (error: any) {
      Alert.alert('Execution Drop', error.response?.data?.message || 'Unable to push database state updates.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute database soft delete routines
  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirm Wipe',
      'Do you want to Delete ',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await announcementApi.delete(id);
              if (response.success) {
                if (editingId === id) resetFormState();
                fetchFeedData();
              }
            } catch (error: any) {
              Alert.alert('Wipe Interrupted', error.response?.data?.message || 'Database target block failed.');
            }
          }
        }
      ]
    );
  };

  // Card list view item builder
  const renderAnnouncementCard = ({ item }: { item: Announcement }) => {
    // Controller authorization verifies operational item ownership
    const isOwner = item.createdBy._id === ACTIVE_USER_ID;
    const canModify = ACTIVE_USER_ROLE === 'admin' || (ACTIVE_USER_ROLE === 'teacher' && isOwner);

    // Resolve target item mappings safely
    const targetLabelName = item.audience === 'batch' && typeof item.batchId === 'object' ? item.batchId.name 
      : item.audience === 'class' && typeof item.classId === 'object' ? item.classId.name 
      : item.audience.toUpperCase();

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWrapper}>
            {item.isPinned && <Text style={{ fontSize: 16, marginRight: 4 }}>📌</Text>}
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
          </View>

          <View style={[styles.audienceBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{targetLabelName}</Text>
          </View>
        </View>

        <Text style={[styles.cardContent, { color: theme.text }]}>{item.content}</Text>

        <View style={styles.footerInfo}>
          <Text style={[styles.authorText, { color: theme.subText }]}>
            By: {item.createdBy.firstName} {item.createdBy.lastName} ({item.createdBy.role})
          </Text>
          
          <Text style={[styles.dateText, { color: theme.subText }]}>
            {item.createdAt.split('T')[0]}
          </Text>
        </View>

        {/* Edit and Delete operations exposed only to authorized publishers */}
        {canModify && (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={styles.actionButton}>
              <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionButton}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      
      {/* 1. BROADCAST MODULE CONTROLS (Rendered strictly for publishing user roles) */}
      {ACTIVE_USER_ROLE !== 'student' && (
        <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.formHeaderRow}>
            <Text style={[styles.formTitle, { color: theme.text }]}>
              {editingId ? 'Modify Notice Payload' : 'Create Notice Broadcast'}
            </Text>

            {editingId && (
              <TouchableOpacity onPress={resetFormState}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="Notice Title"
            placeholderTextColor={theme.subText}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="Write announcement body message here..."
            placeholderTextColor={theme.subText}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* AUDIENCE SELECTOR ENGINE */}
          <View style={styles.audienceControlsRow}>
            <Text style={[styles.inputLabel, { color: theme.text, width: '30%' }]}>Audience:</Text>
            <TouchableOpacity 
              style={[styles.audienceSelectionButton, { borderColor: theme.border, backgroundColor: theme.background }]} 
              onPress={handleAudienceSelection}
            >
              <Text style={{ color: theme.text, fontWeight: '600', textTransform: 'capitalize' }}>{audience}</Text>
            </TouchableOpacity>
          </View>

          {/* DYNAMIC TARGET ID ENTRY */}
          {(audience === 'batch' || audience === 'class') && (
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder={`Enter target ${audience} ID reference`}
              placeholderTextColor={theme.subText}
              value={targetId}
              onChangeText={setTargetId}
              autoCapitalize="none"
            />
          )}

          {/* TIMELINE EXPIRATION TOGGLES */}
          <View style={styles.switchRow}>
            <Text style={{ color: theme.text, fontWeight: '500' }}>Set Notice Auto-Expiration Date</Text>
            <Switch value={hasExpiration} onValueChange={setHasExpiration} thumbColor={theme.primary} />
          </View>

          {hasExpiration && (
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Expiration Target (YYYY-MM-DD)"
              placeholderTextColor={theme.subText}
              value={expiresAtText}
              onChangeText={setExpiresAtText}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          )}

          {/* PIN STATUS SETTING */}
          <View style={styles.switchRow}>
            <Text style={{ color: theme.text, fontWeight: '500' }}>Pin Notice to Top of Feed</Text>
            <Switch value={isPinned} onValueChange={setIsPinned} thumbColor={theme.primary} />
          </View>

          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: theme.primary }]}
            onPress={handleSaveOrUpdate}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>{editingId ? 'Commit Update' : 'Broadcast Message'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 2. NOTICEBOARD FEED REGISTRY */}
      <Text style={[styles.listHeader, { color: theme.text }]}>Active Communications Feed</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item._id}
          renderItem={renderAnnouncementCard}
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
            <Text style={[styles.emptyText, { color: theme.subText }]}>Koi active broadcast records available nahi hain.</Text>
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
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  textArea: { height: 76, paddingVertical: 10 },
  audienceControlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  audienceSelectionButton: { flex: 1, height: 44, borderWidth: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  listHeader: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  titleWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flexShrink: 1 },
  audienceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  cardContent: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  footerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorText: { fontSize: 12, fontStyle: 'italic' },
  dateText: { fontSize: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 10, marginTop: 10 },
  actionButton: { marginLeft: 16, paddingVertical: 4 },
  editText: { fontWeight: 'bold', fontSize: 14 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 15 },
});

export default AnnouncementScreen;
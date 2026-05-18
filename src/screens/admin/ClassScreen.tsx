import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
  ActivityIndicator, Alert, Switch, Keyboard, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { classApi, ClassItem } from '../../api/classApi';

const ACTIVE_USER_ROLE: 'admin' | 'teacher' | 'student' = 'admin';

const ClassScreen = () => {
  const { theme } = useTheme();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    fetchClassRegistry();
  }, []);

  const fetchClassRegistry = async () => {
    setIsLoading(true);
    try {
      const response = await classApi.getAll();
      if (response?.success) {
        setClasses(response.data);
      }
    } catch (error: any) {
      Alert.alert('Network Sync Error', error.response?.data?.message || 'Failed to update Class list.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await classApi.getAll();
      if (response?.success) {
        setClasses(response.data);
      }
    } catch (error: any) {
      Alert.alert('Refresh Terminated', error.response?.data?.message || 'Unable to update class mapping targets.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetFormState = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setIsActive(true);
    Keyboard.dismiss();
  };

  const handleTriggerEdit = (item: ClassItem) => {
    setEditingId(item._id);
    setName(item.name);
    setDescription(item.description || '');
    setIsActive(item.isActive);
  };

  const handleSaveOrUpdate = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Input Validation', 'Class Fields are required ');
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      if (editingId) {
        response = await classApi.update(editingId, { 
          name: cleanName, 
          description: description.trim() || undefined, 
          isActive 
        });
      } else {
        response = await classApi.create({ 
          name: cleanName, 
          description: description.trim() || undefined 
        });
      }

      if (response.success) {
        Alert.alert('Success', editingId ? 'Class parameters updated successfully.' : 'Classes create Successfully');
        resetFormState();
        fetchClassRegistry();
      }
    } catch (error: any) {
      Alert.alert('Execution Dropped', error.response?.data?.message || 'Transaction execution failure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to remove this root Class definition from system operations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await classApi.delete(id);
              if (response.success) {
                if (editingId === id) resetFormState();
                fetchClassRegistry();
              }
            } catch (error: any) {
              // Emphasize relational DB block explicitly mapped inside controllers
              Alert.alert('Wipe Blocked', error.response?.data?.message || 'Database block failed.');
            }
          }
        }
      ]
    );
  };

  const renderClassCard = ({ item }: { item: ClassItem }) => {
    const isAdmin = ACTIVE_USER_ROLE === 'admin';
    const batchCount = item.batches ? item.batches.length : 0;

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          
          <View style={[styles.badge, { backgroundColor: item.isActive ? theme.primary : '#757575' }]}>
            <Text style={styles.badgeText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

        {item.description ? <Text style={[styles.descText, { color: theme.subText }]}>{item.description}</Text> : null}

        <Text style={[styles.infoText, { color: theme.text, marginTop: 4 }]}>
          Linked Groupings: <Text style={{ fontWeight: 'bold' }}>{batchCount} active batch(es)</Text>
        </Text>

        {isAdmin && (
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
      {ACTIVE_USER_ROLE === 'admin' && (
        <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.formHeaderRow}>
            <Text style={[styles.formTitle, { color: theme.text }]}>
              {editingId ? 'Modify Root Class' : 'Define Root Class'}
            </Text>
            {editingId && (
              <TouchableOpacity onPress={resetFormState}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="Class Name (e.g. 10th Grade)"
            placeholderTextColor={theme.subText}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="Description info string"
            placeholderTextColor={theme.subText}
            value={description}
            onChangeText={setDescription}
          />

          {editingId && (
            <View style={styles.switchRow}>
              <Text style={{ color: theme.text, fontWeight: '500' }}>System Base Record State</Text>
              <Switch value={isActive} onValueChange={setIsActive} thumbColor={theme.primary} />
            </View>
          )}

          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: theme.primary }]}
            onPress={handleSaveOrUpdate}
            disabled={isSubmitting}
          >
            {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{editingId ? 'Update Parameter' : 'Submit'}</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.listHeader, { color: theme.text }]}>Root Classes Mapped</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item._id}
          renderItem={renderClassCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.subText }]}>No root configuration strings mapped inside DB context.</Text>}
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
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  listHeader: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  descText: { fontSize: 13, marginBottom: 4 },
  infoText: { fontSize: 13 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 10, marginTop: 8 },
  actionButton: { marginLeft: 16, paddingVertical: 4 },
  editText: { fontWeight: 'bold', fontSize: 14 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 15 },
});

export default ClassScreen;
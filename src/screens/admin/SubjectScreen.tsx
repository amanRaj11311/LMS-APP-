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
  Keyboard,
  Modal,
  RefreshControl,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeContext';

// API Imports
import { subjectApi, Subject } from '../../api/subjectApi';
import { classApi, ClassItem } from '../../api/classApi';
import { batchApi, Batch } from '../../api/batchApi';
import { userApi } from '../../api/userApi';

const ACTIVE_USER_ROLE = 'admin';

const SubjectScreen = () => {
  const { theme } = useTheme();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    fetchCoreData();
  }, []);

  const fetchCoreData = async () => {
    setIsLoading(true);

    try {
      const [subjectRes, classRes, userRes, batchRes] = await Promise.all([
        ACTIVE_USER_ROLE === 'teacher'
          ? subjectApi.getMySubjects()
          : subjectApi.getAll(),

        classApi.getAll(),

        userApi.getAll(),

        batchApi.getAll(),
      ]);

      // Subjects
      if (subjectRes?.success) {
        setSubjects(subjectRes.data);
      }

      // Classes
      if (classRes?.success) {
        setAvailableClasses(classRes.data);
      }

      // Teachers Only
      if (userRes?.success) {
        const teachers = userRes.data.filter(
          (user: any) =>
            user.role === 'teacher' &&
            user.isActive &&
            !user.isDeleted
        );

        setAvailableTeachers(teachers);

        console.log('Teachers Loaded:', teachers);
      }

      // Batches
      if (batchRes?.success) {
        setAvailableBatches(batchRes.data);
      }
    } catch (error: any) {
      Alert.alert(
        'Sync Error',
        'Failed to load configuration data.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchCoreData();
  };

  const resetFormState = () => {
    setEditingId(null);

    setName('');
    setCode('');
    setSelectedClassId('');
    setSelectedBatchId('');
    setSelectedTeacherId('');
    setDescription('');
    setIsActive(true);

    setIsModalVisible(false);

    Keyboard.dismiss();
  };

  const handleTriggerEdit = (item: Subject) => {
    setEditingId(item._id);

    setName(item.name);
    setCode(item.code);

    setSelectedClassId(
      typeof item.classId === 'object'
        ? item.classId._id
        : item.classId
    );

    setSelectedBatchId(
      typeof item.batchId === 'object'
        ? item.batchId._id
        : item.batchId || ''
    );

    setSelectedTeacherId(
      typeof item.teacherId === 'object'
        ? item.teacherId._id
        : item.teacherId
    );

    setDescription(item.description || '');

    setIsActive(item.isActive);

    setIsModalVisible(true);
  };

  const handleSaveOrUpdate = async () => {
    if (
      !name.trim() ||
      !code.trim() ||
      !selectedClassId ||
      !selectedBatchId ||
      !selectedTeacherId
    ) {
      Alert.alert(
        'Validation Error',
        'Please fill all required fields.'
      );

      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      classId: selectedClassId,
      batchId: selectedBatchId,
      teacherId: selectedTeacherId,
      description: description.trim() || undefined,
    };

    try {
      const response = editingId
        ? await subjectApi.update(editingId, {
            ...payload,
            isActive,
          })
        : await subjectApi.create(payload);

      if (response.success) {
        Alert.alert(
          'Success',
          editingId
            ? 'Subject updated successfully.'
            : 'Subject created successfully.'
        );

        resetFormState();

        fetchCoreData();
      } else {
        Alert.alert(
          'Error',
          response.message || 'Operation failed.'
        );
      }
    } catch (error: any) {
      const backendError =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Unknown Server Error';

      Alert.alert(
        'Transaction Blocked',
        backendError
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Subject',
      'Are you sure you want to delete this subject?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await subjectApi.delete(id);

              if (res.success) {
                fetchCoreData();
              }
            } catch (e) {
              Alert.alert(
                'Error',
                'Could not delete subject.'
              );
            }
          },
        },
      ]
    );
  };

  // Filter batches according to class
  const filteredBatches = availableBatches.filter(
    (batch) => {
      if (!selectedClassId) return false;

      const batchClassId =
        typeof batch.classId === 'object'
          ? batch.classId?._id
          : batch.classId;

      return batchClassId === selectedClassId;
    }
  );

  const renderSubjectCard = ({
    item,
  }: {
    item: Subject;
  }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text
          style={[
            styles.cardTitle,
            { color: theme.text },
          ]}
          numberOfLines={1}
        >
          {item.name}{' '}
          <Text
            style={{
              color: theme.subText,
              fontSize: 13,
            }}
          >
            ({item.code})
          </Text>
        </Text>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: item.isActive
                ? theme.primary + '20'
                : '#E5E7EB',
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: item.isActive
                  ? theme.primary
                  : '#6B7280',
              },
            ]}
          >
            {item.isActive
              ? 'Active'
              : 'Inactive'}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.infoText,
          { color: theme.subText },
        ]}
      >
        Class:{' '}
        <Text
          style={{
            fontWeight: '600',
            color: theme.text,
          }}
        >
          {typeof item.classId === 'object'
            ? item.classId.name
            : 'N/A'}
        </Text>{' '}
        | Batch:{' '}
        <Text
          style={{
            fontWeight: '600',
            color: theme.text,
          }}
        >
          {typeof item.batchId === 'object'
            ? item.batchId.name
            : 'N/A'}
        </Text>
      </Text>

      {ACTIVE_USER_ROLE === 'admin' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => handleTriggerEdit(item)}
            style={styles.actionButton}
          >
            <Text
              style={{
                color: theme.primary,
                fontWeight: '700',
              }}
            >
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDelete(item._id)}
            style={styles.actionButton}
          >
            <Text
              style={{
                color: '#EF4444',
                fontWeight: '700',
              }}
            >
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.loaderContainer,
          {
            backgroundColor: theme.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
      edges={['bottom']}
    >
      <View style={styles.headerArea}>
        <Text
          style={[
            styles.listHeader,
            { color: theme.text },
          ]}
        >
          All Subjects
        </Text>

        {ACTIVE_USER_ROLE === 'admin' && (
          <TouchableOpacity
            style={[
              styles.createBtn,
              {
                backgroundColor: theme.primary,
              },
            ]}
            onPress={() =>
              setIsModalVisible(true)
            }
          >
            <Text
              style={{
                color: '#FFF',
                fontWeight: 'bold',
              }}
            >
              + New Subject
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MODAL */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.surface,
              },
            ]}
          >
            <View style={styles.formHeaderRow}>
              <Text
                style={[
                  styles.formTitle,
                  { color: theme.text },
                ]}
              >
                {editingId
                  ? 'Edit Subject'
                  : 'Add Subject'}
              </Text>

              <TouchableOpacity
                onPress={resetFormState}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
            >
              {/* NAME + CODE */}
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text
                    style={[
                      styles.inputLabel,
                      {
                        color: theme.subText,
                      },
                    ]}
                  >
                    SUBJECT NAME{' '}
                    <Text style={styles.requiredStar}>
                      *
                    </Text>
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor:
                          theme.background,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="Mathematics"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <View style={styles.halfInput}>
                  <Text
                    style={[
                      styles.inputLabel,
                      {
                        color: theme.subText,
                      },
                    ]}
                  >
                    SUBJECT CODE{' '}
                    <Text style={styles.requiredStar}>
                      *
                    </Text>
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor:
                          theme.background,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="MATH101"
                    placeholderTextColor="#9CA3AF"
                    value={code}
                    onChangeText={setCode}
                  />
                </View>
              </View>

              {/* CLASS */}
              <Text
                style={[
                  styles.inputLabel,
                  {
                    color: theme.subText,
                  },
                ]}
              >
                CLASS{' '}
                <Text style={styles.requiredStar}>
                  *
                </Text>
              </Text>

              <View
                style={[
                  styles.pickerWrapper,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Picker
                  selectedValue={selectedClassId}
                  onValueChange={(value) => {
                    setSelectedClassId(value);
                    setSelectedBatchId('');
                    setSelectedTeacherId('');
                  }}
                  style={{ color: theme.text }}
                >
                  <Picker.Item
                    label="Select class"
                    value=""
                    color="#9CA3AF"
                  />

                  {availableClasses.map((c) => (
                    <Picker.Item
                      key={c._id}
                      label={c.name}
                      value={c._id}
                    />
                  ))}
                </Picker>
              </View>

              {/* BATCH */}
              <Text
                style={[
                  styles.inputLabel,
                  {
                    color: theme.subText,
                  },
                ]}
              >
                BATCH{' '}
                <Text style={styles.requiredStar}>
                  *
                </Text>
              </Text>

              <View
                style={[
                  styles.pickerWrapper,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor: theme.border,
                    opacity: selectedClassId
                      ? 1
                      : 0.5,
                  },
                ]}
              >
                <Picker
                  selectedValue={selectedBatchId}
                  onValueChange={(value) => {
                    setSelectedBatchId(value);
                    setSelectedTeacherId('');
                  }}
                  enabled={!!selectedClassId}
                  style={{ color: theme.text }}
                >
                  <Picker.Item
                    label={
                      selectedClassId
                        ? 'Select batch'
                        : 'Select class first'
                    }
                    value=""
                    color="#9CA3AF"
                  />

                  {filteredBatches.map((b) => (
                    <Picker.Item
                      key={b._id}
                      label={b.name}
                      value={b._id}
                    />
                  ))}
                </Picker>
              </View>

              {/* TEACHER */}
              <Text
                style={[
                  styles.inputLabel,
                  {
                    color: theme.subText,
                  },
                ]}
              >
                ASSIGNED TEACHER{' '}
                <Text style={styles.requiredStar}>
                  *
                </Text>
              </Text>

              <View
                style={[
                  styles.pickerWrapper,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor: theme.border,
                    opacity: selectedBatchId
                      ? 1
                      : 0.5,
                  },
                ]}
              >
                <Picker
                  selectedValue={selectedTeacherId}
                  onValueChange={setSelectedTeacherId}
                  enabled={!!selectedBatchId}
                  style={{ color: theme.text }}
                >
                  <Picker.Item
                    label={
                      selectedBatchId
                        ? 'Select teacher'
                        : 'Select batch first'
                    }
                    value=""
                    color="#9CA3AF"
                  />

                  {availableTeachers.map(
                    (teacher: any) => (
                      <Picker.Item
                        key={teacher._id}
                        label={`${teacher.firstName} ${teacher.lastName}`}
                        value={teacher._id}
                      />
                    )
                  )}
                </Picker>
              </View>

              {/* DESCRIPTION */}
              <Text
                style={[
                  styles.inputLabel,
                  {
                    color: theme.subText,
                  },
                ]}
              >
                DESCRIPTION
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor:
                      theme.background,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Enter subject description..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              {/* BUTTONS */}
              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    {
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={resetFormState}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: '600',
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor:
                        theme.primary,
                    },
                  ]}
                  onPress={handleSaveOrUpdate}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFF"
                    />
                  ) : (
                    <Text
                      style={{
                        color: '#FFF',
                        fontWeight: 'bold',
                      }}
                    >
                      {editingId
                        ? 'Update'
                        : 'Save'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* LIST */}
      <FlatList
        data={subjects}
        keyExtractor={(item) => item._id}
        renderItem={renderSubjectCard}
        contentContainerStyle={{
          paddingBottom: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },

  listHeader: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  infoText: {
    fontSize: 14,
    marginTop: 4,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },

  actionButton: {
    marginLeft: 24,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },

  modalContent: {
    padding: 24,
    borderRadius: 16,
    maxHeight: '90%',
  },

  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  formTitle: {
    fontSize: 20,
    fontWeight: '800',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  halfInput: {
    width: '48%',
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },

  requiredStar: {
    color: '#EF4444',
  },

  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    fontSize: 14,
  },

  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },

  pickerWrapper: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
    justifyContent: 'center',
  },

  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },

  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 12,
  },

  saveBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
  },
});

export default SubjectScreen;
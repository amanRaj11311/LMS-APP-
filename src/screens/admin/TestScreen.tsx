import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, 
  Modal, ScrollView, ActivityIndicator, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeContext';
import { testApi } from '../../api/testApi'; 
import { subjectApi } from '../../api/subjectApi';
import { batchApi } from '../../api/batchApi';

const TestScreen = ({ navigation }: { navigation: any }) => {
  const { theme, isDark } = useTheme();
  const [role, setRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [tests, setTests] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [createModal, setCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);

  // 🌟 LOGIC: Batch -> Subject Dependency
  const filteredSubjects = useMemo(() => {
      if (!batchId) return [];
      return subjects.filter(s => s.batchId?._id === batchId);
  }, [batchId, subjects]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem("user_data");
      const user = stored ? JSON.parse(stored) : {};
      const userRole = (user.role?.name || user.role || 'student').toLowerCase();
      setRole(userRole);

      const [testRes, subRes, batRes] = await Promise.allSettled([
        userRole === 'student' ? testApi.getMyTests() : testApi.getAll(),
        subjectApi.getAll(),
        batchApi.getAll()
      ]);

      if(testRes.status === 'fulfilled') {
          setTests(testRes.value.data || []);
      }
      if(subRes.status === 'fulfilled') setSubjects(subRes.value.data || []);
      if(batRes.status === 'fulfilled') setBatches(batRes.value.data || []);
    } catch (e) { console.log(e); }
    setIsLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const resetForm = () => {
    setEditingId(null);
    setTitle(''); setDescription(''); setBatchId(''); setSubjectId(''); setDuration('');
    setQuestions([]);
  };

  const addQuestion = () => {
    setQuestions([...questions, { 
      questionType: 'MCQ', questionText: '', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: '' 
    }]);
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const removeQuestion = (qIndex: number) => {
    const updated = [...questions];
    updated.splice(qIndex, 1);
    setQuestions(updated);
  };

  const handleTriggerEdit = (item: any) => {
    setEditingId(item._id);
    setTitle(item.title);
    setDescription(item.description || '');
    setBatchId(item.batchId?._id || item.batchId || '');
    setSubjectId(item.subjectId?._id || item.subjectId || '');
    setDuration(item.duration ? item.duration.toString() : '');
    setQuestions(item.questions || []);
    setCreateModal(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try { await testApi.delete(id); fetchData(); } catch (e: any) { Alert.alert("Error", "Could not delete."); }
        } 
      }
    ]);
  };

  const handleCreateTest = async () => {
    if(!title || !batchId || !subjectId) return Alert.alert("Required", "Fields missing.");
    setIsSubmitting(true);
    try {
      const payload = { title, description, batchId, subjectId, duration: duration ? Number(duration) : null, questions };
      if (editingId) { await testApi.update(editingId, payload); Alert.alert("Success", "Updated!"); } 
      else { await testApi.create(payload); Alert.alert("Success", "Created!"); }
      setCreateModal(false);
      resetForm();
      fetchData();
    } catch (e: any) { Alert.alert("Error", e.response?.data?.message || "Failed"); }
    finally { setIsSubmitting(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.listHeader, { color: theme.text }]}>Tests</Text>
        {role !== 'student' && (
           <TouchableOpacity style={[styles.newBtnTop, { backgroundColor: theme.primary }]} onPress={() => { resetForm(); setCreateModal(true); }}>
             <Text style={{ color: '#FFF', fontWeight: 'bold' }}>+ New</Text>
           </TouchableOpacity>
        )}
      </View>

      <FlatList 
        data={tests}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} colors={[theme.primary]} />}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text }}>{item.title}</Text>
            <Text style={{color: theme.subText, fontSize: 12, marginTop: 4}}>Subject: {item.subjectId?.name || 'N/A'} | Batch: {item.batchId?.name || 'N/A'}</Text>
            <Text style={{color: theme.subText, fontSize: 12, marginTop: 4}}>Duration: {item.duration || 0}m | Questions: {item.questions?.length || 0}</Text>
            <View style={styles.actionRow}>
                {/* 🌟 FIX: Student Role Check Logic Restored Here */}
                {role === 'student' ? (
                  <TouchableOpacity 
                    style={[styles.viewStartBtn, {backgroundColor: theme.primary, paddingHorizontal: 16}]} 
                    onPress={() => navigation.navigate('TakeTestScreen', { testData: item })}
                  >
                    <Text style={{color: '#FFF', fontWeight: 'bold'}}>View & Start</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleTriggerEdit(item)}>
                      <Text style={{color: theme.primary, fontWeight: 'bold'}}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item._id)}>
                      <Text style={{color: '#EF4444', fontWeight: 'bold'}}>Delete</Text>
                    </TouchableOpacity>
                  </>
                )}
            </View>
          </View>
        )}

        ListEmptyComponent={!isLoading ? <Text style={{ textAlign: 'center', marginTop: 40, fontSize: 16, color: theme.subText }}>No record found</Text> : null}
      />

      {/* CREATE/EDIT MODAL */}
      <Modal visible={createModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeaderRow}>
                <Text style={[styles.formTitle, {color: theme.text}]}>{editingId ? 'Edit Test' : 'Create New'}</Text>
                <TouchableOpacity onPress={() => setCreateModal(false)}><MaterialIcons name="close" size={24} color={theme.text}/></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, {color: theme.text}]}>TITLE *</Text>
              <TextInput style={[styles.input, {color: theme.text, backgroundColor: theme.background, borderColor: theme.border}]} placeholder="Title" placeholderTextColor={theme.subText} value={title} onChangeText={setTitle} />
              
              <Text style={[styles.label, {color: theme.text}]}>DESCRIPTION</Text>
              <TextInput style={[styles.input, {color: theme.text, backgroundColor: theme.background, borderColor: theme.border}]} placeholder="Description" placeholderTextColor={theme.subText} value={description} onChangeText={setDescription} />

             <Text style={[styles.label, { color: theme.text }]}>BATCH *</Text>

<View
  style={[
    styles.pickerWrapper,
    {
      backgroundColor: theme.background,
      borderColor: theme.border,
      opacity: editingId ? 0.6 : 1,
    },
  ]}
>
  <Picker
    mode="dialog"
    themeVariant="light"
    dropdownIconColor={theme.text}
    enabled={!editingId}
    selectedValue={batchId}
    onValueChange={(val) => {
      setBatchId(val);
      setSubjectId('');
    }}
    style={[
      styles.picker,
      {
        color: isDark ? '#FFFFFF' : '#000000',
        backgroundColor: theme.background,
      },
    ]}
  >
    <Picker.Item
      label="Select batch"
      value=""
      color={isDark ? '#000000' : '#000000'}
    />

    {batches.map((b) => (
      <Picker.Item
        key={b._id}
        label={b.name}
        value={b._id}
        color="#000000"
      />
    ))}
  </Picker>
</View>

             <Text style={[styles.label, { color: theme.text }]}>SUBJECT *</Text>

<View
  style={[
    styles.pickerWrapper,
    {
      backgroundColor: theme.background,
      borderColor: theme.border,
      opacity: editingId ? 0.6 : batchId ? 1 : 0.5,
    },
  ]}
>
  <Picker
    mode="dialog"
    themeVariant="light"
    dropdownIconColor={theme.text}
    enabled={!editingId && !!batchId}
    selectedValue={subjectId}
    onValueChange={setSubjectId}
    style={[
      styles.picker,
      {
        color: isDark ? '#FFFFFF' : '#000000',
        backgroundColor: theme.background,
      },
    ]}
  >
    <Picker.Item
      label={
        batchId
          ? filteredSubjects.length > 0
            ? 'Select subject'
            : 'No subjects for this batch'
          : 'Select batch first'
      }
      value=""
      color="#000000"
    />

    {filteredSubjects.map((s) => (
      <Picker.Item
        key={s._id}
        label={s.name}
        value={s._id}
        color="#000000"
      />
    ))}
  </Picker>
</View>

              <Text style={[styles.label, {color: theme.text}]}>DURATION (MINS)</Text>
              <TextInput style={[styles.input, {color: theme.text, backgroundColor: theme.background, borderColor: theme.border}]} placeholder="e.g. 30" placeholderTextColor={theme.subText} keyboardType="numeric" value={duration} onChangeText={setDuration} />

              <TouchableOpacity onPress={addQuestion} style={{marginVertical: 10}}><Text style={{color: theme.primary, fontWeight: 'bold'}}>+ Add Question</Text></TouchableOpacity>
              
              {questions.map((q, i) => (
                <View key={i} style={[styles.qBox, {borderColor: theme.border}]}>
                  <Text style={{color: theme.text, fontWeight: 'bold'}}>Q{i+1}:</Text>
                 <View
  style={[
    styles.pickerWrapper,
    {
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
  ]}
>
  <Picker
    mode="dialog"
    themeVariant="light"
    dropdownIconColor={theme.text}
    selectedValue={q.questionType}
    onValueChange={(v) => updateQuestion(i, 'questionType', v)}
    style={[
      styles.picker,
      {
        color: isDark ? '#FFFFFF' : '#000000',
        backgroundColor: theme.background,
      },
    ]}
  >
    <Picker.Item
      label="MCQ"
      value="MCQ"
      color="#000000"
    />

    <Picker.Item
      label="Short Answer"
      value="Short answer"
      color="#000000"
    />

    <Picker.Item
      label="Fill in the blanks"
      value="Fill in the blanks"
      color="#000000"
    />
  </Picker>
</View>
                  <TextInput style={[styles.input, {color: theme.text, backgroundColor: theme.background, borderColor: theme.border}]} placeholder="Question text" placeholderTextColor={theme.subText} value={q.questionText} onChangeText={(v) => updateQuestion(i, 'questionText', v)} />
                  
                  {q.questionType === 'MCQ' ? (
                     <View>
                         {q.options.map((opt: string, oIdx: number) => (
                            <TextInput key={oIdx} style={[styles.input, {color: theme.text, backgroundColor: theme.background, borderColor: theme.border}]} value={opt} onChangeText={(v) => updateOption(i, oIdx, v)} />
                         ))}
                     </View>
                  ) : (
                    <TextInput style={[styles.input, {color: theme.text, backgroundColor: theme.background, borderColor: theme.border}]} placeholder="Correct Answer" placeholderTextColor={theme.subText} value={q.correctAnswer} onChangeText={(v) => updateQuestion(i, 'correctAnswer', v)} />
                  )}
                  <TouchableOpacity onPress={() => removeQuestion(i)}><Text style={{color: 'red'}}>Remove Q</Text></TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={[styles.saveBtn, {backgroundColor: theme.primary}]} onPress={handleCreateTest}>
                  <Text style={{color: '#FFF', fontWeight: 'bold'}}>Save</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  listHeader: { fontSize: 20, fontWeight: 'bold' },
  newBtnTop: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginLeft: 10 },
  card: { padding: 16, marginBottom: 14, borderRadius: 12, borderWidth: 1 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  actionBtn: { marginLeft: 20, paddingVertical: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalContent: { padding: 20, borderRadius: 12, width: '90%', alignSelf: 'center' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 44, marginBottom: 15 },
  pickerWrapper: {
  borderWidth: 1,
  borderRadius: 8,
  marginBottom: 15,
  height: 50,
  justifyContent: 'center',
  overflow: 'hidden',
},
  label: { fontSize: 11, fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase' },
  qBox: { borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 10 },
  saveBtn: { paddingVertical: 13, alignItems: 'center', borderRadius: 9, marginTop: 10 },
  picker: {
  height: 50,
  width: '100%',
  color: '#000000',
},
  viewStartBtn: { paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' } // 🌟 Added style for view & start button
});

export default TestScreen;
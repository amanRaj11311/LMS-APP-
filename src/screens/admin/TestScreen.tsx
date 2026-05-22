import React, { useState, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, 
  Modal, ScrollView, ActivityIndicator, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { pick } from '@react-native-documents/picker'; // 🌟 Added Document Picker
import { useTheme } from '../../theme/ThemeContext';
import { testApi } from '../../api/testApi'; 
import { subjectApi } from '../../api/subjectApi';
import { batchApi } from '../../api/batchApi';

const TestScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();
  const [role, setRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [tests, setTests] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modals Visibility
  const [createModal, setCreateModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [studentInstructionsModal, setStudentInstructionsModal] = useState(false);
  
  // Active Test (for student)
  const [activeTest, setActiveTest] = useState<any>(null);

  // Form Metadata States (Shared for Create & Bulk)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState('');

  // Questions State for Create Test
  const [questions, setQuestions] = useState<any[]>([]);
  
  // 🌟 Added State for Bulk File
  const [excelFile, setExcelFile] = useState<any>(null);

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

      if(testRes.status === 'fulfilled') setTests(testRes.value.data || []);
      if(subRes.status === 'fulfilled') setSubjects(subRes.value.data || []);
      if(batRes.status === 'fulfilled') setBatches(batRes.value.data || []);
    } catch (e) { console.log(e); }
    setIsLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const resetForm = () => {
    setTitle(''); setDescription(''); setBatchId(''); setSubjectId(''); setDuration('');
    setQuestions([]);
    setExcelFile(null); // 🌟 Reset file
  };

  // --- QUESTION BUILDER LOGIC ---
  const addQuestion = () => {
    setQuestions([...questions, { 
      questionType: 'MCQ', 
      questionText: '', 
      options: ['Option A', 'Option B', 'Option C', 'Option D'], 
      correctAnswer: '' 
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

  const addOptionToQuestion = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push(`Option ${String.fromCharCode(65 + updated[qIndex].options.length)}`);
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.splice(optIndex, 1);
    setQuestions(updated);
  };

  const removeQuestion = (qIndex: number) => {
    const updated = [...questions];
    updated.splice(qIndex, 1);
    setQuestions(updated);
  };

  // --- SAVE HANDLERS ---
  const handleCreateTest = async () => {
    if(!title || !batchId || !subjectId) return Alert.alert("Required", "Title, Batch and Subject are required.");
    setIsSubmitting(true);
    try {
      const payload = { title, description, batchId, subjectId, duration: duration ? Number(duration) : null, questions };
      await testApi.create(payload);
      Alert.alert("Success", "Test created successfully!");
      setCreateModal(false);
      resetForm();
      fetchData();
    } catch (e: any) { Alert.alert("Error", e.response?.data?.message || "Failed to create test"); }
    finally { setIsSubmitting(false); }
  };

  // 🌟 Document Picker Logic Added
  const pickExcelFile = async () => {
    try {
      const res = await pick({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setExcelFile(res.assets[0]);
      }
    } catch (error) {
      console.log("File picker error", error);
    }
  };

  // 🌟 Updated Bulk Upload to use FormData
  const handleBulkUpload = async () => {
    if(!title || !batchId || !subjectId) return Alert.alert("Required", "Title, Batch and Subject are required.");
    if(!excelFile) return Alert.alert("Required", "Please select an Excel file to upload.");
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('batchId', batchId);
      formData.append('subjectId', subjectId);
      if(duration) formData.append('duration', duration);
      if(description) formData.append('description', description);
      
      formData.append('questionFile', {
        uri: excelFile.uri,
        name: excelFile.name,
        type: excelFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as any);

      await testApi.bulkUpload(formData);
      Alert.alert("Success", "Test created from Excel successfully!");
      setBulkModal(false);
      resetForm();
      fetchData();
    } catch (e: any) { 
      Alert.alert("Upload Error", e.response?.data?.message || "Failed to process bulk upload."); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.listHeader, { color: theme.text }]}>Tests</Text>
        {role !== 'student' && (
          <View style={{flexDirection: 'row'}}>
            <TouchableOpacity style={styles.bulkBtnTop} onPress={() => { resetForm(); setBulkModal(true); }}>
              <MaterialIcons name="upload-file" size={16} color="#666" style={{marginRight: 4}}/>
              <Text style={{ color: '#555', fontWeight: 'bold' }}>Bulk Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.newBtnTop, { backgroundColor: theme.primary }]} onPress={() => { resetForm(); setCreateModal(true); }}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>+ New Test</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* TEST LIST */}
      <FlatList 
        data={tests}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text }}>{item.title}</Text>
                <View style={[styles.badge, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
                    <Text style={{color: '#10B981', fontSize: 10, fontWeight: 'bold'}}>ACTIVE</Text>
                </View>
            </View>
            <View style={{flexDirection: 'row', marginTop: 10}}>
                <Text style={styles.metaText}><MaterialIcons name="book" size={12}/> {item.subjectId?.name || 'N/A'}</Text>
                <Text style={styles.metaText}><MaterialIcons name="group" size={12}/> {item.batchId?.name || 'N/A'}</Text>
                <Text style={styles.metaText}><MaterialIcons name="schedule" size={12}/> {item.duration ? `${item.duration} min` : 'Unlim.'}</Text>
                <Text style={styles.metaText}><MaterialIcons name="help-outline" size={12}/> {item.questions?.length || 0} Qs</Text>
            </View>

            {role === 'student' ? (
              <TouchableOpacity style={[styles.viewStartBtn, {backgroundColor: theme.primary}]} onPress={() => { setActiveTest(item); setStudentInstructionsModal(true); }}>
                  <MaterialIcons name="play-circle-outline" size={16} color="#FFF" style={{marginRight: 6}}/>
                  <Text style={{color: '#FFF', fontWeight: 'bold'}}>View & Start</Text>
              </TouchableOpacity>
            ) : (
               <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10}}>
                   <TouchableOpacity><MaterialIcons name="edit" size={20} color={theme.subText} style={{marginRight: 15}}/></TouchableOpacity>
                   <TouchableOpacity><MaterialIcons name="delete" size={20} color="#EF4444"/></TouchableOpacity>
               </View>
            )}
          </View>
        )}
      />

      {/* 1. STUDENT INSTRUCTIONS MODAL (View & Start Workflow) */}
      <Modal visible={studentInstructionsModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeaderRow}>
                <Text style={styles.formTitle}>{activeTest?.title}</Text>
                <TouchableOpacity onPress={() => setStudentInstructionsModal(false)}><MaterialIcons name="close" size={24}/></TouchableOpacity>
            </View>
            
            <View style={styles.testMetaGrid}>
               <View style={styles.metaBox}><Text style={styles.metaLabel}>BATCH</Text><Text style={styles.metaVal}>{activeTest?.batchId?.name}</Text></View>
               <View style={styles.metaBox}><Text style={styles.metaLabel}>SUBJECT</Text><Text style={styles.metaVal}>{activeTest?.subjectId?.name}</Text></View>
               <View style={styles.metaBox}><Text style={styles.metaLabel}>DURATION</Text><Text style={styles.metaVal}>{activeTest?.duration ? `${activeTest.duration} min` : 'Unlimited'}</Text></View>
               <View style={styles.metaBox}><Text style={styles.metaLabel}>QUESTIONS</Text><Text style={styles.metaVal}>{activeTest?.questions?.length || 0}</Text></View>
            </View>

            <View style={styles.instructionsBox}>
               <Text style={{fontWeight: 'bold', color: theme.text, marginBottom: 8}}>Instructions</Text>
               <Text style={styles.bulletText}>• Answer all questions before submitting.</Text>
               <Text style={styles.bulletText}>• You can flag questions to review later.</Text>
               <Text style={styles.bulletText}>• Use the palette to navigate between questions.</Text>
               <Text style={styles.bulletText}>• Test will auto-submit when time runs out.</Text>
               {activeTest?.description ? <Text style={[styles.bulletText, {marginTop: 5}]}>Extra: {activeTest.description}</Text> : null}
            </View>

            <View style={[styles.btnRow, {justifyContent: 'space-between'}]}>
              <TouchableOpacity style={[styles.cancelBtn, {flex: 0.4}]} onPress={() => setStudentInstructionsModal(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, {flex: 0.55, backgroundColor: '#4338CA'}]} onPress={() => {
                setStudentInstructionsModal(false); 
                // 🌟 Navigates to the new TakeTestScreen
                navigation.navigate('TakeTestScreen', { testData: activeTest }); 
              }}>
                 <Text style={{color:'#FFF', fontWeight: 'bold'}}>Start Test →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. CREATE NEW TEST MODAL (Admin/Teacher) */}
      <Modal visible={createModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '95%', width: '95%' }]}>
            <View style={styles.modalHeaderRow}>
                <Text style={styles.formTitle}>Create New Test</Text>
                <TouchableOpacity onPress={() => setCreateModal(false)}><MaterialIcons name="close" size={24}/></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <View style={styles.row}>
                <View style={styles.half}><Text style={styles.label}>TITLE *</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Chapter 3 Quiz" /></View>
                <View style={styles.half}><Text style={styles.label}>BATCH *</Text><View style={styles.pickerWrapper}><Picker selectedValue={batchId} onValueChange={setBatchId}><Picker.Item label="Select batch" value=""/>{batches.map(b => <Picker.Item key={b._id} label={b.name} value={b._id}/>)}</Picker></View></View>
              </View>
              
              <View style={styles.row}>
                <View style={styles.half}><Text style={styles.label}>SUBJECT *</Text><View style={styles.pickerWrapper}><Picker selectedValue={subjectId} onValueChange={setSubjectId}><Picker.Item label="Select subject" value=""/>{subjects.map(s => <Picker.Item key={s._id} label={s.name} value={s._id}/>)}</Picker></View></View>
                <View style={styles.half}><Text style={styles.label}>DURATION (MINUTES)</Text><TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="e.g. 30" /></View>
              </View>

              <Text style={styles.label}>DESCRIPTION</Text>
              <TextInput style={[styles.input, {height: 60, textAlignVertical: 'top'}]} value={description} onChangeText={setDescription} placeholder="Optional instructions for students..." multiline />

              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 10}}>
                  <Text style={{fontWeight: 'bold', fontSize: 12, color: theme.subText}}>QUESTIONS ({questions.length})</Text>
                  <TouchableOpacity onPress={addQuestion}><Text style={{color: '#2563EB', fontWeight: 'bold'}}>⊕ Add Question</Text></TouchableOpacity>
              </View>

              {questions.length === 0 ? (
                  <View style={styles.emptyQBox}>
                      <MaterialIcons name="assignment" size={30} color="#CCC" />
                      <Text style={{color: '#999', marginTop: 5}}>No questions yet</Text>
                      <Text style={{fontSize: 10, color: '#999'}}>Click "Add Question" to start building your test</Text>
                  </View>
              ) : (
                  questions.map((q, i) => (
                    <View key={i} style={styles.qBox}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                         <View style={styles.qNumberBadge}><Text style={{color: '#2563EB', fontWeight:'bold'}}>{i+1}</Text></View>
                         <View style={[styles.pickerWrapper, {flex: 1, height: 40, marginHorizontal: 10}]}><Picker selectedValue={q.questionType} onValueChange={(v) => updateQuestion(i, 'questionType', v)}><Picker.Item label="Multiple Choice (MCQ)" value="MCQ"/><Picker.Item label="Fill in the blanks" value="Fill in the blanks"/><Picker.Item label="Short answer" value="Short answer"/></Picker></View>
                         <TouchableOpacity onPress={() => removeQuestion(i)}><MaterialIcons name="close" size={20} color="#666" style={{marginTop: 10}}/></TouchableOpacity>
                      </View>

                      <Text style={styles.label}>QUESTION *</Text>
                      <TextInput style={[styles.input, {height: 60}]} placeholder="Enter your question here..." value={q.questionText} onChangeText={(v) => updateQuestion(i, 'questionText', v)} multiline/>
                      
                      {q.questionType === 'MCQ' && (
                        <>
                          <Text style={styles.label}>OPTIONS *</Text>
                          {q.options.map((opt: string, oIdx: number) => (
                              <View key={oIdx} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                                  <TouchableOpacity onPress={() => updateQuestion(i, 'correctAnswer', opt)} style={{marginRight: 10}}>
                                      <MaterialIcons name={q.correctAnswer === opt ? "radio-button-checked" : "radio-button-unchecked"} size={20} color={q.correctAnswer === opt ? "#2563EB" : "#CCC"}/>
                                  </TouchableOpacity>
                                  <TextInput style={[styles.input, {flex: 1, marginBottom: 0, height: 40}]} value={opt} onChangeText={(v) => updateOption(i, oIdx, v)}/>
                                  <TouchableOpacity onPress={() => removeOption(i, oIdx)} style={{marginLeft: 10}}><MaterialIcons name="remove-circle-outline" size={20} color="#999"/></TouchableOpacity>
                              </View>
                          ))}
                          <TouchableOpacity onPress={() => addOptionToQuestion(i)} style={{marginTop: 5, marginBottom: 10}}>
                              <Text style={{color: '#2563EB', fontSize: 12}}>⊕ Add Option</Text>
                              <Text style={{fontSize: 10, color: '#999', marginTop: 2}}>Click the circle to mark the correct answer</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  ))
              )}

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModal(false)}><Text style={{fontWeight: 'bold'}}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleCreateTest} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#FFF"/> : <Text style={{color:'#FFF', fontWeight: 'bold'}}>Create Test</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. BULK UPLOAD MODAL (Admin/Teacher) */}
      <Modal visible={bulkModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '95%', width: '95%' }]}>
            <View style={styles.modalHeaderRow}>
                <Text style={styles.formTitle}>Bulk Upload Questions via Excel</Text>
                <TouchableOpacity onPress={() => setBulkModal(false)}><MaterialIcons name="close" size={24}/></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <Text style={styles.label}>TITLE *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Chapter 5 Quiz" />
              
              <View style={styles.row}>
                <View style={styles.half}><Text style={styles.label}>BATCH *</Text><View style={styles.pickerWrapper}><Picker selectedValue={batchId} onValueChange={setBatchId}><Picker.Item label="Select batch" value=""/>{batches.map(b => <Picker.Item key={b._id} label={b.name} value={b._id}/>)}</Picker></View></View>
                <View style={styles.half}><Text style={styles.label}>SUBJECT *</Text><View style={styles.pickerWrapper}><Picker selectedValue={subjectId} onValueChange={setSubjectId}><Picker.Item label="Select batch first" value=""/>{subjects.map(s => <Picker.Item key={s._id} label={s.name} value={s._id}/>)}</Picker></View></View>
              </View>

              <View style={styles.row}>
                <View style={styles.half}><Text style={styles.label}>DURATION (MINUTES)</Text><TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="e.g. 30" /></View>
                <View style={styles.half}><Text style={styles.label}>DESCRIPTION</Text><TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Optional" /></View>
              </View>

              <Text style={[styles.label, {marginTop: 5}]}>Excel File *</Text>
              <View style={styles.guideBox}>
                  <Text style={{fontWeight:'bold', color: '#2563EB', marginBottom: 8}}><MaterialIcons name="description" size={14}/> Required Excel Template Format</Text>
                  <View style={{flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#DBEAFE', paddingBottom: 4, marginBottom: 4}}>
                      <Text style={[styles.guideHead, {flex: 1.5}]}>Question Type</Text>
                      <Text style={[styles.guideHead, {flex: 1.5}]}>Question</Text>
                      <Text style={[styles.guideHead, {flex: 2}]}>Options (MCQ)</Text>
                      <Text style={[styles.guideHead, {flex: 1}]}>Expected</Text>
                  </View>
                  <View style={{flexDirection: 'row'}}><Text style={[styles.guideText, {flex: 1.5, color: '#2563EB'}]}>MCQ</Text><Text style={[styles.guideText, {flex: 1.5, color: '#2563EB'}]}>What is...?</Text><Text style={[styles.guideText, {flex: 2, color: '#2563EB'}]}>A) Opt1, B) Opt2</Text><Text style={[styles.guideText, {flex: 1, color: '#2563EB'}]}>B</Text></View>
                  <View style={{flexDirection: 'row'}}><Text style={[styles.guideText, {flex: 1.5, color: '#2563EB'}]}>Fill in blanks</Text><Text style={[styles.guideText, {flex: 1.5, color: '#2563EB'}]}>The ___ is...</Text><Text style={[styles.guideText, {flex: 2, color: '#2563EB'}]}>---</Text><Text style={[styles.guideText, {flex: 1, color: '#2563EB'}]}>Answer</Text></View>
              </View>

              {/* 🌟 Updated File Picker Button */}
              <TouchableOpacity style={styles.uploadBox} onPress={pickExcelFile}>
                 <MaterialIcons name="upload-file" size={30} color={excelFile ? "#10B981" : "#9ca3af"} />
                 <Text style={{color: excelFile ? '#10B981' : '#6b7280', marginTop: 8, fontWeight: excelFile ? 'bold' : 'normal'}}>
                    {excelFile ? excelFile.name : "Click to choose an Excel file"}
                 </Text>
                 {!excelFile && <Text style={{fontSize: 10, color: '#9ca3af'}}>.xlsx or .xls • max 5 MB</Text>}
              </TouchableOpacity>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setBulkModal(false)}><Text style={{fontWeight: 'bold'}}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#4338CA'}]} onPress={handleBulkUpload} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#FFF"/> : <Text style={{color:'#FFF', fontWeight: 'bold'}}><MaterialIcons name="upload" size={14}/> Create Test</Text>}
                </TouchableOpacity>
              </View>
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
  bulkBtnTop: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  newBtnTop: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  card: { padding: 16, marginHorizontal: 16, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  metaText: { fontSize: 11, color: '#6B7280', marginRight: 12 },
  viewStartBtn: { marginTop: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 6 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { padding: 20, borderRadius: 12, width: '90%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, height: 44, marginBottom: 15, backgroundColor: '#FFF' },
  pickerWrapper: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 15, overflow: 'hidden', height: 44, justifyContent: 'center', backgroundColor: '#FFF' },
  label: { fontSize: 11, fontWeight: 'bold', color: '#4B5563', marginBottom: 6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  
  emptyQBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB', padding: 30, alignItems: 'center', borderRadius: 8, marginBottom: 15 },
  qBox: { borderWidth: 1, borderColor: '#E5E7EB', padding: 15, borderRadius: 8, marginBottom: 15, backgroundColor: '#F9FAFB' },
  qNumberBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  
  guideBox: { padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#BFDBFE' },
  guideHead: { fontSize: 10, fontWeight: 'bold', color: '#1E40AF' },
  guideText: { fontSize: 10, marginVertical: 2 },
  uploadBox: { height: 120, borderStyle: 'dashed', borderWidth: 1, borderColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginBottom: 15, backgroundColor: '#FFF' },
  
  testMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  metaBox: { width: '50%', marginBottom: 10 },
  metaLabel: { fontSize: 10, color: '#6B7280', fontWeight: 'bold' },
  metaVal: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginTop: 2 },
  instructionsBox: { backgroundColor: '#F3F4F6', padding: 15, borderRadius: 8, marginBottom: 20 },
  bulletText: { fontSize: 12, color: '#4B5563', marginBottom: 4 },
  
  btnRow: { flexDirection: 'row', marginTop: 10, justifyContent: 'flex-end' },
  saveBtn: { backgroundColor: '#2563EB', paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', borderRadius: 8, marginLeft: 10 },
  cancelBtn: { paddingVertical: 13, paddingHorizontal: 21, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFF' }
});

export default TestScreen;
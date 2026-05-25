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
import DateTimePicker from '@react-native-community/datetimepicker'; // 🌟 Added DatePicker Import
import { useTheme } from '../../theme/ThemeContext';
import { timetableApi } from '../../api/timetableApi';
import { batchApi } from '../../api/batchApi';
import { classApi } from '../../api/classApi';
import { subjectApi } from '../../api/subjectApi';
import { userApi } from '../../api/userApi';

const TimetableScreen = () => {
  const { theme } = useTheme();
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'teacher' | 'student'>('student');
  
  const [timetables, setTimetables] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // 🌟 Added Effective To & Date Picker Visibility States
  const [effectiveFrom, setEffectiveFrom] = useState(''); 
  const [effectiveTo, setEffectiveTo] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [slotsBuffer, setSlotsBuffer] = useState<any[]>([]);
  
  // Slot Input States
  const [slotDay, setSlotDay] = useState('monday');
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:00');
  const [slotSubjectId, setSlotSubjectId] = useState('');
  const [slotTeacherId, setSlotTeacherId] = useState('');
  const [slotRoom, setSlotRoom] = useState('Room 101');

  const resetForm = () => {
    setEditingId(null); 
    setSelectedBatchId(''); setSelectedClassId(''); 
    setEffectiveFrom(''); setEffectiveTo(''); // 🌟 Reset new fields
    setSlotsBuffer([]);
    setSlotDay('monday'); setSlotStart('09:00'); setSlotEnd('10:00');
    setSlotSubjectId(''); setSlotTeacherId(''); setSlotRoom('Room 101');
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem("user_data");
      const user = stored ? JSON.parse(stored) : {};
      setCurrentUserRole(user.role);

      if (user.role === 'admin') {
        const bRes = await batchApi.getAll().catch(() => null);
        const batchList = bRes?.data || [];
        setBatches(batchList);

        const tables = [];
        for(let b of batchList) {
            const tRes = await timetableApi.getByBatch(b._id).catch(() => null);
            if(tRes?.data) tables.push(tRes.data);
        }
        setTimetables(tables);

        const [cRes, sRes, uRes] = await Promise.all([
          classApi.getAll().catch(() => ({data:[]})),
          subjectApi.getAll().catch(() => ({data:[]})),
          userApi.getAll().catch(() => ({data:[]}))
        ]);
        setClasses(cRes.data || []);
        setSubjects(sRes.data || []);
        setTeachers(uRes.data?.filter((u:any) => u.role === 'teacher') || []);
      } 
      else if (user.role === 'student') {
        const res = await timetableApi.getMyTimetable().catch((err) => {
            console.log("Student Timetable Info:", err.response?.data || err.message);
            return null;
        });
        setTimetables(res?.data ? [res.data] : []);
      } else {
        const res = await timetableApi.getMySchedule().catch(() => null);
        setTimetables(res?.data || []);
      }
    } catch (e) { console.log("Fetch error:", e); }
    setIsLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleAddSlot = () => {
    if(!slotSubjectId || !slotTeacherId) return Alert.alert("Error", "Select Subject & Teacher");
    const newSlot = { 
        day: slotDay, 
        startTime: slotStart, 
        endTime: slotEnd, 
        subjectId: slotSubjectId, 
        teacherId: slotTeacherId, 
        roomNumber: slotRoom 
    };
    setSlotsBuffer([...slotsBuffer, newSlot]);
  };

  const handleTriggerEdit = (item: any) => {
    setEditingId(item._id);
    setSelectedBatchId(typeof item.batchId === 'object' ? item.batchId._id : item.batchId);
    setSelectedClassId(typeof item.classId === 'object' ? item.classId._id : item.classId);
    
    // 🌟 Set Dates for Editing
    setEffectiveFrom(item.effectiveFrom ? item.effectiveFrom.split('T')[0] : '');
    setEffectiveTo(item.effectiveTo ? item.effectiveTo.split('T')[0] : '');
    
    const mappedSlots = (Array.isArray(item.slots) ? item.slots : (item.mySlots || [])).map((s: any) => ({
       day: s.day,
       startTime: s.startTime,
       endTime: s.endTime,
       subjectId: typeof s.subjectId === 'object' && s.subjectId ? s.subjectId._id : s.subjectId,
       teacherId: typeof s.teacherId === 'object' && s.teacherId ? s.teacherId._id : s.teacherId,
       roomNumber: s.roomNumber
    }));
    
    setSlotsBuffer(mappedSlots);
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Timetable", "Are you sure you want to delete this timetable?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
             await timetableApi.delete(id);
             fetchData();
          } catch(e: any) { Alert.alert("Error", "Could not delete timetable."); }
        } 
      }
    ]);
  };

  const handleSave = async () => {
    if (!selectedBatchId || !selectedClassId || !effectiveFrom || slotsBuffer.length === 0) {
      return Alert.alert("Error", "Batch, Class, Effective From Date, and at least one Slot are required");
    }
    
    try {
      // 🌟 Payload updated with effectiveTo
      const payload: any = { 
        batchId: selectedBatchId, 
        classId: selectedClassId, 
        effectiveFrom: effectiveFrom, 
        slots: slotsBuffer 
      };

      if(effectiveTo) payload.effectiveTo = effectiveTo;
      
      if (editingId) {
        await timetableApi.update(editingId, payload);
        Alert.alert("Success", "Timetable Updated");
      } else {
        await timetableApi.create(payload);
        Alert.alert("Success", "Timetable Created");
      }

      setIsModalVisible(false);
      resetForm();
      fetchData();
    } catch (e: any) { 
      Alert.alert("Error", e.response?.data?.message || "Check payload structure"); 
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.listHeader, { color: theme.text }]}>Timetable</Text>
        {currentUserRole === 'admin' && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={() => { resetForm(); setIsModalVisible(true); }}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>+ New Timetable</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList 
        data={timetables}
        keyExtractor={(item, index) => item?._id || index.toString()}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
        renderItem={({ item }) => {
            const slotsArr = Array.isArray(item.slots) ? item.slots : (item.mySlots || []);
            let effFrom = 'N/A';
            let effTo = 'N/A';
            if (typeof item.effectiveFrom === 'string') effFrom = item.effectiveFrom.split('T')[0];
            if (typeof item.effectiveTo === 'string') effTo = item.effectiveTo.split('T')[0];

            return (
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                  <View style={styles.cardHeaderRow}>
                      <Text style={{fontWeight: 'bold', color: theme.text, fontSize: 16}}>Batch: {item.batchId?.name || 'N/A'}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: item.isActive !== false ? theme.primary : '#757575' }]}>
                          <Text style={styles.badgeText}>{item.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</Text>
                      </View>
                  </View>
                  <Text style={{color: theme.subText, fontSize: 13, marginBottom: 2}}>Class: {item.classId?.name || 'N/A'}</Text>
                  <Text style={{color: theme.subText, fontSize: 12, marginBottom: 8}}>Valid: {effFrom} to {effTo}</Text>
                  
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.primary, marginBottom: 4 }}>Assigned Slots ({slotsArr.length})</Text>
                  
                  <View style={styles.slotsGrid}>
                    {slotsArr.map((s: any, idx: number) => {
                        const subObj = typeof s.subjectId === 'object' && s.subjectId ? s.subjectId : subjects.find(x => x._id === s.subjectId);
                        const subName = subObj ? subObj.code || subObj.name : 'Subject';
                        const teacherObj = typeof s.teacherId === 'object' && s.teacherId ? s.teacherId : teachers.find(x => x._id === s.teacherId);
                        const tName = teacherObj ? teacherObj.lastName || teacherObj.firstName : 'Teacher';

                        return (
                          <View key={idx} style={styles.slotPill}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#B48600', textTransform: 'uppercase' }}>{s.day?.substring(0,3)}</Text>
                            <Text style={{ fontSize: 10, color: theme.text, fontWeight: '500' }}>{s.startTime} - {s.endTime}</Text>
                            <Text style={{ fontSize: 10, color: theme.subText }} numberOfLines={1}>{subName} | {tName}</Text>
                            <Text style={{ fontSize: 9, color: theme.subText }}>{s.roomNumber || 'Room 101'}</Text>
                          </View>
                        );
                    })}
                  </View>

                  {currentUserRole === 'admin' && (
                      <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10}}>
                          <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={{marginRight: 15}}>
                              <Text style={{color: theme.primary, fontWeight: 'bold'}}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(item._id)}>
                              <Text style={{color: '#D32F2F', fontWeight: 'bold'}}>Delete</Text>
                          </TouchableOpacity>
                      </View>
                  )}
              </View>
            );
        }}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
                <Text style={styles.formTitle}>{editingId ? 'Edit Timetable' : 'Create Timetable'}</Text>
                <TouchableOpacity onPress={() => { resetForm(); setIsModalVisible(false); }}><MaterialIcons name="close" size={24}/></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* 🌟 EDIT MODE RESTRICTION: Dropdowns disabled when editingId exists */}
              <View style={styles.row}>
                 <View style={{flex: 1, marginRight: 5, opacity: editingId ? 0.5 : 1}}>
                    <Text style={styles.label}>BATCH *</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker selectedValue={selectedBatchId} onValueChange={setSelectedBatchId} enabled={!editingId}>
                            <Picker.Item label="Select batch" value=""/>
                            {batches.map(b => <Picker.Item key={b._id} label={b.name} value={b._id}/>)}
                        </Picker>
                    </View>
                 </View>
                 <View style={{flex: 1, marginLeft: 5, opacity: editingId ? 0.5 : 1}}>
                    <Text style={styles.label}>CLASS *</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker selectedValue={selectedClassId} onValueChange={setSelectedClassId} enabled={!editingId}>
                            <Picker.Item label="Select class" value=""/>
                            {classes.map(c => <Picker.Item key={c._id} label={c.name} value={c._id}/>)}
                        </Picker>
                    </View>
                 </View>
              </View>

              {/* 🌟 NEW EFFECTIVE DATES ROW */}
              <View style={styles.row}>
                 <View style={{flex: 1, marginRight: 5}}>
                    <Text style={styles.label}>EFFECTIVE FROM *</Text>
                    <TouchableOpacity onPress={() => setShowFromPicker(true)} style={[styles.input, {justifyContent:'center'}]}>
                        <Text style={{color: effectiveFrom ? theme.text : 'gray'}}>{effectiveFrom || 'YYYY-MM-DD'}</Text>
                    </TouchableOpacity>
                 </View>
                 <View style={{flex: 1, marginLeft: 5}}>
                    <Text style={styles.label}>EFFECTIVE TO</Text>
                    <TouchableOpacity onPress={() => setShowToPicker(true)} style={[styles.input, {justifyContent:'center'}]}>
                        <Text style={{color: effectiveTo ? theme.text : 'gray'}}>{effectiveTo || 'Optional'}</Text>
                    </TouchableOpacity>
                 </View>
              </View>

              {showFromPicker && (
                <DateTimePicker
                    value={effectiveFrom ? new Date(effectiveFrom) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(e, d) => { setShowFromPicker(false); if(d) setEffectiveFrom(d.toISOString().split('T')[0]); }}
                />
              )}
              {showToPicker && (
                <DateTimePicker
                    value={effectiveTo ? new Date(effectiveTo) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(e, d) => { setShowToPicker(false); if(d) setEffectiveTo(d.toISOString().split('T')[0]); }}
                />
              )}

              <Text style={styles.label}>TIME SLOTS</Text>
              <View style={{ padding: 10, borderWidth: 1, borderColor: '#EEE', borderRadius: 8, marginBottom: 10 }}>
                  <View style={styles.row}>
                    <View style={{flex: 1.2, marginRight: 5}}>
                        <Text style={styles.label}>DAY *</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker selectedValue={slotDay} onValueChange={setSlotDay}>
                                <Picker.Item label="monday" value="monday" />
                                <Picker.Item label="tuesday" value="tuesday" />
                                <Picker.Item label="wednesday" value="wednesday" />
                                <Picker.Item label="thursday" value="thursday" />
                                <Picker.Item label="friday" value="friday" />
                                <Picker.Item label="saturday" value="saturday" />
                                <Picker.Item label="sunday" value="sunday" />
                            </Picker>
                        </View>
                    </View>
                    <View style={{flex: 1, marginHorizontal: 5}}>
                        <Text style={styles.label}>START</Text>
                        <TextInput style={styles.input} value={slotStart} onChangeText={setSlotStart} placeholder="09:00" maxLength={5} />
                    </View>
                    <View style={{flex: 1, marginLeft: 5}}>
                        <Text style={styles.label}>END</Text>
                        <TextInput style={styles.input} value={slotEnd} onChangeText={setSlotEnd} placeholder="10:00" maxLength={5} />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 5}}>
                        <Text style={styles.label}>SUBJECT *</Text> 
                        <View style={styles.pickerWrapper}>
                            <Picker selectedValue={slotSubjectId} onValueChange={setSlotSubjectId}>
                                <Picker.Item label="Subject" value=""/>
                                {subjects.map(s => <Picker.Item key={s._id} label={s.name} value={s._id}/>)}
                            </Picker>
                        </View>
                    </View>
                    <View style={{flex: 1, marginLeft: 5}}>
                        <Text style={styles.label}>TEACHER *</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker selectedValue={slotTeacherId} onValueChange={setSlotTeacherId}>
                                <Picker.Item label="Teacher" value=""/>
                                {teachers.map(t => <Picker.Item key={t._id} label={t.firstName} value={t._id}/>)}
                            </Picker>
                        </View>
                    </View>
                  </View>
                  
                  <Text style={styles.label}>ROOM NUMBER</Text>
                  <TextInput style={styles.input} value={slotRoom} onChangeText={setSlotRoom} placeholder="e.g. 101" />

                  <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddSlot}>
                      <Text style={{color:'#FFF', fontWeight: 'bold'}}>+ Add Slot</Text>
                  </TouchableOpacity>
              </View>
              
              {slotsBuffer.map((s, i) => {
                  const subNm = subjects.find(x => x._id === s.subjectId)?.name || 'Subj';
                  const teaNm = teachers.find(x => x._id === s.teacherId)?.firstName || 'Teach';
                  return (
                    <View key={i} style={styles.slotItem}>
                      <Text style={{fontSize: 12, flex: 1}}>{s.day.substring(0,3).toUpperCase()}: {s.startTime}-{s.endTime}</Text>
                      <Text style={{fontSize: 12, color: 'gray', flex: 1}}>{subNm} | {teaNm}</Text>
                      <TouchableOpacity onPress={() => setSlotsBuffer(slotsBuffer.filter((_,idx)=>idx !== i))}><Text style={{color:'red', fontWeight: 'bold'}}>X</Text></TouchableOpacity>
                    </View>
                  );
              })}

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetForm(); setIsModalVisible(false); }}><Text>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={{color:'#FFF'}}>{editingId ? 'Update' : 'Save'}</Text></TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  addBtn: { padding: 10, borderRadius: 8 },
  card: { padding: 16, margin: 10, borderRadius: 8, borderWidth: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  slotPill: { width: '48%', padding: 8, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 0.5, borderColor: '#EEE', marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalContent: { margin: 20, padding: 20, borderRadius: 12, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  pickerWrapper: { borderWidth: 1, borderRadius: 8, marginBottom: 10, overflow: 'hidden', height: 45, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10, height: 45 },
  row: { flexDirection: 'row' },
  addSlotBtn: { backgroundColor: '#0288D1', padding: 12, alignItems: 'center', borderRadius: 8, marginTop: 5 },
  btnRow: { flexDirection: 'row', marginTop: 20 },
  saveBtn: { flex: 1, backgroundColor: '#0288D1', padding: 15, alignItems: 'center', borderRadius: 8, marginLeft: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, padding: 15, alignItems: 'center', borderRadius: 8 },
  label: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  listHeader: { fontSize: 20, fontWeight: 'bold' },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  slotItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' }
});

export default TimetableScreen;
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Switch, 
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Core Themes and Native API Clients
import { useTheme } from '../../theme/ThemeContext';
import { studentProfileApi, StudentProfile } from '../../api/studentProfileApi';
import { userApi, UserAccount } from '../../api/userApi';

const ACTIVE_USER_ROLE: 'admin' | 'teacher' | 'student' = 'admin';

const StudentProfileScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();

  // ==========================================
  // DATA REGISTRY STATES
  // ==========================================
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [availableStudents, setAvailableStudents] = useState<UserAccount[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ==========================================
  // 100% COMPLETE FORM MAPPING BUFFERS
  // ==========================================
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [admissionNumber, setAdmissionNumber] = useState<string>('');
  const [dateOfBirthText, setDateOfBirthText] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [category, setCategory] = useState<string>('general');
  
  // Demographics Extensions
  const [religion, setReligion] = useState<string>('hindu');
  const [aadharNumberInput, setAadharNumberInput] = useState<string>('');
  const [nationality, setNationality] = useState<string>('indian');
  const [motherTongue, setMotherTongue] = useState<string>('hindi');
  
  // Addresses
  const [line1, setLine1] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [stateText, setStateText] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [isSameAddress, setIsSameAddress] = useState<boolean>(true);

  // Guardian
  const [guardianName, setGuardianName] = useState<string>('');
  const [guardianRelation, setGuardianRelation] = useState<string>('Father');
  const [guardianPhone, setGuardianPhone] = useState<string>('');

  // Previous Academic History
  const [prevSchoolName, setPrevSchoolName] = useState<string>('');
  const [prevSchoolBoard, setPrevSchoolBoard] = useState<string>('CBSE');
  const [prevSchoolPercentage, setPrevSchoolPercentage] = useState<string>('');
  const [prevSchoolYear, setPrevSchoolYear] = useState<string>('2024');

  // Medical Metrics
  const [bloodGroup, setBloodGroup] = useState<string>('B+');
  const [allergiesText, setAllergiesText] = useState<string>('');
  const [emergencyContactName, setEmergencyContactName] = useState<string>('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>('');

  // Documents Support Arrays
  const [docType, setDocType] = useState<string>('aadhar');
  const [docUrlInput, setDocUrlInput] = useState<string>('');
  const [activeDocuments, setActiveDocuments] = useState<any[]>([]);

  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOperationalDependencies();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchOperationalDependencies = async () => {
    setIsLoading(true);
    try {
      const [profilesRes, usersRes] = await Promise.all([
        ACTIVE_USER_ROLE === 'student' ? studentProfileApi.getMyProfile() : studentProfileApi.getAll(),
        userApi.getAll(),
      ]);

      if (profilesRes) {
        const rawPayload = Array.isArray(profilesRes) 
          ? profilesRes 
          : (profilesRes.data || profilesRes.result || profilesRes.profiles || []);
        
        const verifiedArray = Array.isArray(rawPayload) ? rawPayload : [rawPayload].filter(Boolean);
        setProfiles(verifiedArray);
      }

      if (usersRes) {
        const rawUsers = Array.isArray(usersRes) 
          ? usersRes 
          : (usersRes.data || usersRes.result || usersRes.users || []);
        
        const verifiedUsersArray = Array.isArray(rawUsers) ? rawUsers : [];
        const filteredStudents = verifiedUsersArray.filter((u: any) => u && u.role === 'student' && !u.isDeleted);
        setAvailableStudents(filteredStudents);
      }
    } catch (error: any) {
      console.warn("API Exception:", error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFormState = () => {
    setEditingId(null);
    setSelectedUserId('');
    setAdmissionNumber('');
    setDateOfBirthText('2026-05-11');
    setGender('male');
    setCategory('general');
    setReligion('hindu');
    setAadharNumberInput('');
    setNationality('indian');
    setMotherTongue('hindi');
    
    setLine1('');
    setCity('');
    setStateText('');
    setPincode('');
    setIsSameAddress(true);

    setGuardianName('');
    setGuardianRelation('Father');
    setGuardianPhone('');

    setPrevSchoolName('');
    setPrevSchoolBoard('CBSE');
    setPrevSchoolPercentage('');
    setPrevSchoolYear('2024');

    setBloodGroup('B+');
    setAllergiesText('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    
    setDocType('aadhar');
    setDocUrlInput('');
    setActiveDocuments([]);

    setIsActive(true);
    Keyboard.dismiss();
  };

  const handleTriggerEdit = (item: any) => {
    if (!item) return;
    
    setEditingId(item._id);
    setSelectedUserId(typeof item.userId === 'object' && item.userId ? item.userId._id : item.userId);
    setAdmissionNumber(item.admissionNumber || '');
    
    const safeDob = typeof item.dateOfBirth === 'string' ? item.dateOfBirth.split('T')[0] : '';
    setDateOfBirthText(safeDob);

    setGender(item.gender || 'male');
    setCategory(item.category || 'general');
    setReligion(item.religion || 'hindu');
    setAadharNumberInput(''); // Explicit zeroing satisfying absolute local privacy patterns
    setNationality(item.nationality || 'indian');
    setMotherTongue(item.motherTongue || 'hindi');
    
    if (item.currentAddress) {
      setLine1(item.currentAddress.line1 || '');
      setCity(item.currentAddress.city || '');
      setStateText(item.currentAddress.state || '');
      setPincode(item.currentAddress.pincode || '');
    }
    
    setIsSameAddress(item.isSameAddress !== undefined ? item.isSameAddress : true);

    if (item.guardian) {
      setGuardianName(item.guardian.name || '');
      setGuardianRelation(item.guardian.relation || 'Father');
      setGuardianPhone(item.guardian.mobileNumber || '');
    }

    if (item.previousSchool) {
      setPrevSchoolName(item.previousSchool.name || '');
      setPrevSchoolBoard(item.previousSchool.board || 'CBSE');
      setPrevSchoolPercentage(item.previousSchool.percentage ? item.previousSchool.percentage.toString() : '');
      setPrevSchoolYear(item.previousSchool.passingYear ? item.previousSchool.passingYear.toString() : '');
    }

    if (item.healthInfo) {
      setBloodGroup(item.healthInfo.bloodGroup || 'B+');
      const allergiesArr = Array.isArray(item.healthInfo.allergies) ? item.healthInfo.allergies : [];
      setAllergiesText(allergiesArr.join(', '));
      setEmergencyContactName(item.healthInfo.emergencyContactName || '');
      setEmergencyContactPhone(item.healthInfo.emergencyContact || '');
    }

    setActiveDocuments(Array.isArray(item.documents) ? item.documents : []);
    setIsActive(item.isActive !== undefined ? item.isActive : true);

    // Provide clean auto-scroll transition positioning master layout contexts natively
    ScrollViewRef?.scrollTo({ y: 0, animated: true });
  };

  let ScrollViewRef: ScrollView | null = null;

  const handleSaveOrUpdate = async () => {
    const cleanAdm = admissionNumber.trim().toUpperCase();
    const cleanDob = dateOfBirthText.trim();
    const cleanGName = guardianName.trim();
    const cleanGPhone = guardianPhone.trim();

    if (!selectedUserId || !cleanAdm || !cleanDob || !cleanGName || !cleanGPhone) {
      Alert.alert('Validation Error', 'User ID, Admission Number, Date of Birth, and Guardian mappings required.');
      return;
    }

    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(cleanDob)) {
      Alert.alert('Format Validation', 'Ensure the Date of Birth adheres strictly to the YYYY-MM-DD format.');
      return;
    }

    const parsedPercent = parseFloat(prevSchoolPercentage.trim());
    const parsedYear = parseInt(prevSchoolYear.trim(), 10);

    setIsSubmitting(true);

    const addressPayload = {
      line1: line1.trim(),
      city: city.trim(),
      state: stateText.trim(),
      pincode: pincode.trim(),
      country: 'India',
    };

    const allergiesArray = allergiesText.trim() 
      ? allergiesText.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const payload: any = {
      userId: selectedUserId,
      admissionNumber: cleanAdm,
      dateOfBirth: cleanDob,
      gender,
      religion: religion.trim().toLowerCase(),
      category: category.toLowerCase(),
      aadharNumber: aadharNumberInput.trim() ? '[Aadhaar Redacted]' : undefined, 
      nationality: nationality.trim().toLowerCase(),
      motherTongue: motherTongue.trim().toLowerCase(),
      
      currentAddress: addressPayload,
      permanentAddress: addressPayload, 
      isSameAddress,
      
      guardian: {
        name: cleanGName,
        relation: guardianRelation.trim(),
        mobileNumber: cleanGPhone,
      },

      previousSchool: prevSchoolName.trim() ? {
        name: prevSchoolName.trim(),
        board: prevSchoolBoard.trim().toUpperCase(),
        percentage: !isNaN(parsedPercent) ? parsedPercent : undefined,
        passingYear: !isNaN(parsedYear) ? parsedYear : undefined,
      } : undefined,

      healthInfo: {
        bloodGroup: bloodGroup.trim().toUpperCase(),
        allergies: allergiesArray,
        emergencyContactName: emergencyContactName.trim() || cleanGName,
        emergencyContact: emergencyContactPhone.trim() || cleanGPhone,
      }
    };

    try {
      let response;
      if (editingId) {
        response = await studentProfileApi.update(editingId, { ...payload, isActive });
      } else {
        response = await studentProfileApi.create(payload);
      }

      if (response?.success || response?._id) {
        Alert.alert('Success', editingId ? 'Metadata synchronized.' : 'New student profile generated.');
        resetFormState();
        fetchOperationalDependencies();
      } else {
        Alert.alert('Action Refused', response?.message || 'Transaction drop recorded.');
      }
    } catch (error: any) {
      Alert.alert('Persistence Exception', error.response?.data?.message || 'Network write failure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDocument = async () => {
    if (!editingId) {
      Alert.alert('Context Restriction', 'Save the baseline profile entry prior to embedding auxiliary verification documents.');
      return;
    }
    if (!docUrlInput.trim()) {
      Alert.alert('Missing Resource', 'Provide a target file mapping string parameter.');
      return;
    }

    try {
      const res = await studentProfileApi.addDocument(editingId, {
        type: docType,
        label: docType.toUpperCase(),
        fileUrl: docUrlInput.trim(),
      });
      if (res?.success || res?.data) {
        Alert.alert('Document Attached', 'Auxiliary file string successfully mapped.');
        setDocUrlInput('');
        fetchOperationalDependencies();
        // Dynamically append locally caching updates
        setActiveDocuments(prev => [...prev, { _id: Math.random().toString(), type: docType, fileUrl: docUrlInput.trim(), isVerified: false }]);
      }
    } catch (error: any) {
      Alert.alert('Attachment Exception', error.response?.data?.message || 'Document embedding drop recorded.');
    }
  };

  const handleVerifyDocument = async (docId: string) => {
    if (!editingId) return;
    try {
      const res = await studentProfileApi.verifyDocument(editingId, docId);
      if (res?.success) {
        Alert.alert('Verification Stamped', 'Document cleared successfully.');
        fetchOperationalDependencies();
        setActiveDocuments(prev => prev.map(d => d._id === docId ? { ...d, isVerified: true } : d));
      }
    } catch (err: any) {
      Alert.alert('Verification Terminated', err.response?.data?.message || 'Access blocked.');
    }
  };

  const handleDeleteProfile = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to softly unlink this profile configuration from application services?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await studentProfileApi.delete(id);
              if (res?.success || res?.message) {
                if (editingId === id) resetFormState();
                fetchOperationalDependencies();
              }
            } catch (error: any) {
              Alert.alert('Wipe Interrupted', error.response?.data?.message || 'Removal command dropped.');
            }
          }
        }
      ]
    );
  };

  const renderMiniProfileCard = (item: any) => {
    if (!item) return null;
    const userObj = typeof item.userId === 'object' && item.userId ? item.userId : null;
    const studentName = userObj ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() : 'Unmapped Target';
    const dobString = typeof item.dateOfBirth === 'string' ? item.dateOfBirth.split('T')[0] : 'N/A';

    return (
      <View key={item._id} style={[styles.miniCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.miniHeader}>
          <Text style={[styles.miniTitle, { color: theme.text }]} numberOfLines={1}>{studentName}</Text>
          <Text style={[styles.miniBadge, { color: theme.primary }]}>{item.admissionNumber}</Text>
        </View>
        <Text style={[styles.miniDetails, { color: theme.subText }]}>DOB: {dobString} | Category: {item.category || 'Gen'}</Text>
        
        <View style={styles.miniActionRow}>
          <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={styles.miniBtn}>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>Edit Layout</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteProfile(item._id)} style={[styles.miniBtn, { marginLeft: 12 }]}>
            <Text style={{ color: '#D32F2F', fontWeight: 'bold', fontSize: 12 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const safeStudentsArray = Array.isArray(availableStudents) ? availableStudents : [];
  const safeProfilesArray = Array.isArray(profiles) ? profiles : [];
  const topThreeProfiles = safeProfilesArray.slice(0, 3);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        
        {/* MASTER SCREEN CONTAINER: Unclipped Primary Scroll View */}
        <ScrollView 
          ref={(ref) => { ScrollViewRef = ref; }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* ========================================== */}
          {/* SECTION 1: MASTER INPUT FORM */}
          {/* ========================================== */}
          {ACTIVE_USER_ROLE === 'admin' ? (
            <View style={[styles.formContainerWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.formHeaderRow}>
                <Text style={[styles.formTitle, { color: theme.text }]}>
                  {editingId ? 'Modify Student Master Record' : 'Student Profile Details'}
                </Text>
                {editingId ? (
                  <TouchableOpacity onPress={resetFormState}>
                    <Text style={styles.cancelText}>Clear Edit</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* ACCOUNT LINK */}
              <View style={styles.pickerContainer}>
                <Text style={[styles.label, { color: theme.text }]}>Selecet Student</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Picker
                    selectedValue={selectedUserId}
                    onValueChange={(itemValue) => setSelectedUserId(itemValue)}
                    dropdownIconColor={theme.primary}
                    style={{ color: theme.text }}
                  >
                    <Picker.Item label="-- Choose Target Identity --" value="" color={theme.subText} />
                    {safeStudentsArray.map((stu) => (
                      <Picker.Item key={stu._id} label={stu?.firstName ? `${stu.firstName} ${stu.lastName} (${stu.email})` : 'Unnamed'} value={stu._id} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* DEMOGRAPHICS BLOCK */}
              <Text style={[styles.sectionHeading, { color: theme.primary }]}>Core Demographics</Text>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Admission Number</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="ADM2025001" placeholderTextColor={theme.subText} value={admissionNumber} onChangeText={setAdmissionNumber} autoCapitalize="characters" />
                </View>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>DOB (YYYY-MM-DD)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="2026-05-11" placeholderTextColor={theme.subText} value={dateOfBirthText} onChangeText={setDateOfBirthText} maxLength={10} />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={category} onValueChange={(v) => setCategory(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                      <Picker.Item label="General" value="general" /><Picker.Item label="OBC" value="obc" /><Picker.Item label="SC" value="sc" /><Picker.Item label="ST" value="st" />
                    </Picker>
                  </View>
                </View>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Gender</Text>
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Picker selectedValue={gender} onValueChange={(v) => setGender(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                      <Picker.Item label="Male" value="male" /><Picker.Item label="Female" value="female" /><Picker.Item label="Other" value="other" />
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Religion</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="hindu" placeholderTextColor={theme.subText} value={religion} onChangeText={setReligion} />
                </View>
                <View style={styles.halfInput}>
                  <Text style={[styles.label, { color: theme.text }]}>Mother Tongue</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="hindi" placeholderTextColor={theme.subText} value={motherTongue} onChangeText={setMotherTongue} />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Nationality</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="indian" placeholderTextColor={theme.subText} value={nationality} onChangeText={setNationality} />

              <Text style={[styles.label, { color: theme.text }]}>Aadhar ID</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Numeric authorization sequence..." placeholderTextColor={theme.subText} value={aadharNumberInput} onChangeText={setAadharNumberInput} keyboardType="numeric" />

              {/* GUARDIAN BLOCK */}
              <Text style={[styles.sectionHeading, { color: theme.primary }]}>Parents Details</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Guardian Full Name" placeholderTextColor={theme.subText} value={guardianName} onChangeText={setGuardianName} />
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Relation (Father)" placeholderTextColor={theme.subText} value={guardianRelation} onChangeText={setGuardianRelation} />
                </View>
                <View style={styles.halfInput}>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Mobile String" placeholderTextColor={theme.subText} value={guardianPhone} onChangeText={setGuardianPhone} keyboardType="numeric" maxLength={10} />
                </View>
              </View>

              {/* ADDRESS BLOCK */}
              <Text style={[styles.sectionHeading, { color: theme.primary }]}>Address </Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Line 1 (ABC Colony)" placeholderTextColor={theme.subText} value={line1} onChangeText={setLine1} />
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="City" placeholderTextColor={theme.subText} value={city} onChangeText={setCity} />
                </View>
                <View style={styles.halfInput}>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="State" placeholderTextColor={theme.subText} value={stateText} onChangeText={setStateText} />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Pincode" placeholderTextColor={theme.subText} value={pincode} onChangeText={setPincode} keyboardType="numeric" />
                </View>
                <View style={[styles.halfInput, { justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }]}>
                  <Text style={[styles.label, { color: theme.text, marginRight: 8, marginBottom: 0 }]}>Same Perm</Text>
                  <Switch value={isSameAddress} onValueChange={setIsSameAddress} thumbColor={theme.primary} />
                </View>
              </View>

              {/* PREVIOUS SCHOOL BLOCK */}
              <Text style={[styles.sectionHeading, { color: theme.primary }]}>Previous Academic Record</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="School Name" placeholderTextColor={theme.subText} value={prevSchoolName} onChangeText={setPrevSchoolName} />
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Board (CBSE)" placeholderTextColor={theme.subText} value={prevSchoolBoard} onChangeText={setPrevSchoolBoard} />
                </View>
                <View style={styles.halfInput}>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Percentage (85)" placeholderTextColor={theme.subText} value={prevSchoolPercentage} onChangeText={setPrevSchoolPercentage} keyboardType="numeric" />
                </View>
              </View>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Passing Year (2024)" placeholderTextColor={theme.subText} value={prevSchoolYear} onChangeText={setPrevSchoolYear} keyboardType="numeric" />

              {/* MEDICAL BLOCK */}
              <Text style={[styles.sectionHeading, { color: theme.primary }]}>Medical Info</Text>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Blood Group (B+)" placeholderTextColor={theme.subText} value={bloodGroup} onChangeText={setBloodGroup} />
                </View>
                <View style={styles.halfInput}>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Allergies (xxx)" placeholderTextColor={theme.subText} value={allergiesText} onChangeText={setAllergiesText} />
                </View>
              </View>
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Emergency Contact Name" placeholderTextColor={theme.subText} value={emergencyContactName} onChangeText={setEmergencyContactName} />
              <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Emergency Phone" placeholderTextColor={theme.subText} value={emergencyContactPhone} onChangeText={setEmergencyContactPhone} keyboardType="numeric" maxLength={10} />

              {/* EMBEDDED DOCUMENT BUILDER (Visible strictly during dynamic target edit operations) */}
              {editingId ? (
                <View style={styles.documentConsole}>
                  <Text style={[styles.sectionHeading, { color: theme.primary, marginTop: 0 }]}>Document Verification Integration</Text>
                  
                  <View style={styles.row}>
                    <View style={styles.halfInput}>
                      <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <Picker selectedValue={docType} onValueChange={(v) => setDocType(v)} style={{ color: theme.text }} dropdownIconColor={theme.primary}>
                          <Picker.Item label="Aadhar" value="aadhar" /><Picker.Item label="Birth Cert" value="birth_certificate" /><Picker.Item label="Marksheet" value="marksheet" />
                        </Picker>
                      </View>
                    </View>
                    <View style={styles.halfInput}>
                      <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, marginBottom: 0 }]} placeholder="File Link URL" placeholderTextColor={theme.subText} value={docUrlInput} onChangeText={setDocUrlInput} />
                    </View>
                  </View>

                  <TouchableOpacity onPress={handleAddDocument} style={[styles.attachBtn, { backgroundColor: theme.surface === '#FFFFFF' ? '#E0F2FE' : '#0369A1' }]}>
                    <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13 }}>Attach Uploaded String</Text>
                  </TouchableOpacity>

                  {/* Render Verified/Pending documents feed inside editing scopes */}
                  {activeDocuments.map((doc: any) => (
                    <View key={doc._id} style={styles.docItemRow}>
                      <Text style={{ color: theme.text, fontSize: 12, flex: 1 }} numberOfLines={1}>[{doc.type.toUpperCase()}] {doc.fileUrl}</Text>
                      {doc.isVerified ? (
                        <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 11 }}>VERIFIED</Text>
                      ) : (
                        <TouchableOpacity onPress={() => handleVerifyDocument(doc._id)} style={styles.verifyTrigger}>
                          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 11 }}>VERIFY</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ) : null}

              {editingId ? (
                <View style={styles.switchRow}>
                  <Text style={{ color: theme.text, fontWeight: '500' }}>Active System Record</Text>
                  <Switch value={isActive} onValueChange={setIsActive} thumbColor={theme.primary} />
                </View>
              ) : null}

              <TouchableOpacity style={[styles.mainButton, { backgroundColor: theme.primary }]} onPress={handleSaveOrUpdate} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{editingId ? 'Update Credentials' : 'Submit'}</Text>}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ========================================== */}
          {/* SECTION 2: TOP 3 PROFILES MINIFIED VIEW */}
          {/* ========================================== */}
          <View style={styles.miniRegistryBlock}>
            <Text style={[styles.registryHeading, { color: theme.text }]}>Register Student Profile</Text>
            
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : topThreeProfiles.length > 0 ? (
              topThreeProfiles.map(renderMiniProfileCard)
            ) : (
              <Text style={[styles.emptyText, { color: theme.subText }]}>No record founds</Text>
            )}

            {/* ROUTE ALL PROFILES EXPANSION BUTTON */}
            {safeProfilesArray.length > 0 ? (
              <TouchableOpacity 
                style={[styles.viewAllBtn, { borderColor: theme.primary }]}
                onPress={() => navigation.navigate('AllStudentProfiles', { profilesData: safeProfilesArray })}
              >
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>
                  View All Mapped Profiles ({safeProfilesArray.length})
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  formContainerWrapper: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formTitle: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { color: '#D32F2F', fontWeight: '600', fontSize: 14 },
  sectionHeading: { fontSize: 14, fontWeight: 'bold', marginTop: 12, marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: '#EEE', paddingBottom: 4 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  pickerContainer: { marginBottom: 10 },
  pickerWrapper: { height: 46, borderWidth: 1, borderRadius: 8, justifyContent: 'center', overflow: 'hidden' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Auxiliary Document Integration Console
  documentConsole: { marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.02)', borderWidth: 0.5, borderColor: '#DDD' },
  attachBtn: { marginTop: 8, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  docItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#EEE' },
  verifyTrigger: { borderWidth: 1, borderColor: '#0288D1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },

  // Minified UI Feed Section
  miniRegistryBlock: { marginTop: 8 },
  registryHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  miniCard: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  miniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniTitle: { fontSize: 14, fontWeight: 'bold', flex: 1 },
  miniBadge: { fontSize: 12, fontWeight: 'bold' },
  miniDetails: { fontSize: 12, marginTop: 4, marginBottom: 8 },
  miniActionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4, borderTopWidth: 0.5, borderTopColor: '#EEE' },
  miniBtn: { paddingVertical: 2 },
  viewAllBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(2, 136, 209, 0.05)' },
  emptyText: { textAlign: 'center', fontSize: 13, marginVertical: 12 },
});

export default StudentProfileScreen;
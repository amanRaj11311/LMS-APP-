import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
  ActivityIndicator, Alert, Keyboard, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { userApi, UserAccount, CreateUserPayload } from '../../api/userApi';

const UserScreen = () => {
  const { theme } = useTheme();

  // Registry Engine Tracking
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Core Account Attributes
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [middleName, setMiddleName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');

  useEffect(() => {
    fetchUsersList();
  }, []);

  const fetchUsersList = async () => {
    setIsLoading(true);
    try {
      const response = await userApi.getAll();
      if (response?.success) {
        setUsers(response.data);
      }
    } catch (error: any) {
      Alert.alert('Network Sync Error', error.response?.data?.error || 'Failed to initialize account feeds.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await userApi.getAll();
      if (response?.success) {
        setUsers(response.data);
      }
    } catch (error: any) {
      Alert.alert('Refresh Dropped', error.response?.data?.error || 'Unable to update account records.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetFormState = () => {
    setEditingId(null);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setMobileNumber('');
    setRole('student');
    Keyboard.dismiss();
  };

  const handleTriggerEdit = (item: UserAccount) => {
    setEditingId(item._id);
    setFirstName(item.firstName);
    setMiddleName(item.middleName || '');
    setLastName(item.lastName);
    setEmail(item.email);
    setPassword(''); // Omitted for security; updating requires entry if enforced
    setMobileNumber(item.mobileNumber);
    setRole(item.role);
  };

  const handleSaveOrUpdate = async () => {
    const cleanFirst = firstName.trim();
    const cleanMiddle = middleName.trim();
    const cleanLast = lastName.trim();
    const cleanEmail = email.trim();
    const cleanMobile = mobileNumber.trim();
    const cleanPass = password.trim();

    // 1. Structural Completeness Checks
    if (!cleanFirst || !cleanLast || !cleanEmail || !cleanMobile) {
      Alert.alert('Input Validation', 'First Name, Last Name, Email, aur Mobile Number strictly required hain.');
      return;
    }

    if (!editingId && !cleanPass) {
      Alert.alert('Input Validation', 'Naye user account ke liye password set karna zaroori hai.');
      return;
    }

    // 2. Strict Regular Expression Checks
    const nameRegex = /^[A-Za-z]+$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const mobileRegex = /^[0-9]{10}$/;

    if (!nameRegex.test(cleanFirst) || !nameRegex.test(cleanLast) || (cleanMiddle && !nameRegex.test(cleanMiddle))) {
      Alert.alert('Format Error', 'Naam ke format mein strictly alphabetic strings hi enter karein.');
      return;
    }

    if (!emailRegex.test(cleanEmail)) {
      Alert.alert('Format Error', 'Sahi email address string (user@example.com) enter karein.');
      return;
    }

    if (!mobileRegex.test(cleanMobile)) {
      Alert.alert('Format Error', 'Sahi 10-digit mobile number format enter karein.');
      return;
    }

    setIsSubmitting(true);

    const payload: Partial<CreateUserPayload> = {
      firstName: cleanFirst,
      ...(cleanMiddle ? { middleName: cleanMiddle } : {}),
      lastName: cleanLast,
      email: cleanEmail,
      mobileNumber: cleanMobile,
      role,
      ...(cleanPass ? { password: cleanPass } : {})
    };

    try {
      let response;
      if (editingId) {
        response = await userApi.update({ ...payload, id: editingId } as CreateUserPayload & { id: string });
      } else {
        response = await userApi.create(payload as CreateUserPayload);
      }

      if (response.success) {
        Alert.alert('Success', response.message || 'User Created successfully.');
        resetFormState();
        fetchUsersList();
      } else {
        Alert.alert('Transaction Refused', response.message || response.error || 'Request dropped.');
      }
    } catch (error: any) {
      Alert.alert('Execution Dropped', error.response?.data?.error || 'Database transfer transaction blocked.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to flag this user account as deleted?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await userApi.delete(id);
              if (response.success) {
                if (editingId === id) resetFormState();
                fetchUsersList();
              }
            } catch (error: any) {
              Alert.alert('Wipe Interrupted', error.response?.data?.error || 'Target unlinking dropped.');
            }
          }
        }
      ]
    );
  };

  const renderUserCard = ({ item }: { item: UserAccount }) => {
    const fullName = `${item.firstName} ${item.middleName ? item.middleName + ' ' : ''}${item.lastName}`;

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{fullName}</Text>
          
          <View style={[styles.roleBadge, { backgroundColor: item.role === 'admin' ? '#D32F2F' : item.role === 'teacher' ? '#00796B' : theme.primary }]}>
            <Text style={styles.badgeText}>{item.role}</Text>
          </View>
        </View>

        <Text style={[styles.infoText, { color: theme.subText }]}>{item.email}</Text>
        <Text style={[styles.infoText, { color: theme.subText, marginTop: 2 }]}>+91 {item.mobileNumber}</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => handleTriggerEdit(item)} style={styles.actionButton}>
            <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionButton}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      
      {/* 1. DATA ENTRY CONTROLS ENGINE */}
      <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.formHeaderRow}>
          <Text style={[styles.formTitle, { color: theme.text }]}>
            {editingId ? 'Modify Core User' : 'Register Core User'}
          </Text>
          {editingId && (
            <TouchableOpacity onPress={resetFormState}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="First Name"
            placeholderTextColor={theme.subText}
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={[styles.input, styles.halfInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="Last Name"
            placeholderTextColor={theme.subText}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Middle Name (Optional)"
          placeholderTextColor={theme.subText}
          value={middleName}
          onChangeText={setMiddleName}
        />

        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Email Address string"
          placeholderTextColor={theme.subText}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="10-Digit Mobile"
            placeholderTextColor={theme.subText}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="numeric"
            maxLength={10}
          />

          <TextInput
            style={[styles.input, styles.halfInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder={editingId ? "Leave Blank" : "Set Password"}
            placeholderTextColor={theme.subText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* BASIC TABBED SELECTOR FOR CORE ROLES */}
        <Text style={[styles.label, { color: theme.text }]}>Assigned Account Role</Text>
        <View style={styles.roleTabsRow}>
          {(['student', 'teacher', 'admin'] as const).map((rTarget) => (
            <TouchableOpacity 
              key={rTarget}
              style={[
                styles.roleTabBtn, 
                { borderColor: theme.border, backgroundColor: role === rTarget ? theme.primary : theme.background }
              ]}
              onPress={() => setRole(rTarget)}
            >
              <Text style={{ color: role === rTarget ? '#FFF' : theme.text, fontWeight: '600', textTransform: 'capitalize' }}>
                {rTarget}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.mainButton, { backgroundColor: theme.primary }]}
          onPress={handleSaveOrUpdate}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{editingId ? 'Update Credentials' : 'Submit'}</Text>}
        </TouchableOpacity>
      </View>

      {/* 2. FLATLIST REGISTRY CONTROLLER */}
      <Text style={[styles.listHeader, { color: theme.text }]}>All User</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.subText }]}>No matching authentication records configured inside storage.</Text>}
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
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  roleTabsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  roleTabBtn: { flex: 1, height: 38, borderWidth: 1, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginHorizontal: 2 },
  mainButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  listHeader: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  infoText: { fontSize: 13 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 10, marginTop: 8 },
  actionButton: { marginLeft: 16, paddingVertical: 4 },
  editText: { fontWeight: 'bold', fontSize: 14 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 15 },
});

export default UserScreen;
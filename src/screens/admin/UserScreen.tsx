import React, { useState, useEffect, useMemo } from 'react';
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
import { useTheme } from '../../theme/ThemeContext';
import { userApi, UserAccount, CreateUserPayload } from '../../api/userApi';

const UserScreen = () => {
  const { theme } = useTheme();

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserAccount[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState<string>('');
  const [middleName, setMiddleName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');

  // Search & Filter
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  useEffect(() => {
    fetchUsersList();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchText, selectedRole]);

  const fetchUsersList = async () => {
    setIsLoading(true);

    try {
      const response = await userApi.getAll();

      if (response?.success) {
        setUsers(response.data || []);
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.response?.data?.error || 'Failed to fetch users',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);

    try {
      const response = await userApi.getAll();

      if (response?.success) {
        setUsers(response.data || []);
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.response?.data?.error || 'Refresh failed',
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const applyFilters = () => {
    let temp = [...users];

    // Search
    if (searchText.trim()) {
      const text = searchText.toLowerCase();

      temp = temp.filter(user => {
  const fullName = `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.toLowerCase();

  const email = (user.email || '').toLowerCase();

  const mobile = (user.mobileNumber || '').toString();

  return (
    fullName.includes(text) ||
    email.includes(text) ||
    mobile.includes(text)
  );
});
    }

    // Role Filter
    if (selectedRole !== 'all') {
      temp = temp.filter(
  user => (user.role || '').toLowerCase() === selectedRole.toLowerCase(),
);
    }

    setFilteredUsers(temp);
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

    setIsModalVisible(false);

    Keyboard.dismiss();
  };

  const handleTriggerEdit = (item: UserAccount) => {
    console.log('EDIT ITEM => ', item);

    setEditingId(item._id);

    setFirstName(item.firstName || '');
    setMiddleName(item.middleName || '');
    setLastName(item.lastName || '');
    setEmail(item.email || '');
    setMobileNumber(item.mobileNumber || '');
    setRole(item.role || 'student');

    // Password empty on edit
    setPassword('');

    setTimeout(() => {
      setIsModalVisible(true);
    }, 100);
  };

  const validateInputs = () => {
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanMiddle = middleName.trim();
    const cleanEmail = email.trim();
    const cleanMobile = mobileNumber.trim();
    const cleanPassword = password.trim();

    if (!cleanFirst) {
      Alert.alert('Validation', 'First Name is required');
      return false;
    }

    if (!cleanLast) {
      Alert.alert('Validation', 'Last Name is required');
      return false;
    }

    if (!cleanEmail) {
      Alert.alert('Validation', 'Email is required');
      return false;
    }

    if (!cleanMobile) {
      Alert.alert('Validation', 'Mobile Number is required');
      return false;
    }

    // Mobile Validation
    const mobileRegex = /^[6-9]\d{9}$/;

if (!mobileRegex.test(cleanMobile)) {
  Alert.alert(
    'Invalid Mobile Number',
    'Please enter valid 10 digit mobile number',
  );
  return false;
}

    // Email Validation
   const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

if (!emailRegex.test(cleanEmail) || cleanEmail.includes('..')) { // 🌟 Ye check add karo
  Alert.alert(
    'Invalid Email',
    'Please enter a valid email address (no consecutive dots allowed)',
  );
  return false;
}

    // Name Validation
    const nameRegex = /^[A-Za-z ]+$/;

    if (
      !nameRegex.test(cleanFirst) ||
      !nameRegex.test(cleanLast) ||
      (cleanMiddle && !nameRegex.test(cleanMiddle))
    ) {
      Alert.alert(
        'Invalid Name',
        'Name should contain only alphabets',
      );
      return false;
    }

    // Password validation for create
    if (!editingId && !cleanPassword) {
      Alert.alert(
        'Validation',
        'Password is required for new user',
      );
      return false;
    }

    return true;
  };

  const handleSaveOrUpdate = async () => {
    if (!validateInputs()) return;

    setIsSubmitting(true);

    try {
      const payload: any = {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        mobileNumber: mobileNumber.trim(),
        role,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      let response;

      // UPDATE
      if (editingId) {
        response = await userApi.update({
          id: editingId,
          ...payload,
        });

      } else {
        // CREATE
        response = await userApi.create(payload);
      }

      if (response?.success) {
        Alert.alert(
          'Success',
          editingId
            ? 'User updated successfully'
            : 'User created successfully',
        );

        resetFormState();

        fetchUsersList();

      } else {
        Alert.alert(
          'Error',
          response?.message || response?.error || 'Something went wrong',
        );
      }
    } catch (error: any) {
      console.log('SAVE ERROR => ', error?.response?.data || error);

      Alert.alert(
        'Error',
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          'Operation failed',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user?',
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
              const response = await userApi.delete(id);

              if (response?.success) {
                fetchUsersList();
              }
            } catch (error: any) {
              Alert.alert('Error', 'Delete failed');
            }
          },
        },
      ],
    );
  };

  // KPI Counts
  const totalUsers = users.length;

  const totalStudents = useMemo(
    () => users.filter(u => u.role === 'student').length,
    [users],
  );

  const totalTeachers = useMemo(
    () => users.filter(u => u.role === 'teacher').length,
    [users],
  );

  const totalAdmins = useMemo(
    () => users.filter(u => u.role === 'admin').length,
    [users],
  );

  const renderUserCard = ({ item }: { item: UserAccount }) => {
    const fullName = `${item.firstName} ${
      item.middleName ? item.middleName + ' ' : ''
    }${item.lastName}`;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}>
        <View style={styles.cardHeader}>
          <Text
            style={[styles.cardTitle, { color: theme.text }]}
            numberOfLines={1}>
            {fullName}
          </Text>

          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor:
                  item.role === 'admin'
                    ? '#D32F2F'
                    : item.role === 'teacher'
                    ? '#00796B'
                    : '#1565C0',
              },
            ]}>
            <Text style={styles.badgeText}>{item.role}</Text>
          </View>
        </View>

        <Text style={[styles.infoText, { color: theme.subText }]}>
          {item.email}
        </Text>

        <Text
          style={[
            styles.infoText,
            { color: theme.subText, marginTop: 3 },
          ]}>
          +91 {item.mobileNumber}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => handleTriggerEdit(item)}
            style={styles.actionButton}>
            <Text style={[styles.editText, { color: theme.primary }]}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDelete(item._id)}
            style={styles.actionButton}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
      edges={['bottom']}>

      {/* HEADER */}
      <View style={styles.headerArea}>
        <Text style={[styles.listHeader, { color: theme.text }]}>
          User Management
        </Text>

        <TouchableOpacity
          style={[
            styles.createBtn,
            { backgroundColor: theme.primary },
          ]}
          onPress={() => {
            resetFormState();
            setIsModalVisible(true);
          }}>
          <Text style={styles.createBtnText}>+ Create User</Text>
        </TouchableOpacity>
      </View>

      {/* KPI CARDS */}
      {/* KPI CARDS */}
<View style={styles.kpiWrapper}>
  
  <View style={[styles.kpiCard, { backgroundColor: '#2563EB' }]}>
    <Text style={styles.kpiValue}>{totalUsers}</Text>
    <Text style={styles.kpiTitle}>Total Users</Text>
  </View>

  <View style={[styles.kpiCard, { backgroundColor: '#16A34A' }]}>
    <Text style={styles.kpiValue}>{totalStudents}</Text>
    <Text style={styles.kpiTitle}>Students</Text>
  </View>

  <View style={[styles.kpiCard, { backgroundColor: '#0891B2' }]}>
    <Text style={styles.kpiValue}>{totalTeachers}</Text>
    <Text style={styles.kpiTitle}>Teachers</Text>
  </View>

  <View style={[styles.kpiCard, { backgroundColor: '#DC2626' }]}>
    <Text style={styles.kpiValue}>{totalAdmins}</Text>
    <Text style={styles.kpiTitle}>Admins</Text>
  </View>

</View>

      {/* SEARCH & FILTER */}
      <View style={styles.filterContainer}>
        <TextInput
          placeholder="Search name, email, mobile..."
          placeholderTextColor={theme.subText}
          value={searchText}
          onChangeText={setSearchText}
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}>
          {['all', 'student', 'teacher', 'admin'].map(item => (
            <TouchableOpacity
              key={item}
              onPress={() => setSelectedRole(item)}
              style={[
                styles.filterBtn,
                {
                  backgroundColor:
                    selectedRole === item
                      ? theme.primary
                      : theme.surface,
                  borderColor: theme.border,
                },
              ]}>
              <Text
                style={{
                  color:
                    selectedRole === item
                      ? '#FFF'
                      : theme.text,
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* MODAL */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent>
        
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            
            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}>
              
              <View style={styles.formHeaderRow}>
                <Text
                  style={[
                    styles.formTitle,
                    { color: theme.text },
                  ]}>
                  {editingId ? 'Edit User' : 'Create User'}
                </Text>

                <TouchableOpacity onPress={resetFormState}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <TextInput
                  style={[
                    styles.input,
                    styles.halfInput,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="First Name"
                  placeholderTextColor={theme.subText}
                  value={firstName}
                  onChangeText={setFirstName}
                />

                <TextInput
                  style={[
                    styles.input,
                    styles.halfInput,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="Last Name"
                  placeholderTextColor={theme.subText}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Middle Name"
                placeholderTextColor={theme.subText}
                value={middleName}
                onChangeText={setMiddleName}
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Email Address"
                placeholderTextColor={theme.subText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.row}>
                <TextInput
                  style={[
                    styles.input,
                    styles.halfInput,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="10 Digit Mobile"
                  placeholderTextColor={theme.subText}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="numeric"
                  maxLength={10}
                />

                <TextInput
                  style={[
                    styles.input,
                    styles.halfInput,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder={
                    editingId
                      ? 'Leave blank to keep same'
                      : 'Password'
                  }
                  placeholderTextColor={theme.subText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Text
                style={[
                  styles.label,
                  { color: theme.text },
                ]}>
                Select Role
              </Text>

              <View style={styles.roleTabsRow}>
                {(['student', 'teacher', 'admin'] as const).map(
                  item => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setRole(item)}
                      style={[
                        styles.roleTabBtn,
                        {
                          backgroundColor:
                            role === item
                              ? theme.primary
                              : theme.background,
                          borderColor: theme.border,
                        },
                      ]}>
                      <Text
                        style={{
                          color:
                            role === item
                              ? '#FFF'
                              : theme.text,
                          fontWeight: '600',
                          textTransform: 'capitalize',
                        }}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.mainButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleSaveOrUpdate}
                disabled={isSubmitting}>
                
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnText}>
                    {editingId
                      ? 'Update User'
                      : 'Create User'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* LIST */}
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={theme.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item._id}
          renderItem={renderUserCard}
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
            <Text
              style={[
                styles.emptyText,
                { color: theme.subText },
              ]}>
              No users found
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  listHeader: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  createBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },

  createBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },

 

  kpiCard: {
    width: 130,
    paddingVertical: 18,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
  },

 

  kpiWrapper: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  marginTop: 14,
},

kpiCard: {
  width: '48%',
  borderRadius: 18,
  paddingVertical: 22,
  paddingHorizontal: 16,
  marginBottom: 14,

  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 3,
  },
  shadowOpacity: 0.15,
  shadowRadius: 5,

  elevation: 5,
},

kpiValue: {
  color: '#FFF',
  fontSize: 30,
  fontWeight: 'bold',
},

kpiTitle: {
  color: '#FFF',
  fontSize: 14,
  fontWeight: '600',
  marginTop: 6,
},

  filterContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },

  searchInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 15,
  },

  filterBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
  },

  listContent: {
    padding: 16,
    paddingBottom: 80,
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },

  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  infoText: {
    fontSize: 14,
    marginTop: 6,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#CCC',
  },

  actionButton: {
    marginLeft: 20,
  },

  editText: {
    fontWeight: 'bold',
  },

  deleteText: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 16,
  },

  formCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },

  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  cancelText: {
    color: '#D32F2F',
    fontWeight: '600',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  halfInput: {
    width: '48%',
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    fontSize: 15,
  },

  label: {
    fontWeight: '600',
    marginBottom: 10,
  },

  roleTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  roleTabBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },

  mainButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16,
  },
});

export default UserScreen;
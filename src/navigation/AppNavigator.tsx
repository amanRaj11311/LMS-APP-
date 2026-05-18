import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Platform, 
  Alert,
  FlatList,
  TextInput
} from 'react-native';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { 
  createDrawerNavigator, 
  DrawerContentScrollView, 
  DrawerContentComponentProps 
} from '@react-navigation/drawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Core Themes and Unified Standard Layout Modules
import { useTheme } from '../theme/ThemeContext';
import GlobalHeader from '../components/GlobalHeader';

// ==========================================
// ALL IMPORTED ENTERPRISE SCREENS
// ==========================================
import LoginScreen from '../auth/LoginScreen'; 
import AcademicYearScreen from '../screens/admin/AcademicYearScreen';
import AnnouncementScreen from '../screens/admin/AnnouncementScreen';
import AssignmentScreen from '../screens/admin/AssignmentScreen'; 
import BatchScreen from '../screens/admin/BatchScreen';
import ClassScreen from '../screens/admin/ClassScreen';
import SubjectScreen from '../screens/admin/SubjectScreen';
import UserScreen from '../screens/admin/UserScreen';
import TeacherProfileScreen from '../screens/admin/TeacherProfileScreen';
import EnrollmentScreen from '../screens/admin/EnrollmentScreen';
import StudentProfileScreen from '../screens/admin/StudentProfileScreen';
import ExamScreen from '../screens/admin/ExamScreen';
import ExamResultsScreen from '../screens/admin/ExamResultsScreen';
import AttendanceScreen from '../screens/admin/AttendanceScreen';
import LessonScreen from '../screens/admin/LessonScreen';
import AllLessonsFeedScreen from '../screens/admin/AllLessonsFeedScreen';
import LessonAttendanceRegisterScreen from '../screens/admin/LessonAttendanceRegisterScreen';
import TimetableScreen from '../screens/admin/TimetableScreen';
import AllTimetablesFeedScreen from '../screens/admin/AllTimetablesFeedScreen';
import LeaveScreen from '../screens/admin/LeaveScreen';
import AllLeavesFeedScreen from '../screens/admin/AllLeavesFeedScreen';
import StudyMaterialScreen from '../screens/admin/StudyMaterialScreen';
import AllMaterialsFeedScreen from '../screens/admin/AllMaterialsFeedScreen';

// 🌟 INJECTED MASTER SCREENS
import DashboardScreen from '../screens/admin/DashboardScreen'; // The interlinked dashboard we built
import ProfileScreen from '../screens/admin/ProfileScreen';     // The fully editable profile screen

// Temporary Functional Layout Placeholders
const CoursesScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Courses</Text>
  </View>
);

// ==========================================
// EMBEDDED AUXILIARY SCREEN: ALL PROFILES FEED
// ==========================================
const AllStudentProfilesScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { theme } = useTheme();
  const profiles = route.params?.profilesData || [];

  const renderComprehensiveCard = ({ item }: { item: any }) => {
    if (!item) return null;
    const userObj = typeof item.userId === 'object' && item.userId ? item.userId : null;
    const studentName = userObj ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() : 'Unmapped Target';
    const dobString = typeof item.dateOfBirth === 'string' ? item.dateOfBirth.split('T')[0] : 'N/A';
    
    const guardianString = item.guardian ? `${item.guardian.name || ''} (${item.guardian.relation || ''})` : 'None Mapped';
    const schoolStr = item.previousSchool?.name ? `${item.previousSchool.name} (${item.previousSchool.percentage || 0}%)` : 'N/A';
    const healthStr = item.healthInfo?.bloodGroup ? `Blood: ${item.healthInfo.bloodGroup} | Emergency: ${item.healthInfo.emergencyContact || 'N/A'}` : 'N/A';

    return (
      <View style={[feedStyles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={feedStyles.cardHeader}>
          <Text style={[feedStyles.cardTitle, { color: theme.text }]} numberOfLines={1}>{studentName}</Text>
          <Text style={[feedStyles.badgeText, { color: theme.primary }]}>{item.admissionNumber}</Text>
        </View>

        <Text style={[feedStyles.infoText, { color: theme.subText, marginBottom: 8 }]}>{userObj?.email || 'No Identity Linked'}</Text>

        <View style={feedStyles.grid}>
          <Text style={[feedStyles.infoText, { color: theme.text }]}>Demographics: {item.gender || 'N/A'} | {item.category || 'Gen'}</Text>
          <Text style={[feedStyles.infoText, { color: theme.text }]}>DOB: {dobString} | Religion: {item.religion || 'N/A'}</Text>
          <Text style={[feedStyles.infoText, { color: theme.subText, marginTop: 4 }]}>Guardian: {guardianString}</Text>
          <Text style={[feedStyles.infoText, { color: theme.subText }]}>Prior History: {schoolStr}</Text>
          <Text style={[feedStyles.infoText, { color: theme.subText }]}>Medical Context: {healthStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[feedStyles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={feedStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={feedStyles.backBtn}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>← Back to Master Form</Text>
        </TouchableOpacity>
        <Text style={[feedStyles.title, { color: theme.text }]}>All Student Records ({profiles.length})</Text>
      </View>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item ? item._id : Math.random().toString()}
        renderItem={renderComprehensiveCard}
        contentContainerStyle={feedStyles.listContent}
      />
    </SafeAreaView>
  );
};

// ==========================================
// EMBEDDED AUXILIARY SCREEN: ALL EXAMS FEED
// ==========================================
const AllExamsFeedScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { theme } = useTheme();
  const exams = route.params?.examsData || [];

  const renderDetailedExamCard = ({ item }: { item: any }) => {
    if (!item) return null;
    const subObj = typeof item.subjectId === 'object' && item.subjectId ? item.subjectId : null;
    const subjectName = subObj ? `${subObj.name} (${subObj.code || ''})` : 'Unmapped Subject';
    const batchObj = typeof item.batchId === 'object' && item.batchId ? item.batchId : null;
    const batchName = batchObj ? batchObj.name : 'Unmapped Cohort';

    let rawDate = 'N/A';
    let rawTime = '';
    if (typeof item.scheduledAt === 'string') {
      const segs = item.scheduledAt.split('T');
      rawDate = segs[0];
      if (segs.length > 1) rawTime = ` @ ${segs[1].substring(0, 5)}`;
    }

    return (
      <View style={[feedStyles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={feedStyles.cardHeader}>
          <Text style={[feedStyles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title || 'Untitled Assessment'}</Text>
          <View style={[feedStyles.badge, { backgroundColor: item.isActive !== false ? theme.primary : '#757575' }]}>
            <Text style={feedStyles.badgeText}>{item.type || 'MIDTERM'}</Text>
          </View>
        </View>

        <Text style={[feedStyles.infoText, { color: theme.text, fontWeight: '600', marginBottom: 4 }]}>Subject: {subjectName}</Text>
        <Text style={[feedStyles.infoText, { color: theme.subText, marginBottom: 8 }]}>Cohort: {batchName} | Venue: {item.venue || 'Remote/Auditorium'}</Text>

        <View style={feedStyles.grid}>
          <Text style={[feedStyles.infoText, { color: theme.text }]}>Schedule: {rawDate}{rawTime}</Text>
          <Text style={[feedStyles.infoText, { color: theme.text }]}>Duration: {item.duration || 0} Mins</Text>
          <Text style={[feedStyles.infoText, { color: theme.text }]}>Passing Gate: {item.passingMarks || 0} / {item.totalMarks || 100}</Text>
        </View>

        <View style={feedStyles.actionRow}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ExamResults', { examId: item._id, examTitle: item.title, batchId: typeof item.batchId === 'object' ? item.batchId._id : item.batchId, subjectId: typeof item.subjectId === 'object' ? item.subjectId._id : item.subjectId, passingMarks: item.passingMarks, totalMarks: item.totalMarks })} 
            style={[feedStyles.resultBtn, { borderColor: theme.primary }]}
          >
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>Exam Results</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[feedStyles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={feedStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={feedStyles.backBtn}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>← Back to Master Form</Text>
        </TouchableOpacity>
        <Text style={[feedStyles.title, { color: theme.text }]}>All Registered Exams ({exams.length})</Text>
      </View>

      <FlatList
        data={exams}
        keyExtractor={(item) => item ? item._id : Math.random().toString()}
        renderItem={renderDetailedExamCard}
        contentContainerStyle={feedStyles.listContent}
      />
    </SafeAreaView>
  );
};

const feedStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#DDD' },
  backBtn: { marginRight: 16 },
  title: { fontSize: 16, fontWeight: 'bold' },
  listContent: { padding: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  grid: { borderTopWidth: 0.5, borderTopColor: '#EEE', paddingTop: 8, marginTop: 4 },
  infoText: { fontSize: 13, marginBottom: 3 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, marginTop: 6, borderTopWidth: 0.5, borderTopColor: '#EEE' },
  resultBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
});

// ==========================================
// NAVIGATION INITIALIZERS
// ==========================================
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// 1. PRIMARY BOTTOM TABS
const BottomTabs = () => {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.subText,
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="CoursesTab" component={CoursesScreen} options={{ tabBarLabel: 'Courses' }} />
    </Tab.Navigator>
  );
};

// 2. CUSTOM DRAWER CONTENT (Real-Time Focus Synced)
const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const { theme } = useTheme();
  const currentRouteName = props.state.routes[props.state.index]?.name;
  const baseUrl = "https://lmsapi.dcstechnosis.com";

  const [userData, setUserData] = useState({
    fullName: "Loading Profile...",
    roleName: "STUDENT",
    initials: "U",
    profileImage: null as string | null,
    isAdmin: false,
    isTeacher: false,
    isStudent: true,
  });

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadRealUserData = async () => {
        try {
          const storedString = await AsyncStorage.getItem("user_data");
          if (storedString) {
            const userObj = JSON.parse(storedString);
            
            const first = (userObj.firstName || '').trim();
            const last = (userObj.lastName || '').trim();
            const mergedName = `${first} ${last}`.trim();

            let initials = "U";
            if (first && last) {
                initials = `${first[0]}${last[0]}`.toUpperCase();
            } else if (first) {
              initials = `${first[0]}${first[first.length - 1]}`.toUpperCase();
            } else if (userObj.name) {
              const cleaned = userObj.name.trim();
              initials = cleaned.length > 0 ? cleaned[0].toUpperCase() : "U";
            }

            let extractedRole = (userObj.role || 'student').trim().toLowerCase();
            if (userObj.role && typeof userObj.role === 'object') {
              extractedRole = (userObj.role.name || 'student').trim().toLowerCase();
            }

            let avatarUrl = userObj.profileImage || userObj.profilePicture || null;
            if (avatarUrl && !avatarUrl.startsWith('http')) {
              const cleanPath = avatarUrl.startsWith('/') ? avatarUrl.substring(1) : avatarUrl;
              avatarUrl = `${baseUrl}/${cleanPath}`;
            }

            if (isMounted) {
              setUserData({
                fullName: mergedName || userObj.name || "Authorized Identity",
                roleName: extractedRole.toUpperCase(),
                initials: initials,
                profileImage: avatarUrl,
                isAdmin: extractedRole === 'admin',
                isTeacher: extractedRole === 'teacher',
                isStudent: extractedRole === 'student',
              });
            }
          }
        } catch (error) {
          console.warn("Storage mapping synchronization error:", error);
        }
      };

      loadRealUserData();
      return () => { isMounted = false; };
    }, [])
  );

  const renderDrawerItem = (title: string, iconName: keyof typeof MaterialIcons.glyphMap, targetRoute: string) => {
    const isActive = currentRouteName === targetRoute;
    const activeTextColor = '#B48600';
    const inactiveTextColor = theme.text;
    const activeBg = theme.primary ? `${theme.primary}20` : 'rgba(243, 195, 0, 0.15)'; 

    return (
      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: isActive ? activeBg : 'transparent' }]}
        onPress={() => props.navigation.navigate(targetRoute)}
        activeOpacity={0.7}
      >
        <MaterialIcons name={iconName} size={22} color={isActive ? activeTextColor : theme.subText} />
        <Text style={[styles.menuItemText, { color: isActive ? activeTextColor : inactiveTextColor, fontWeight: isActive ? 'bold' : '500' }]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSectionLabel = (title: string) => (
    <Text style={[styles.sectionLabel, { color: theme.subText }]}>{title}</Text>
  );

  const handleTriggerLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Logout", 
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("user_data");
              await AsyncStorage.removeItem("token");
            } catch (e) {}
            props.navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.drawerWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      
      <View style={styles.headerContainer}>
        <View style={styles.avatarRing}>
          {userData.profileImage ? (
            <Image source={{ uri: userData.profileImage }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitials}>{userData.initials}</Text>
          )}
        </View>

        <View style={styles.headerMeta}>
          <Text style={styles.fullNameText} numberOfLines={1}>{userData.fullName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{userData.roleName}</Text>
          </View>
        </View>
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollBody} bounces={true}>
        
        {renderSectionLabel("MAIN")}
        {renderDrawerItem("Dashboard", "dashboard", "Dashboard")}
        {renderDrawerItem("Academic Years", "calendar-today", "Academic Years")}
        {renderDrawerItem("Announcements", "announcement", "Announcements")}
        
        {renderSectionLabel("ACADEMICS")}
        {renderDrawerItem("Study Material", "library-books", "StudyMaterial")}
        {renderDrawerItem("Timetable", "view-timeline", "Timetable")}
        {renderDrawerItem("Lessons", "menu-book", "Lesson")}
        {renderDrawerItem("Attendance", "event-available", "Attendance")}
        {renderDrawerItem("Exams", "schedule", "Exam")}
        {renderDrawerItem("Leave", "beach-access", "Leave")}

        {userData.isAdmin || userData.isTeacher ? (
          <View>
            {renderSectionLabel("ADMINISTRATION")}
            {renderDrawerItem("Enrollments", "how-to-reg", "Enrollment")}
            {renderDrawerItem("Student Profiles", "badge", "Student Profile")}
            {renderDrawerItem("Assignments", "assignment", "Assignment")}
            {renderDrawerItem("Batches", "label", "Batch")}
            {renderDrawerItem("Subjects", "book", "Subject")}
            {renderDrawerItem("Classes", "class", "Class")}
          </View>
        ) : null}

        {userData.isAdmin ? (
          <View>
            {renderSectionLabel("SYSTEM USERS")}
            {renderDrawerItem("Users", "people", "User")}
            {renderDrawerItem("Teachers", "school", "Teacher")}
          </View>
        ) : null}

        {renderSectionLabel("SETTINGS")}
        {renderDrawerItem("My Profile", "person", "ProfileScreen")}

      </DrawerContentScrollView>

      <View style={[styles.footerContainer, { borderTopColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.logoutBtn, { backgroundColor: theme.surface === '#FFFFFF' ? '#FEE2E2' : '#450A0A' }]}
          onPress={handleTriggerLogout}
          activeOpacity={0.8}
        >
          <MaterialIcons name="logout" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

// 3. MAIN DRAWER ARCHITECTURE
const AdminDrawer = () => {
  const { theme } = useTheme();
  
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        header: (props) => <GlobalHeader {...props} />,
        drawerType: 'slide',
        drawerStyle: { 
          backgroundColor: 'transparent', 
          width: 300,
        },
        sceneContainerStyle: { backgroundColor: theme.background },
      }}
    >
      <Drawer.Screen name="Dashboard" component={BottomTabs} />
      <Drawer.Screen name="Academic Years" component={AcademicYearScreen} />
      <Drawer.Screen name="Announcements" component={AnnouncementScreen} />
      <Drawer.Screen name="StudyMaterial" component={StudyMaterialScreen} />
      <Drawer.Screen name="Timetable" component={TimetableScreen} />
      <Drawer.Screen name="Lesson" component={LessonScreen} />
      <Drawer.Screen name="Attendance" component={AttendanceScreen} />
      <Drawer.Screen name="Exam" component={ExamScreen} />
      <Drawer.Screen name="Leave" component={LeaveScreen} />
      <Drawer.Screen name="Enrollment" component={EnrollmentScreen} /> 
      <Drawer.Screen name="Assignment" component={AssignmentScreen} />
      <Drawer.Screen name="Batch" component={BatchScreen} />
      <Drawer.Screen name="Subject" component={SubjectScreen} />
      <Drawer.Screen name="Class" component={ClassScreen} />
      <Drawer.Screen name="User" component={UserScreen} />
      <Drawer.Screen name="Teacher" component={TeacherProfileScreen} />
      <Drawer.Screen name="ProfileScreen" component={ProfileScreen} />
      <Drawer.Screen name="Student Profile" component={StudentProfileScreen} />
    </Drawer.Navigator>
  );
};

// ==========================================
// 4. APPLICATION ROOT TREE
// ==========================================
const AppNavigator = () => {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ cardStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MainTabs" component={AdminDrawer} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ header: (props) => <GlobalHeader {...props} /> }} />
        
        <Stack.Screen 
          name="AllStudentProfiles" 
          component={AllStudentProfilesScreen} 
          options={{ header: (props) => <GlobalHeader {...props} /> }} 
        />
        <Stack.Screen 
          name="AllLessonsFeed" 
          component={AllLessonsFeedScreen} 
          options={{ header: (props) => <GlobalHeader {...props} /> }} 
        />
        <Stack.Screen 
          name="ExamResults" 
          component={ExamResultsScreen} 
          options={{ header: (props) => <GlobalHeader {...props} /> }} 
        />
        <Stack.Screen 
          name="LessonAttendanceRegister" 
          component={LessonAttendanceRegisterScreen} 
          options={{ header: (props) => <GlobalHeader {...props} /> }} 
        />
        <Stack.Screen 
          name="AllTimetablesFeed" 
          component={AllTimetablesFeedScreen} 
          options={{ header: (props) => <GlobalHeader {...props} /> }} 
        />
        <Stack.Screen 
          name="AllLeavesFeed" 
          component={AllLeavesFeedScreen} 
          options={{ header: (props) => <GlobalHeader {...props} /> }} 
        />
        <Stack.Screen 
          name="AllMaterialsFeed" 
          component={AllMaterialsFeedScreen} 
          options={{ header: (props) => <GlobalHeader {...props} /> }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  drawerWrapper: {
    flex: 1,
    marginTop: Platform.OS === 'android' ? 10 : 50,
    marginBottom: 20,
    marginLeft: 10,
    marginRight: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0288D1', 
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  avatarRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  avatarInitials: { color: '#000', fontWeight: '900', fontSize: 18 },
  headerMeta: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  fullNameText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  roleBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  scrollBody: { paddingTop: 0, paddingBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', marginLeft: 20, marginRight: 20, marginTop: 16, marginBottom: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 8,
  },
  menuItemText: { fontSize: 14, marginLeft: 16 },
  footerContainer: { padding: 16, borderTopWidth: 1 },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutText: { color: '#EF4444', fontWeight: '800', fontSize: 14, marginLeft: 8 },
});

export default AppNavigator;
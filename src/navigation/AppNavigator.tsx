import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Image,
  ScrollView, // 🌟 ADDED SCROLLVIEW
} from 'react-native';

import {
  NavigationContainer,
  useFocusEffect,
} from '@react-navigation/native';

import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import GlobalHeader from '../components/GlobalHeader';

// Screens Imports
import LoginScreen from '../auth/LoginScreen';
import DashboardScreen from '../screens/admin/DashboardScreen';
import StudyMaterialScreen from '../screens/admin/StudyMaterialScreen';
import TimetableScreen from '../screens/admin/TimetableScreen';
import LessonScreen from '../screens/admin/LessonScreen';
import AttendanceScreen from '../screens/admin/AttendanceScreen';
import ExamScreen from '../screens/admin/ExamScreen';
import LeaveScreen from '../screens/admin/LeaveScreen';
import AssignmentScreen from '../screens/admin/AssignmentScreen';
import EnrollmentScreen from '../screens/admin/EnrollmentScreen';
import StudentProfileScreen from '../screens/admin/StudentProfileScreen';
import BatchScreen from '../screens/admin/BatchScreen';
import SubjectScreen from '../screens/admin/SubjectScreen';
import ClassScreen from '../screens/admin/ClassScreen';
import UserScreen from '../screens/admin/UserScreen';
import TeacherProfileScreen from '../screens/admin/TeacherProfileScreen';
import AcademicYearScreen from '../screens/admin/AcademicYearScreen';
import AnnouncementScreen from '../screens/admin/AnnouncementScreen';
import ProfileScreen from '../screens/admin/ProfileScreen';
import TestScreen from '../screens/admin/TestScreen';
import TakeTestScreen from '../screens/admin/TakeTestScreen';

import AssignmentSubmissionsScreen from '../screens/admin/AssignmentSubmissionsScreen';
import ExamResultsScreen from '../screens/admin/ExamResultsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const BottomTabs = () => {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          // tabBarLabel: 'Dashboard',
          // tabBarIcon: ({ color }) => (
          //   <MaterialIcons name="dashboard" size={20} color={color} />
          // ),
        }}
      />
    </Tab.Navigator>
  );
};

const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const { theme, isDark } = useTheme();
  const currentRouteName = props.state.routes[props.state.index]?.name;

  // COLLAPSIBLE STATE
  const [academicOpen, setAcademicOpen] = useState(true);

  const [userData, setUserData] = useState({
    fullName: 'Loading...',
    roleName: 'STUDENT',
    initials: 'U',
    profileImage: null as string | null,
    isAdmin: false,
    isTeacher: false,
    isStudent: true,
  });

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadData = async () => {
        try {
          const stored = await AsyncStorage.getItem('user_data');
          if (stored) {
            const u = JSON.parse(stored);
            const role = typeof u.role === 'object' ? (u.role?.name || 'student').toLowerCase() : (u.role || 'student').toLowerCase();
            const first = u.firstName || '';
            const last = u.lastName || '';
            const initials = first && last ? `${first[0]}${last[0]}`.toUpperCase() : first ? first.substring(0, 2).toUpperCase() : 'U';

            if (isMounted) {
              setUserData({
                fullName: `${first} ${last}`.trim() || u.name || 'Authorized User',
                roleName: role.toUpperCase(),
                initials,
                profileImage: null,
                isAdmin: role === 'admin',
                isTeacher: role === 'teacher',
                isStudent: role === 'student',
              });
            }
          }
        } catch (e) {
          console.log(e);
        }
      };
      loadData();
      return () => { isMounted = false; };
    }, [])
  );

  const renderSectionLabel = (title: string) => (
    <Text style={[styles.sectionLabel, { color: theme.subText }]}>{title}</Text>
  );

  const renderDrawerItem = (title: string, icon: keyof typeof MaterialIcons.glyphMap, route: string) => {
    const isActive = currentRouteName === route;
    return (
      <TouchableOpacity
        style={[
          styles.menuItem,
          { backgroundColor: isActive ? (isDark ? 'rgba(2, 136, 209, 0.15)' : '#E1F5FE') : 'transparent' },
        ]}
        activeOpacity={0.7}
        onPress={() => props.navigation.navigate(route)}
      >
        <MaterialIcons name={icon} size={20} color={isActive ? theme.primary : theme.subText} />
        <Text
          style={[
            styles.menuItemText,
            { color: isActive ? theme.primary : theme.text, fontWeight: isActive ? '700' : '500' },
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCollapsibleMenu = (title: string, icon: keyof typeof MaterialIcons.glyphMap, isOpen: boolean, onPress: () => void, children: React.ReactNode) => {
    return (
      <View style={{ marginBottom: 0 }}>
        <TouchableOpacity style={styles.parentMenu} activeOpacity={0.8} onPress={onPress}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name={icon} size={20} color={theme.subText} />
            <Text style={[styles.parentMenuText, { color: theme.text }]}>{title}</Text>
          </View>
          <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={20} color={theme.subText} />
        </TouchableOpacity>
        {isOpen && <View style={styles.subMenuContainer}>{children}</View>}
      </View>
    );
  };

  const handleLogout = async () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to end your session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('user_data');
          await AsyncStorage.removeItem('token');
          props.navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <View style={[styles.drawerWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* HEADER */}
      <View style={[styles.headerContainer, { backgroundColor: theme.primary }]}>
        <View style={styles.avatarRing}>
          {userData.profileImage ? (
            <Image source={{ uri: userData.profileImage }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarInitials, { color: theme.primary }]}>{userData.initials}</Text>
          )}
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.fullNameText} numberOfLines={1}>{userData.fullName}</Text>
          <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{userData.roleName}</Text></View>
        </View>
      </View>

      {/* 🌟 FIX: Used Standard ScrollView with flexShrink so it auto-sizes perfectly */}
      <ScrollView 
        bounces={false} 
        showsVerticalScrollIndicator={false} 
        style={{ flexShrink: 1 }} // This allows it to shrink to content height
        contentContainerStyle={styles.scrollBody}
      >
        {renderSectionLabel('OVERVIEW')}
        {renderDrawerItem('Dashboard', 'dashboard', 'Dashboard')}

        {userData.isAdmin && (
          <>
            {renderSectionLabel('ADMINISTRATION')}
            {renderDrawerItem('Users', 'people', 'User')}
            {renderDrawerItem('Academic Years', 'calendar-today', 'Academic Years')}
            
            {renderCollapsibleMenu('Academics', 'school', academicOpen, () => setAcademicOpen(!academicOpen),
              <>
                {renderDrawerItem('Classes', 'class', 'Class')}
                {renderDrawerItem('Batches', 'label', 'Batch')}
                {renderDrawerItem('Subjects', 'book', 'Subject')}
                {renderDrawerItem('Enrollments', 'how-to-reg', 'Enrollment')}
              </>
            )}
          </>
        )}

        {(userData.isAdmin || userData.isTeacher) && (
          <>
            {renderSectionLabel('TEACHING & EVALUATION')}
            {renderDrawerItem('Lessons', 'menu-book', 'Lesson')}
            {renderDrawerItem('Study Materials', 'library-books', 'StudyMaterial')}
            {renderDrawerItem('Assignments', 'assignment', 'Assignment')}
            {renderDrawerItem('Tests', 'check-circle', 'Test')}
            {renderDrawerItem('Exams', 'description', 'Exam')}
            {renderDrawerItem('Timetable', 'view-timeline', 'Timetable')}
            {/* {renderDrawerItem('Attendance', 'event-available', 'Attendance')} */}
          </>
        )}

        {userData.isStudent && (
          <>
            {renderSectionLabel('ACADEMICS')}
            {renderDrawerItem('Study Materials', 'library-books', 'StudyMaterial')}
            {renderDrawerItem('Timetable', 'view-timeline', 'Timetable')}
            {renderDrawerItem('Exams', 'schedule', 'Exam')}
            {renderDrawerItem('Tests', 'check-circle', 'Test')}
            {renderDrawerItem('Assignments', 'assignment', 'Assignment')}
          </>
        )}

        {renderSectionLabel('COMMUNICATION')}
        {renderDrawerItem('Announcements', 'announcement', 'Announcements')}
        {renderDrawerItem('Leave Requests', 'beach-access', 'Leave')}
      </ScrollView>

      {/* FOOTER */}
      <View style={[styles.footerContainer, { borderTopColor: theme.border }]}>
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2' }]} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />

        <Stack.Screen name="MainTabs" component={() => (
            <Drawer.Navigator
              drawerContent={(props) => <CustomDrawerContent {...props} />}
              screenOptions={{
                header: (props) => <GlobalHeader {...props} />,
                drawerType: 'front',
                overlayColor: 'rgba(0,0,0,0.5)', 
                sceneContainerStyle: { backgroundColor: 'transparent' },
                drawerStyle: {
                  backgroundColor: 'transparent',
                  width: 300, 
                  elevation: 0,
                  shadowOpacity: 0,
                },
                swipeEdgeWidth: 80,
                drawerHideStatusBarOnOpen: false,
              }}
            >
              <Drawer.Screen name="Dashboard" component={BottomTabs} />
              <Drawer.Screen name="StudyMaterial" component={StudyMaterialScreen} />
              <Drawer.Screen name="Timetable" component={TimetableScreen} />
              <Drawer.Screen name="Lesson" component={LessonScreen} />
              {/* <Drawer.Screen name="Attendance" component={AttendanceScreen} /> */}
              <Drawer.Screen name="Exam" component={ExamScreen} />
              <Drawer.Screen name="Test" component={(props) => <TestScreen {...props} />} />
              <Drawer.Screen name="Leave" component={LeaveScreen} />
              <Drawer.Screen name="Enrollment" component={EnrollmentScreen} />
              <Drawer.Screen name="Assignment" component={AssignmentScreen} />
              <Drawer.Screen name="Batch" component={BatchScreen} />
              <Drawer.Screen name="Subject" component={SubjectScreen} />
              <Drawer.Screen name="Class" component={ClassScreen} />
              <Drawer.Screen name="User" component={UserScreen} />
              <Drawer.Screen name="Teacher" component={TeacherProfileScreen} />
              <Drawer.Screen name="Academic Years" component={AcademicYearScreen} />
              <Drawer.Screen name="Announcements" component={AnnouncementScreen} />
              <Drawer.Screen name="ProfileScreen" component={ProfileScreen} />
              <Drawer.Screen name="Student Profile" component={StudentProfileScreen} />
            </Drawer.Navigator>
        )} />

        <Stack.Screen name="AssignmentSubmissions" component={AssignmentSubmissionsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ExamResults" component={ExamResultsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="testResults" component={ExamResultsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TakeTestScreen" component={TakeTestScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  drawerWrapper: {
    flexShrink: 1, // 🌟 ALLOWS DRAWER TO SHRINK DYNAMICALLY
    maxHeight: '96%', // 🌟 PREVENTS OVERFLOW ON HUGE MENUS
    marginTop: Platform.OS === 'android' ? 12 : 50,
    marginBottom: Platform.OS === 'android' ? 12 : 30, 
    marginLeft: 10,
    marginRight: 10,
    borderRadius: 20, 
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  headerContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  fullNameText: { color: '#FFF', fontWeight: '800', fontSize: 16, flexShrink: 1, letterSpacing: 0.5 },
  
  menuItem: { 
    flexDirection: 'row', 
    paddingVertical: 10,  
    paddingHorizontal: 16, 
    alignItems: 'center', 
    borderRadius: 8,      
    marginVertical: 1,    
    marginHorizontal: 10 
  },
  menuItemText: { marginLeft: 14, fontSize: 14 }, 
  
  sectionLabel: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#9CA3AF', 
    paddingLeft: 20, 
    marginTop: 18,       
    marginBottom: 6,     
    letterSpacing: 1.2 
  },
  
  headerMeta: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  avatarRing: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarInitials: { fontWeight: '900', fontSize: 18 },
  roleBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  roleBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  
  scrollBody: { paddingBottom: 10, paddingTop: 5 }, 
  
  footerContainer: { padding: 16, borderTopWidth: 1, backgroundColor: 'transparent' },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  logoutText: { color: '#EF4444', fontWeight: '800', fontSize: 14, marginLeft: 10 },
  
  parentMenu: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 10,   
    borderRadius: 8, 
    marginHorizontal: 10,
    marginVertical: 1
  },
  parentMenuText: { marginLeft: 14, fontSize: 14, fontWeight: '600' },
  subMenuContainer: { 
    marginLeft: 32, 
    borderLeftWidth: 2, 
    borderLeftColor: '#E0F2FE', 
    paddingLeft: 6, 
    marginTop: 0, 
    marginBottom: 4 
  },
});
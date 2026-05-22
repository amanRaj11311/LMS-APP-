import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Image,
} from 'react-native';

import {
  NavigationContainer,
  useFocusEffect,
} from '@react-navigation/native';

import { createStackNavigator } from '@react-navigation/stack';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';

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
        tabBarStyle: {
          backgroundColor: theme.surface,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <MaterialIcons
              name="dashboard"
              size={20}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const CustomDrawerContent = (
  props: DrawerContentComponentProps
) => {
  const { theme } = useTheme();

  const currentRouteName =
    props.state.routes[props.state.index]?.name;

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
          const stored =
            await AsyncStorage.getItem('user_data');

          if (stored) {
            const u = JSON.parse(stored);

            const role =
              typeof u.role === 'object'
                ? (
                    u.role?.name || 'student'
                  ).toLowerCase()
                : (
                    u.role || 'student'
                  ).toLowerCase();

            const first = u.firstName || '';
            const last = u.lastName || '';

            const initials =
              first && last
                ? `${first[0]}${last[0]}`.toUpperCase()
                : first
                ? first
                    .substring(0, 2)
                    .toUpperCase()
                : 'U';

            if (isMounted) {
              setUserData({
                fullName:
                  `${first} ${last}`.trim() ||
                  u.name ||
                  'Authorized User',

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

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const renderSectionLabel = (title: string) => (
    <Text
      style={[
        styles.sectionLabel,
        { color: theme.subText },
      ]}
    >
      {title}
    </Text>
  );

  const renderDrawerItem = (
    title: string,
    icon: keyof typeof MaterialIcons.glyphMap,
    route: string
  ) => {
    const isActive = currentRouteName === route;

    return (
      <TouchableOpacity
        style={[
          styles.menuItem,
          {
            backgroundColor: isActive
              ? theme.primary
                ? `${theme.primary}20`
                : '#E3F2FD'
              : 'transparent',
          },
        ]}
        activeOpacity={0.7}
        onPress={() =>
          props.navigation.navigate(route)
        }
      >
        <MaterialIcons
          name={icon}
          size={22}
          color={
            isActive ? '#B48600' : theme.subText
          }
        />

        <Text
          style={[
            styles.menuItemText,
            {
              color: isActive
                ? '#B48600'
                : theme.text,

              fontWeight: isActive
                ? 'bold'
                : '500',
            },
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    );
  };

  // COLLAPSIBLE MENU
  const renderCollapsibleMenu = (
    title: string,
    icon: keyof typeof MaterialIcons.glyphMap,
    isOpen: boolean,
    onPress: () => void,
    children: React.ReactNode
  ) => {
    return (
      <View style={{ marginBottom: 8 }}>
        <TouchableOpacity
          style={styles.parentMenu}
          activeOpacity={0.8}
          onPress={onPress}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <MaterialIcons
              name={icon}
              size={22}
              color={theme.text}
            />

            <Text
              style={[
                styles.parentMenuText,
                { color: theme.text },
              ]}
            >
              {title}
            </Text>
          </View>

          <MaterialIcons
            name={
              isOpen
                ? 'keyboard-arrow-up'
                : 'keyboard-arrow-down'
            }
            size={22}
            color={theme.text}
          />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.subMenuContainer}>
            {children}
          </View>
        )}
      </View>
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Logout',
          style: 'destructive',

          onPress: async () => {
            await AsyncStorage.removeItem(
              'user_data'
            );

            await AsyncStorage.removeItem(
              'token'
            );

            props.navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.drawerWrapper,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.avatarRing}>
          {userData.profileImage ? (
            <Image
              source={{
                uri: userData.profileImage,
              }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarInitials}>
              {userData.initials}
            </Text>
          )}
        </View>

        <View style={styles.headerMeta}>
          <Text
            style={styles.fullNameText}
            numberOfLines={1}
          >
            {userData.fullName}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {userData.roleName}
            </Text>
          </View>
        </View>
      </View>

      {/* DRAWER */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollBody}
      >
        {/* OVERVIEW */}
        {renderSectionLabel('OVERVIEW')}

        {renderDrawerItem(
          'Dashboard',
          'dashboard',
          'Dashboard'
        )}

        {/* ADMIN */}
        {userData.isAdmin && (
          <>
            {renderSectionLabel(
              'ADMINISTRATION'
            )}

            {renderDrawerItem(
              'Users',
              'people',
              'User'
            )}

            {renderDrawerItem(
              'Academic Years',
              'calendar-today',
              'Academic Years'
            )}

            {/* COLLAPSIBLE ACADEMICS */}
            {renderCollapsibleMenu(
              'Academics',
              'school',
              academicOpen,
              () =>
                setAcademicOpen(!academicOpen),

              <>
                {renderDrawerItem(
                  'Classes',
                  'class',
                  'Class'
                )}

                {renderDrawerItem(
                  'Batches',
                  'label',
                  'Batch'
                )}

                {renderDrawerItem(
                  'Subjects',
                  'book',
                  'Subject'
                )}

                {renderDrawerItem(
                  'Enrollments',
                  'how-to-reg',
                  'Enrollment'
                )}
              </>
            )}
          </>
        )}

        {/* ADMIN + TEACHER */}
        {(userData.isAdmin ||
          userData.isTeacher) && (
          <>
            {renderSectionLabel('TEACHING')}

            {renderDrawerItem(
              'Lessons',
              'menu-book',
              'Lesson'
            )}

            {renderDrawerItem(
              'Study Materials',
              'library-books',
              'StudyMaterial'
            )}

            {renderDrawerItem(
              'Assignments',
              'assignment',
              'Assignment'
            )}

            {renderDrawerItem(
              'Tests',
              'check-circle',
              'Test'
            )}

            {renderDrawerItem(
              'Exams',
              'description',
              'Exam'
            )}

            {renderDrawerItem(
              'Timetable',
              'view-timeline',
              'Timetable'
            )}

            {renderDrawerItem(
              'Attendance',
              'event-available',
              'Attendance'
            )}
          </>
        )}

        {/* STUDENT */}
        {userData.isStudent && (
          <>
            {renderSectionLabel('ACADEMICS')}

            {renderDrawerItem(
              'Study Materials',
              'library-books',
              'StudyMaterial'
            )}

            {renderDrawerItem(
              'Timetable',
              'view-timeline',
              'Timetable'
            )}

            {renderDrawerItem(
              'Exams',
              'schedule',
              'Exam'
            )}

            {renderDrawerItem(
              'Tests',
              'check-circle',
              'Test'
            )}

            {renderDrawerItem(
              'Assignments',
              'assignment',
              'Assignment'
            )}
          </>
        )}

        {/* COMMON */}
        {renderSectionLabel('COMMUNICATION')}

        {renderDrawerItem(
          'Announcements',
          'announcement',
          'Announcements'
        )}

        {renderDrawerItem(
          'Leave Requests',
          'beach-access',
          'Leave'
        )}

        {/* SETTINGS */}
        {renderSectionLabel('SETTINGS')}

        {renderDrawerItem(
          'My Profile',
          'person',
          'ProfileScreen'
        )}
      </DrawerContentScrollView>

      {/* FOOTER */}
      <View
        style={[
          styles.footerContainer,
          { borderTopColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              backgroundColor:
                theme.surface === '#FFFFFF'
                  ? '#FEE2E2'
                  : '#450A0A',
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="logout"
            size={20}
            color="#EF4444"
          />

          <Text style={styles.logoutText}>
            Log Out
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="MainTabs"
          component={() => (
            <Drawer.Navigator
              drawerContent={(props) => (
                <CustomDrawerContent
                  {...props}
                />
              )}
              screenOptions={{
                header: (props) => (
                  <GlobalHeader {...props} />
                ),
                drawerType: 'slide',
              }}
            >
              <Drawer.Screen
                name="Dashboard"
                component={BottomTabs}
              />

              <Drawer.Screen
                name="StudyMaterial"
                component={
                  StudyMaterialScreen
                }
              />

              <Drawer.Screen
                name="Timetable"
                component={TimetableScreen}
              />

              <Drawer.Screen
                name="Lesson"
                component={LessonScreen}
              />

              <Drawer.Screen
                name="Attendance"
                component={
                  AttendanceScreen
                }
              />

              <Drawer.Screen
                name="Exam"
                component={ExamScreen}
              />

              <Drawer.Screen
                name="Test"
                component={(props) => (
                  <TestScreen {...props} />
                )}
              />

              <Drawer.Screen
                name="Leave"
                component={LeaveScreen}
              />

              <Drawer.Screen
                name="Enrollment"
                component={
                  EnrollmentScreen
                }
              />

              <Drawer.Screen
                name="Assignment"
                component={
                  AssignmentScreen
                }
              />

              <Drawer.Screen
                name="Batch"
                component={BatchScreen}
              />

              <Drawer.Screen
                name="Subject"
                component={SubjectScreen}
              />

              <Drawer.Screen
                name="Class"
                component={ClassScreen}
              />

              <Drawer.Screen
                name="User"
                component={UserScreen}
              />

              <Drawer.Screen
                name="Teacher"
                component={
                  TeacherProfileScreen
                }
              />

              <Drawer.Screen
                name="Academic Years"
                component={
                  AcademicYearScreen
                }
              />

              <Drawer.Screen
                name="Announcements"
                component={
                  AnnouncementScreen
                }
              />

              <Drawer.Screen
                name="ProfileScreen"
                component={ProfileScreen}
              />

              <Drawer.Screen
                name="Student Profile"
                component={
                  StudentProfileScreen
                }
              />
            </Drawer.Navigator>
          )}
        />

        <Stack.Screen
          name="AssignmentSubmissions"
          component={
            AssignmentSubmissionsScreen
          }
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="ExamResults"
          component={ExamResultsScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="testResults"
          component={ExamResultsScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="TakeTestScreen"
          component={TakeTestScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
 headerContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 20,
  paddingHorizontal: 20,
  backgroundColor: '#0288D1', // SAME OLD BLUE
},
  fullNameText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    flexShrink: 1,
  },

  menuItem: {
    flexDirection: 'row',
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },

  menuItemText: {
    marginLeft: 15,
    fontWeight: '600',
    fontSize: 15,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#999',
    paddingLeft: 15,
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 1,
  },

  drawerWrapper: {
    flex: 1,
    marginTop:
      Platform.OS === 'android' ? 10 : 50,
    marginBottom: 20,
    marginLeft: 10,
    marginRight: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },

  headerMeta: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },

  avatarRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  avatarInitials: {
    color: '#000',
    fontWeight: '900',
    fontSize: 18,
  },

  roleBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor:
      'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },

  roleBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  scrollBody: {
    paddingBottom: 20,
  },

  footerContainer: {
    padding: 16,
    borderTopWidth: 1,
  },

  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },

  logoutText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 8,
  },

  // COLLAPSIBLE MENU
 parentMenu: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 15,
  paddingVertical: 14,
  borderRadius: 12,
  backgroundColor: 'transparent', // NO DARK BG
},

  parentMenuText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '700',
  },

  subMenuContainer: {
  marginLeft: 20,
  borderLeftWidth: 1,
  borderLeftColor: '#90CAF9', // LIGHT BLUE LINE
  paddingLeft: 10,
  marginTop: 4,
},
});
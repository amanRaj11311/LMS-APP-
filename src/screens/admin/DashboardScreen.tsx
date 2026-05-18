import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Core Themes & Secure Interceptor Client
import { useTheme } from '../../theme/ThemeContext';
import apiClient from '../../api/client';

const DashboardScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();

  // Dynamic Identity States
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | 'student'>('student');
  
  // Dynamic Contextual Data States
  const [activeBatchName, setActiveBatchName] = useState('Fetching Batch...');
  const [activeClassName, setActiveClassName] = useState('Fetching Class...');
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const fetchDashboardContext = async () => {
        setIsLoading(true);
        try {
          // 1. Unbox Authorized User Identity
          const storedString = await AsyncStorage.getItem("user_data");
          let currentRole: 'admin' | 'teacher' | 'student' = 'student';
          
          if (storedString) {
            const userObj = JSON.parse(storedString);
            setUserName(userObj.firstName || 'User');
            
            if (userObj?.role) {
              const rawRole = typeof userObj.role === 'string' ? userObj.role : userObj.role.name;
              const normalizedRole = rawRole?.trim().toLowerCase();
              if (normalizedRole === 'admin') currentRole = 'admin';
              else if (normalizedRole === 'teacher') currentRole = 'teacher';
              else currentRole = 'student';
            }
            if (isMounted) setUserRole(currentRole);
          }

          // 2. Fetch Live Telemetry Based on Exact Role Architecture
          if (currentRole === 'student') {
            // A. Fetch Student Enrollment Mapping
            try {
              // Note: Update '/api/enrollments/me' if your specific student enrollment route differs slightly in Swagger
              const enrollRes = await apiClient.get('/api/enrollments/me');
              const enrollData = Array.isArray(enrollRes.data?.data) ? enrollRes.data.data[0] : enrollRes.data?.data;
              
              if (enrollData && isMounted) {
                setActiveBatchName(enrollData.batchId?.name || 'Unmapped Batch');
                setActiveClassName(enrollData.classId?.name || 'Unmapped Class');
              } else if (isMounted) {
                setActiveBatchName('No Active Batch');
                setActiveClassName('Not Enrolled');
              }
            } catch (e) {
              if (isMounted) {
                setActiveBatchName('Batch mapping pending');
                setActiveClassName('Class unassigned');
              }
            }

            // B. Fetch Student Specific Announcements
            try {
              const annRes = await apiClient.get('/api/announcements/student');
              if (annRes.data?.data && isMounted) setRecentAnnouncements(annRes.data.data);
            } catch (e) {}

          } else if (currentRole === 'teacher') {
            // A. Fetch Assigned Batches for Teacher
            try {
              const batchRes = await apiClient.get('/api/batches/my-batches');
              const batches = batchRes.data?.data || [];
              if (batches.length > 0 && isMounted) {
                setActiveBatchName(`${batches.length} Assigned Batches`);
                setActiveClassName('Instructional Faculty');
              } else if (isMounted) {
                setActiveBatchName('No Batches Assigned');
                setActiveClassName('Faculty');
              }
            } catch (e) {
              if (isMounted) setActiveBatchName('Faculty Console');
            }

            // B. Fetch Teacher Specific Announcements
            try {
              const annRes = await apiClient.get('/api/announcements/teacher');
              if (annRes.data?.data && isMounted) setRecentAnnouncements(annRes.data.data);
            } catch (e) {}

          } else {
            // A. Global Admin Context
            if (isMounted) {
              setActiveBatchName('System Architecture');
              setActiveClassName('Global Root Access');
            }
            // B. Fetch Global Announcements
            try {
              const annRes = await apiClient.get('/api/announcements');
              if (annRes.data?.data && isMounted) setRecentAnnouncements(annRes.data.data);
            } catch (e) {}
          }

        } catch (error) {
          console.warn("Dashboard Load Interrupted:", error);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      fetchDashboardContext();
      return () => { isMounted = false; };
    }, [])
  );

  // Quick Action Menu Builder
  const ActionTile = ({ title, icon, route }: { title: string, icon: string, route: string }) => (
    <TouchableOpacity 
      style={[styles.actionTile, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => navigation.navigate(route)}
    >
      <View style={[styles.iconCircle, { backgroundColor: theme.primary + '15' }]}>
        <MaterialIcons name={icon as any} size={28} color={theme.primary} />
      </View>
      <Text style={[styles.tileText, { color: theme.text }]} numberOfLines={1}>{title}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Extract top 2 most recent announcements
  const displayAnnouncements = Array.isArray(recentAnnouncements) ? recentAnnouncements.slice(0, 2) : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        
        {/* ========================================== */}
        {/* 1. DYNAMIC IDENTITY & ENROLLMENT BANNER */}
        {/* ========================================== */}
        <View style={[styles.welcomeCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userNameText}>{userName}</Text>
          
          <View style={styles.enrollmentTag}>
            <MaterialIcons name={userRole === 'admin' ? "security" : "school"} size={16} color={theme.primary} />
            <Text style={[styles.enrollmentText, { color: theme.primary }]}>
              {activeClassName} • {activeBatchName}
            </Text>
          </View>
        </View>

        {/* ========================================== */}
        {/* 2. ROLE-BASED QUICK WORKSPACE GRID */}
        {/* ========================================== */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>My Workspace</Text>
        
        <View style={styles.gridContainer}>
          <ActionTile title="My Profile" icon="person" route="ProfileScreen" />
          <ActionTile title="Timetable" icon="view-timeline" route="Timetable" />
          <ActionTile title="Study Material" icon="library-books" route="StudyMaterial" />
          <ActionTile title="Lessons" icon="menu-book" route="Lesson" />
          <ActionTile title="Assignments" icon="assignment" route="Assignment" />
          <ActionTile title="My Exams" icon="schedule" route="Exam" />
          <ActionTile title="Attendance" icon="event-available" route="Attendance" />
          <ActionTile title="Leave" icon="beach-access" route="Leave" />
          {userRole === 'admin' && <ActionTile title="Enrollments" icon="how-to-reg" route="Enrollment" />}
        </View>

        {/* ========================================== */}
        {/* 3. LIVE ANNOUNCEMENT FEED */}
        {/* ========================================== */}
        <View style={styles.announcementHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 0 }]}>Recent Announcements</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Announcements')}>
            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>View All</Text>
          </TouchableOpacity>
        </View>

        {displayAnnouncements.length > 0 ? (
          displayAnnouncements.map((ann, idx) => {
            let dateStr = 'Recently';
            if (typeof ann.createdAt === 'string') dateStr = ann.createdAt.split('T')[0];

            return (
              <View key={ann._id || idx} style={[styles.announcementCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <MaterialIcons name="campaign" size={20} color="#F59E0B" />
                  <Text style={[styles.announcementTitle, { color: theme.text }]} numberOfLines={1}>{ann.title || 'Notification'}</Text>
                </View>
                <Text style={[styles.announcementDesc, { color: theme.subText }]} numberOfLines={2}>
                  {ann.description || ann.content || 'No details provided.'}
                </Text>
                <Text style={{ fontSize: 11, color: theme.subText, marginTop: 8 }}>{dateStr}</Text>
              </View>
            );
          })
        ) : (
          <View style={[styles.announcementCard, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center', paddingVertical: 24 }]}>
            <MaterialIcons name="notifications-none" size={32} color={theme.subText} />
            <Text style={{ color: theme.subText, marginTop: 8, fontSize: 13 }}>No active announcements found.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  welcomeCard: { padding: 20, borderRadius: 16, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  welcomeText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  userNameText: { color: '#FFF', fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
  enrollmentTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  enrollmentText: { fontWeight: 'bold', fontSize: 12, marginLeft: 6 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, marginTop: 10 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionTile: { width: '31%', aspectRatio: 1, borderRadius: 16, borderWidth: 1, padding: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  announcementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  announcementCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  announcementTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 8, flex: 1 },
  announcementDesc: { fontSize: 14, lineHeight: 18 },
});

export default DashboardScreen;
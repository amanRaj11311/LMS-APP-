import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Core Themes & Secure Interceptor Client
import { useTheme } from '../../theme/ThemeContext';
import apiClient from '../../api/client';

const DashboardScreen = ({ navigation }: { navigation: any }) => {
  const { theme, isDark } = useTheme();

  // Dynamic Identity States
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | 'student'>('student');
  
  // Dynamic Contextual Data States
  const [activeBatchName, setActiveBatchName] = useState('Fetching Batch...');
  const [activeClassName, setActiveClassName] = useState('Fetching Class...');
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  
  // KPI Data States
  const [kpiData, setKpiData] = useState<any>({});
  
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
              if (isMounted) { setActiveBatchName('Batch mapping pending'); setActiveClassName('Class unassigned'); }
            }

            // B. Fetch Student KPIs (Mocking some values if backend aggregate endpoints don't exist yet)
            try {
              const [annRes, assigRes, leaveRes] = await Promise.allSettled([
                apiClient.get('/api/announcements/student'),
                apiClient.get('/api/assignments/my-assignments'),
                apiClient.get('/api/leaves/me') // adjust route if needed
              ]);
              
              let annCount = 0, assigCount = 0, activeAssigCount = 0, pendingLeaves = 0;
              
              if (annRes.status === 'fulfilled' && annRes.value.data?.data) {
                const anns = annRes.value.data.data;
                if (isMounted) setRecentAnnouncements(anns);
                annCount = anns.length;
              }
              if (assigRes.status === 'fulfilled' && assigRes.value.data?.data) {
                 const assigs = assigRes.value.data.data;
                 assigCount = assigs.length;
                 activeAssigCount = assigs.length; // Can add filter logic here
              }
              if (leaveRes.status === 'fulfilled' && leaveRes.value.data?.data) {
                 const leaves = leaveRes.value.data.data;
                 pendingLeaves = leaves.filter((l: any) => l.status === 'pending').length;
              }
              
              if(isMounted) {
                 setKpiData({
                    assignments: assigCount,
                    activeAssignments: activeAssigCount,
                    announcements: annCount,
                    leaves: pendingLeaves
                 });
              }
            } catch (e) {}

          } else if (currentRole === 'teacher') {
            // A. Fetch Assigned Batches for Teacher
            try {
              const batchRes = await apiClient.get('/api/batches/my-batches');
              const batches = batchRes.data?.data || [];
              if (batches.length > 0 && isMounted) {
                setActiveBatchName(`${batches.length} Assigned Batches`);
                setActiveClassName('Instructional Faculty');
                setKpiData(prev => ({...prev, myBatches: batches.length, activeBatches: batches.length}));
              } else if (isMounted) {
                setActiveBatchName('No Batches Assigned');
                setActiveClassName('Faculty');
              }
            } catch (e) {
              if (isMounted) setActiveBatchName('Faculty Console');
            }

            // B. Fetch Teacher specific KPIs
            try {
               const [annRes, subjRes, assigRes] = await Promise.allSettled([
                 apiClient.get('/api/announcements/teacher'),
                 apiClient.get('/api/subjects'), // change to my-subjects if route exists
                 apiClient.get('/api/assignments') // change to teacher specific if needed
               ]);
               
               if (annRes.status === 'fulfilled' && annRes.value.data?.data && isMounted) {
                 setRecentAnnouncements(annRes.value.data.data);
               }
               if(isMounted) {
                 setKpiData(prev => ({
                   ...prev,
                   mySubjects: subjRes.status === 'fulfilled' ? (subjRes.value.data?.data?.length || 0) : 0,
                   activeAssignments: assigRes.status === 'fulfilled' ? (assigRes.value.data?.data?.length || 0) : 0
                 }));
               }
            } catch (e) {}

          } else {
            // Admin Context
            if (isMounted) {
              setActiveBatchName('System Architecture');
              setActiveClassName('Global Root Access');
            }
            
            // A. Fetch Admin KPIs & Announcements (Parallel)
            try {
              const [usersR, classR, batchR, assignR, annR, leaveR] = await Promise.allSettled([
                apiClient.get('/api/users'),
                apiClient.get('/api/classes'),
                apiClient.get('/api/batches'),
                apiClient.get('/api/assignments'),
                apiClient.get('/api/announcements'),
                apiClient.get('/api/leaves')
              ]);

              if (annR.status === 'fulfilled' && annR.value.data?.data && isMounted) {
                setRecentAnnouncements(annR.value.data.data);
              }

              if(isMounted) {
                 const allUsers = usersR.status === 'fulfilled' ? (usersR.value.data?.data || []) : [];
                 setKpiData({
                    totalStudents: allUsers.filter((u:any) => u.role === 'student' || u.role?.name === 'student').length,
                    totalTeachers: allUsers.filter((u:any) => u.role === 'teacher' || u.role?.name === 'teacher').length,
                    totalUsers: allUsers.length,
                    classes: classR.status === 'fulfilled' ? (classR.value.data?.data?.length || 0) : 0,
                    batches: batchR.status === 'fulfilled' ? (batchR.value.data?.data?.length || 0) : 0,
                    assignments: assignR.status === 'fulfilled' ? (assignR.value.data?.data?.length || 0) : 0,
                    announcements: annR.status === 'fulfilled' ? (annR.value.data?.data?.length || 0) : 0,
                    pendingLeaves: leaveR.status === 'fulfilled' ? (leaveR.value.data?.data?.filter((l:any)=>l.status==='pending').length || 0) : 0,
                 });
              }
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

  // Reusable KPI Card Component
  const KPICard = ({ title, value, subtitle, icon, iconColor }: any) => (
    <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={[styles.kpiTitle, { color: theme.subText }]}>{title}</Text>
        <View style={[styles.kpiIconBox, { backgroundColor: iconColor + '15' }]}>
           <MaterialIcons name={icon} size={18} color={iconColor} />
        </View>
      </View>
      <Text style={[styles.kpiValue, { color: iconColor }]}>{value}</Text>
      <Text style={[styles.kpiSubtitle, { color: theme.subText }]}>{subtitle}</Text>
    </View>
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
        {/* 1.5. ROLE-BASED KPI SECTION (NEW) */}
        {/* ========================================== */}
        <View style={styles.kpiGrid}>
            {userRole === 'admin' && (
               <>
                 <KPICard title="TOTAL STUDENTS" value={kpiData.totalStudents || 0} subtitle="Enrolled across all batches" icon="school" iconColor="#3B82F6" />
                 <KPICard title="TEACHERS" value={kpiData.totalTeachers || 0} subtitle="Active faculty members" icon="people" iconColor="#10B981" />
                 <KPICard title="CLASSES" value={kpiData.classes || 0} subtitle="Active classes" icon="domain" iconColor="#8B5CF6" />
                 <KPICard title="ACTIVE BATCHES" value={kpiData.batches || 0} subtitle="Running batches" icon="event" iconColor="#F59E0B" />
                 <KPICard title="ACTIVE ASSIGNMENTS" value={kpiData.assignments || 0} subtitle="Pending submissions" icon="assignment" iconColor="#3B82F6" />
                 <KPICard title="ANNOUNCEMENTS" value={kpiData.announcements || 0} subtitle="Total posted" icon="campaign" iconColor="#10B981" />
                 <KPICard title="PENDING LEAVES" value={kpiData.pendingLeaves || 0} subtitle="Awaiting review" icon="person-outline" iconColor="#F97316" />
                 <KPICard title="TOTAL USERS" value={kpiData.totalUsers || 0} subtitle="All system users" icon="people-alt" iconColor="#64748B" />
               </>
            )}

            {userRole === 'teacher' && (
               <>
                 <KPICard title="MY BATCHES" value={kpiData.myBatches || 0} subtitle="Batches assigned to you" icon="event" iconColor="#3B82F6" />
                 <KPICard title="ACTIVE BATCHES" value={kpiData.activeBatches || 0} subtitle="Currently running" icon="trending-up" iconColor="#10B981" />
                 <KPICard title="MY SUBJECTS" value={kpiData.mySubjects || 0} subtitle="Subjects you teach" icon="book" iconColor="#8B5CF6" />
                 <KPICard title="ACTIVE ASSIGNMENTS" value={kpiData.activeAssignments || 0} subtitle="Your active assignments" icon="assignment" iconColor="#F59E0B" />
               </>
            )}

            {userRole === 'student' && (
               <>
                 <KPICard title="MY ASSIGNMENTS" value={kpiData.assignments || 0} subtitle="Assigned to your batch" icon="assignment" iconColor="#3B82F6" />
                 <KPICard title="ACTIVE ASSIGNMENTS" value={kpiData.activeAssignments || 0} subtitle="Currently due" icon="trending-up" iconColor="#F59E0B" />
                 <KPICard title="ANNOUNCEMENTS" value={kpiData.announcements || 0} subtitle="Latest updates" icon="notifications" iconColor="#10B981" />
                 <KPICard title="MY LEAVES" value={kpiData.leaves || 0} subtitle="Pending review" icon="person-outline" iconColor="#8B5CF6" />
               </>
            )}
        </View>

        {/* ========================================== */}
        {/* 2. ROLE-BASED QUICK WORKSPACE GRID */}
        {/* ========================================== */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>My Workspace</Text>
        
        <View style={styles.gridContainer}>
          <ActionTile title="Timetable" icon="view-timeline" route="Timetable" />
          <ActionTile title="Study Material" icon="library-books" route="StudyMaterial" />
          <ActionTile title="Lessons" icon="menu-book" route="Lesson" />
          <ActionTile title="Assignments" icon="assignment" route="Assignment" />
          <ActionTile title="My Exams" icon="schedule" route="Exam" />
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
  
  welcomeCard: { padding: 20, borderRadius: 16, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  welcomeText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  userNameText: { color: '#FFF', fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
  enrollmentTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  enrollmentText: { fontWeight: 'bold', fontSize: 12, marginLeft: 6 },

  // KPI STYLES
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  kpiCard: { width: '48%', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  kpiTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, flex: 1 },
  kpiIconBox: { padding: 6, borderRadius: 8 },
  kpiValue: { fontSize: 28, fontWeight: '900', marginTop: 12, marginBottom: 4 },
  kpiSubtitle: { fontSize: 11 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, marginTop: 10 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionTile: { width: '31%', aspectRatio: 1, borderRadius: 16, borderWidth: 1, padding: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  announcementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  announcementCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  announcementTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 9, flex: 1 },
  announcementDesc: { fontSize: 14, lineHeight: 18 },
});

export default DashboardScreen;
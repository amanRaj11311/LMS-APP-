import React, { useState, useCallback } from 'react';
import { 
  View, Text, Switch, TouchableOpacity, StyleSheet, Platform, 
  Modal, TouchableWithoutFeedback, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { DrawerActions, CommonActions, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authStorage } from '../api/client';

const GlobalHeader: React.FC<any> = ({ navigation, route }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  
  // 🌟 DYNAMIC USER STATE
  const [userData, setUserData] = useState({
    fullName: "User",
    initials: "U"
  });

  // Fetch data on focus
  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        const stored = await AsyncStorage.getItem("user_data");
        if (stored) {
          const u = JSON.parse(stored);
          const first = u.firstName || "";
          const last = u.lastName || "";
          const initials = (first ? first[0] : "U") + (last ? last[0] : "");
          setUserData({
            fullName: `${first} ${last}`.trim() || "User",
            initials: initials.toUpperCase()
          });
        }
      };
      loadUser();
    }, [])
  );

  const handleLogout = () => {
    setMenuVisible(false);
    Alert.alert('Confirm Logout', 'Are you sure you want to end your session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authStorage.clearTokens();
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ backgroundColor: theme.appBar }} edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: theme.appBar }]}>
        <View style={styles.leftSection}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
            <View style={[styles.bar, { backgroundColor: isDark ? theme.text : '#FFFFFF' }]} />
            <View style={[styles.bar, { backgroundColor: isDark ? theme.text : '#FFFFFF' }]} />
            <View style={[styles.bar, { backgroundColor: isDark ? theme.text : '#FFFFFF' }]} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? theme.text : '#FFFFFF' }]}>
            {route.name}
          </Text>
        </View>
        
        {/* 🌟 DYNAMIC AVATAR */}
        <TouchableOpacity 
          style={[styles.avatarCircle, { borderColor: isDark ? theme.primary : '#FFFFFF' }]}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={[styles.avatarText, { color: isDark ? theme.primary : '#FFFFFF' }]}>
            {userData.initials}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal remains same as your original code */}
      <Modal animationType="fade" transparent={true} visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.menuBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
               {/* <View style={{padding: 16, borderBottomWidth: 0.5, borderBottomColor: theme.border}}>
                  <Text style={{fontWeight: 'bold', color: theme.text}}>{userData.fullName}</Text>
               </View> */}
               {/* <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('ProfileScreen'); }}>
                  <Text style={{color: theme.text}}>My Profile</Text>
               </TouchableOpacity> */}
               <View style={styles.switchRow}>
                  <Text style={{color: theme.text}}>{isDark ? "Dark mode" : "Light mode"}</Text>
                  <Switch value={isDark} onValueChange={toggleTheme} />
               </View>
               <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <Text style={{color: '#D32F2F', fontWeight: 'bold'}}>Logout</Text>
               </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  container: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  leftSection: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { marginRight: 16, justifyContent: 'space-around', width: 24, height: 18 },
  bar: { height: 2.5, width: 22, borderRadius: 2 },
  title: { fontSize: 20, fontWeight: '700' },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  avatarText: { fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)' },
  menuBox: { position: 'absolute', top: 70, right: 16, width: 200, borderRadius: 12, borderWidth: 1, paddingVertical: 4, elevation: 5 },
  menuItem: { paddingVertical: 14, paddingHorizontal: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16 }
});

export default GlobalHeader;
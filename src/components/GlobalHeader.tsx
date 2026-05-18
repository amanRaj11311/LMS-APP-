import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Switch, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  Modal, 
  TouchableWithoutFeedback,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { DrawerActions, CommonActions } from '@react-navigation/native';
import { authStorage } from '../api/client'; // Import your safe storage cleanup helper

const GlobalHeader: React.FC<any> = ({ navigation, route }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  // Administrative identifier defaults
  const firstName = "Super";
  const lastName = "Admin";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  // Secure user logout handler
  const handleLogout = () => {
    // Hide the dropdown menu immediately
    setMenuVisible(false);

    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to end your active learning session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Purge authorization payload tokens securely from local device memory
              await authStorage.clearTokens();

              // 2. Perform a hard structural reset of the navigation tree back to the Login screen.
              // Using CommonActions.reset ensures the user cannot press the hardware back button to re-enter the dashboard.
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            } catch (error) {
              Alert.alert('Execution Error', 'Unable to execute safe session cleanup.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ backgroundColor: theme.appBar }} edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: theme.appBar }]}>
        
        {/* Left Side: Hamburger Interface Control + Active Routing Title */}
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.menuBtn}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            activeOpacity={0.7}
          >
            <View style={[styles.bar, { backgroundColor: isDark ? theme.text : '#FFFFFF' }]} />
            <View style={[styles.bar, { backgroundColor: isDark ? theme.text : '#FFFFFF' }]} />
            <View style={[styles.bar, { backgroundColor: isDark ? theme.text : '#FFFFFF' }]} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: isDark ? theme.text : '#FFFFFF' }]}>
            {route.name}
          </Text>
        </View>
        
        {/* Right Side: Account Visual Anchor */}
        <TouchableOpacity 
          style={[styles.avatarCircle, { borderColor: isDark ? theme.primary : '#FFFFFF' }]}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.avatarText, { color: isDark ? theme.primary : '#FFFFFF' }]}>
            {initials}
          </Text>
        </TouchableOpacity>

      </View>

      {/* Dynamic Overlay Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                
                {/* Menu Action 1: Target Profile Screen Access */}
                <TouchableOpacity 
                  style={[styles.menuItem, { borderBottomColor: theme.border, borderBottomWidth: 0.5 }]}
                  onPress={() => {
                    setMenuVisible(false);
                    navigation.navigate('Profile');
                  }}
                >
                  <Text style={[styles.menuItemText, { color: theme.text }]}>My Profile</Text>
                </TouchableOpacity>

                {/* Menu Action 2: Visual Interface Theme Toggle Switch */}
                <View style={[styles.switchRow, { borderBottomColor: theme.border, borderBottomWidth: 0.5 }]}>
                  <Text style={[styles.menuItemText, { color: theme.text }]}>
                    {isDark ? "Dark mode" : "Light mode"}
                  </Text>
                  <Switch
                    value={isDark}
                    onValueChange={toggleTheme}
                    trackColor={{ false: '#767577', true: '#4FC3F7' }}
                    thumbColor={isDark ? '#FFFFFF' : '#F4F3F4'}
                  />
                </View>

                {/* Menu Action 3: Session Termination Task Trigger */}
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={handleLogout}
                >
                  <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
                </TouchableOpacity>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  leftSection: { flexDirection: 'row', alignItems: 'center' },
  
  // Custom Hamburger Rendering Guidelines
  menuBtn: { marginRight: 16, justifyContent: 'space-around', width: 24, height: 18 },
  bar: { height: 2.5, width: 22, borderRadius: 2 },
  
  title: { fontSize: 20, fontWeight: '700' },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  avatarText: { fontSize: 15, fontWeight: 'bold' },
  
  // Custom Modal Container Framework
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)' },
  menuBox: { position: 'absolute', top: Platform.OS === 'ios' ? 100 : 70, right: 16, width: 200, borderRadius: 12, borderWidth: 1, paddingVertical: 4, elevation: 5 },
  menuItem: { paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontSize: 16, fontWeight: '500' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16 },
  
  // Destructive Action Styling
  logoutText: { color: '#D32F2F', fontWeight: '600' },
});

export default GlobalHeader;
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import {
  DrawerActions,
  CommonActions,
  useFocusEffect,
} from '@react-navigation/native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { authStorage } from '../api/client';

const GlobalHeader: React.FC<any> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const [userData, setUserData] = useState({
    fullName: 'User',
    email: 'user@gmail.com',
    initials: 'U',
  });

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadUser = async () => {
        try {
          const stored = await AsyncStorage.getItem('user_data');

          if (stored) {
            const u = JSON.parse(stored);

            const first = u.firstName || '';
            const last = u.lastName || '';

            const fullName =
              `${first} ${last}`.trim() ||
              u.name ||
              u.fullName ||
              'User';

            const email =
              u.email ||
              u.gmail ||
              u.userEmail ||
              u.username ||
              'user@gmail.com';

            const initials =
              first && last
                ? `${first[0]}${last[0]}`.toUpperCase()
                : fullName
                    .split(' ')
                    .filter(Boolean)
                    .map((word: string) => word[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase() || 'U';

            if (isMounted) {
              setUserData({
                fullName,
                email,
                initials,
              });
            }
          }
        } catch (error) {
          console.log('GlobalHeader user load error:', error);
        }
      };

      loadUser();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const handleLogout = () => {
    setMenuVisible(false);

    Alert.alert('Confirm Logout', 'Are you sure you want to end your session?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authStorage.clearTokens();
            await AsyncStorage.removeItem('user_data');
            await AsyncStorage.removeItem('token');

            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            );
          } catch (error) {
            console.log('Logout error:', error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={{ backgroundColor: theme.appBar }}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.container, { backgroundColor: theme.appBar }]}>
        <View style={styles.leftSection}>
          <TouchableOpacity
            style={styles.menuBtn}
            activeOpacity={0.8}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <View
              style={[
                styles.bar,
                { backgroundColor: isDark ? theme.text : '#FFFFFF' },
              ]}
            />
            <View
              style={[
                styles.bar,
                { backgroundColor: isDark ? theme.text : '#FFFFFF' },
              ]}
            />
            <View
              style={[
                styles.bar,
                { backgroundColor: isDark ? theme.text : '#FFFFFF' },
              ]}
            />
          </TouchableOpacity>

          <Text
            style={[styles.title, { color: isDark ? theme.text : '#FFFFFF' }]}
            numberOfLines={1}
          >
            {route.name}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.avatarCircle,
            { borderColor: isDark ? theme.primary : '#FFFFFF' },
          ]}
          activeOpacity={0.8}
          onPress={() => setMenuVisible(true)}
        >
          <Text
            style={[
              styles.avatarText,
              { color: isDark ? theme.primary : '#FFFFFF' },
            ]}
          >
            {userData.initials}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.menuBox,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.userInfoBox}>
                  <Text
                    style={[styles.userName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {userData.fullName}
                  </Text>

                  <Text
                    style={[styles.userEmail, { color: theme.subText }]}
                    numberOfLines={1}
                  >
                    {userData.email}
                  </Text>
                </View>

                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.border },
                  ]}
                />

                <TouchableOpacity
                  style={styles.logoutItem}
                  activeOpacity={0.8}
                  onPress={handleLogout}
                >
                  <MaterialIcons
                    name="logout"
                    size={20}
                    color="#DC2626"
                  />

                  <Text style={styles.logoutText}>Sign out</Text>
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
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },

  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  menuBtn: {
    marginRight: 16,
    justifyContent: 'space-around',
    width: 24,
    height: 18,
  },

  bar: {
    height: 2.5,
    width: 22,
    borderRadius: 2,
  },

  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },

  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  avatarText: {
    fontSize: 15,
    fontWeight: 'bold',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },

  menuBox: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 78 : 88,
    right: 16,
    width: 180,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },

  userInfoBox: {
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 8,
  },

  userName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },

  userEmail: {
    fontSize: 11.5,
    fontWeight: '500',
  },

  divider: {
    height: 1,
    opacity: 0.7,
  },

  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  logoutText: {
    marginLeft: 9,
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});

export default GlobalHeader;
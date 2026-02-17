import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyDYCxW82L-nzn0hJP9vKbO8xf13LL1g0-0',
  authDomain: 'trackmygains-c6056.firebaseapp.com',
  projectId: 'trackmygains-c6056',
  storageBucket: 'trackmygains-c6056.firebasestorage.app',
  messagingSenderId: '562933005382',
  appId: '1:562933005382:android:2def61d4e885dbecc09e47',
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
};

let authInstance: Auth | null = null;

export const getFirebaseAuth = () => {
  const app = getFirebaseApp();
  if (authInstance) {
    return authInstance;
  }
  if (Platform.OS === 'web') {
    authInstance = getAuth(app);
    return authInstance;
  }
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
  return authInstance;
};

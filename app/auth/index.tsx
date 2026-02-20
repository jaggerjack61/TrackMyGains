import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getFirebaseAuth } from '@/services/firebase';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'mutedText');

  const titleText = mode === 'login' ? 'Welcome back' : 'Create an account';
  const subtitleText = mode === 'login' ? 'Sign in to continue' : 'Register to start tracking';
  const actionLabel = mode === 'login' ? 'Login' : 'Create Account';
  const isDisabled = isSubmitting;

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        router.replace('/(tabs)');
      }
    });
    return unsubscribe;
  }, [router]);

  const getAuthErrorMessage = (error: unknown) => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'This email is already in use.';
        case 'auth/invalid-email':
          return 'Please enter a valid email address.';
        case 'auth/weak-password':
          return 'Password must be at least 6 characters.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          return 'Invalid email or password.';
        case 'auth/too-many-requests':
          return 'Too many attempts. Try again later.';
        default:
          return error.message || 'Authentication failed.';
      }
    }
    return 'Authentication failed. Please try again.';
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Email and password are required.');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Please make sure both passwords match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Authentication failed', getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = useMemo(
    () => [
      styles.input,
      {
        backgroundColor: 'transparent',
        borderColor,
        color: textColor,
      },
    ],
    [borderColor, textColor]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="label" style={{ color: mutedTextColor }}>
          Track My Gains
        </ThemedText>
        <ThemedText type="title" style={styles.title}>
          {titleText}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedTextColor }]}>
          {subtitleText}
        </ThemedText>
      </View>

      <View style={[styles.segment, { borderColor }]}> 
        <Pressable
          style={[styles.segmentButton, mode === 'login' && { borderBottomColor: primaryColor, borderBottomWidth: 1 }]}
          onPress={() => setMode('login')}
        >
          <ThemedText type="label">Login</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.segmentButton, mode === 'register' && { borderBottomColor: primaryColor, borderBottomWidth: 1 }]}
          onPress={() => setMode('register')}
        >
          <ThemedText type="label">Register</ThemedText>
        </Pressable>
      </View>

      <View style={styles.form}>
        <TextInput
          style={inputStyle}
          placeholder="Email"
          placeholderTextColor={mutedTextColor}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={inputStyle}
          placeholder="Password"
          placeholderTextColor={mutedTextColor}
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
        />
        {mode === 'register' ? (
          <TextInput
            style={inputStyle}
            placeholder="Confirm password"
            placeholderTextColor={mutedTextColor}
            secureTextEntry
            textContentType="password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        ) : null}
      </View>

      <Pressable
        style={[styles.primaryButton, { backgroundColor: textColor }, isDisabled && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={isDisabled}
      >
        <ThemedText type="label" style={styles.primaryButtonText}>
          {isSubmitting ? 'Please wait...' : actionLabel}
        </ThemedText>
      </Pressable>

      <Pressable
        style={styles.switchMode}
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        <ThemedText type="link">
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 86,
    paddingBottom: 32,
    gap: 28,
  },
  header: {
    gap: 10,
  },
  title: {
    fontSize: 44,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 16,
    maxWidth: 280,
  },
  segment: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 0,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    paddingHorizontal: 0,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: Fonts?.serifItalic ?? Fonts?.serif,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 0,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.2)',
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#F9F8F6',
  },
  switchMode: {
    alignItems: 'center',
    paddingTop: 4,
  },
});

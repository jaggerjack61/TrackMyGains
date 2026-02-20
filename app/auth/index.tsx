import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SoftButton, SoftSurface } from '@/components/ui/soft-ui';
import { FocusRing } from '@/constants/neumorphism';
import { Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getFirebaseAuth } from '@/services/firebase';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'email' | 'password' | 'confirm' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const theme = useColorScheme() ?? 'light';
  const primaryColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'mutedText');

  const titleText = mode === 'login' ? 'Welcome back' : 'Create an account';
  const subtitleText = mode === 'login' ? 'Login to continue' : 'Register to start tracking';
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
        backgroundColor: cardColor,
        color: textColor,
      },
    ],
    [cardColor, textColor]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          {titleText}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedTextColor }]}>
          {subtitleText}
        </ThemedText>
      </View>

      <SoftSurface depth="extruded" radius={Radii.container} contentStyle={styles.segment}>
        <SoftButton
          onPress={() => setMode('login')}
          depth={mode === 'login' ? 'pressed' : 'extrudedSmall'}
          activeDepth="pressedSmall"
          style={styles.segmentButton}
          contentStyle={styles.segmentButtonContent}>
          <ThemedText type="defaultSemiBold">Login</ThemedText>
        </SoftButton>
        <SoftButton
          onPress={() => setMode('register')}
          depth={mode === 'register' ? 'pressed' : 'extrudedSmall'}
          activeDepth="pressedSmall"
          style={styles.segmentButton}
          contentStyle={styles.segmentButtonContent}>
          <ThemedText type="defaultSemiBold">Register</ThemedText>
        </SoftButton>
      </SoftSurface>

      <View style={styles.form}>
        <SoftSurface depth="pressedDeep" radius={Radii.control} contentStyle={styles.inputWell} style={focusedField === 'email' ? FocusRing[theme] : undefined}>
          <TextInput
            style={inputStyle}
            placeholder="Email"
            placeholderTextColor={mutedTextColor}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            onChangeText={setEmail}
          />
        </SoftSurface>
        <SoftSurface depth="pressedDeep" radius={Radii.control} contentStyle={styles.inputWell} style={focusedField === 'password' ? FocusRing[theme] : undefined}>
          <TextInput
            style={inputStyle}
            placeholder="Password"
            placeholderTextColor={mutedTextColor}
            secureTextEntry
            textContentType="password"
            value={password}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            onChangeText={setPassword}
          />
        </SoftSurface>
        {mode === 'register' ? (
          <SoftSurface depth="pressedDeep" radius={Radii.control} contentStyle={styles.inputWell} style={focusedField === 'confirm' ? FocusRing[theme] : undefined}>
            <TextInput
              style={inputStyle}
              placeholder="Confirm password"
              placeholderTextColor={mutedTextColor}
              secureTextEntry
              textContentType="password"
              value={confirmPassword}
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
              onChangeText={setConfirmPassword}
            />
          </SoftSurface>
        ) : null}
      </View>

      <SoftButton
        onPress={handleSubmit}
        disabled={isDisabled}
        depth="extruded"
        activeDepth="pressed"
        style={isDisabled && styles.disabledButton}
        contentStyle={[styles.primaryButton, { backgroundColor: primaryColor }]}
      >
        <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
          {isSubmitting ? 'Please wait...' : actionLabel}
        </ThemedText>
      </SoftButton>

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
    paddingTop: 72,
    paddingBottom: 32,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 32,
  },
  subtitle: {
    fontSize: 16,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: Radii.container,
    gap: 10,
    padding: 10,
  },
  segmentButton: {
    flex: 1,
  },
  segmentButtonContent: {
    minHeight: 46,
  },
  form: {
    gap: 12,
  },
  inputWell: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  input: {
    borderRadius: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  switchMode: {
    alignItems: 'center',
  },
});

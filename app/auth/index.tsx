import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { getElevation, readableTextOn } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getFirebaseAuth } from '@/services/firebase';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const insets = useSafeAreaInsets();
  const { scheme, colors } = useTheme();

  const titleText = mode === 'login' ? 'Welcome back' : 'Create your account';
  const subtitleText = mode === 'login' ? 'Log in to keep tracking your progress.' : 'Start logging lifts, meals and more.';
  const actionLabel = mode === 'login' ? 'Log in' : 'Create account';

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
    if (isSubmitting) return;
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
    } catch (error) {
      Alert.alert('Authentication failed', getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: colors.tint }, getElevation(scheme, 3, colors.tint)]}>
              <MaterialCommunityIcons name="dumbbell" size={30} color={readableTextOn(colors.tint)} />
            </View>
            <ThemedText type="overline" tone="subtle">
              Track My Gains
            </ThemedText>
          </View>

          <View style={styles.header}>
            <ThemedText type="title">{titleText}</ThemedText>
            <ThemedText tone="muted">{subtitleText}</ThemedText>
          </View>

          <SegmentedControl
            options={[
              { value: 'login', label: 'Log in' },
              { value: 'register', label: 'Register' },
            ]}
            value={mode}
            onChange={setMode}
          />

          <View style={styles.form}>
            <TextField
              label="Email"
              icon="email-outline"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <View>
              <TextField
                ref={passwordRef}
                label="Password"
                icon="lock-outline"
                placeholder="At least 6 characters"
                secureTextEntry={!isPasswordVisible}
                textContentType="password"
                returnKeyType={mode === 'register' ? 'next' : 'go'}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => (mode === 'register' ? confirmRef.current?.focus() : handleSubmit())}
                inputStyle={styles.passwordInput}
              />
              <Pressable
                onPress={() => setIsPasswordVisible((visible) => !visible)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                style={styles.visibilityToggle}>
                <MaterialCommunityIcons
                  name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.subtleText}
                />
              </Pressable>
            </View>
            {mode === 'register' ? (
              <TextField
                ref={confirmRef}
                label="Confirm password"
                icon="lock-check-outline"
                placeholder="Repeat your password"
                secureTextEntry={!isPasswordVisible}
                textContentType="password"
                returnKeyType="go"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onSubmitEditing={handleSubmit}
              />
            ) : null}
          </View>

          <Button label={actionLabel} size="lg" loading={isSubmitting} onPress={handleSubmit} />

          <Pressable
            style={styles.switchMode}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            accessibilityRole="button">
            <ThemedText type="caption" tone="muted">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <ThemedText type="caption" tone="tint" style={styles.switchModeAction}>
                {mode === 'login' ? 'Register' : 'Log in'}
              </ThemedText>
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  brand: {
    gap: 14,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: 6,
  },
  form: {
    gap: 14,
  },
  passwordInput: {
    paddingRight: 32,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  switchMode: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchModeAction: {
    fontWeight: '700',
  },
});

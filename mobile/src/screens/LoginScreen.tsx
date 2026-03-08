import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  I18nManager,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';
import { Ionicons } from '@expo/vector-icons';

import { setSessionCookie } from '../lib/api';
import { useAppTheme } from '../context/ThemeContext';

const API_BASE_URL = 'https://health-insight-ai.replit.app';

interface LoginScreenProps {
  onLogin: (userData: any, token: string) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot-password';
type SignupStep = 'form' | 'verify';
type ForgotPasswordStep = 'email' | 'verify' | 'reset';


export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();
  const styles = getStyles(isArabic);
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>('form');
  const [forgotPasswordStep, setForgotPasswordStep] = useState<ForgotPasswordStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setVerificationCode('');
    setSignupStep('form');
    setForgotPasswordStep('email');
  };

  const handleSendCode = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'الاسم الأول واسم العائلة مطلوبان' : 'First name and last name are required'
      );
      return;
    }
    if (!email.trim()) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'البريد الإلكتروني مطلوب' : 'Email is required'
      );
      return;
    }
    if (!phone.trim()) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'رقم الهاتف مطلوب' : 'Phone number is required'
      );
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters'
      );
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok) {
        let errorMsg = data.error || (isArabic ? 'حدث خطأ' : 'An error occurred');
        if (response.status === 409) {
          errorMsg = isArabic ? 'هذا البريد الإلكتروني مسجل مسبقاً' : 'This email is already registered';
        }
        Alert.alert(isArabic ? 'خطأ' : 'Error', errorMsg);
        return;
      }
      Alert.alert(
        isArabic ? 'تم' : 'Success',
        isArabic ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email'
      );
      setSignupStep('verify');
    } catch {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'فشل الاتصال بالخادم' : 'Failed to connect to server'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'رمز التحقق غير صحيح' : 'Invalid verification code'
      );
      return;
    }

    setIsLoading(true);
    try {
      const verifyResponse = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: verificationCode.trim() }),
      });
      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        const errorMsg = verifyData.error === 'Verification code expired'
          ? (isArabic ? 'انتهت صلاحية رمز التحقق. يرجى إعادة الإرسال' : 'Verification code expired. Please resend')
          : (isArabic ? 'رمز التحقق غير صحيح' : 'Invalid verification code');
        Alert.alert(isArabic ? 'خطأ' : 'Error', errorMsg);
        return;
      }

      const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        }),
        credentials: 'include',
      });

      const setCookieHeader = registerResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        const sessionMatch = setCookieHeader.match(/connect\.sid=[^;]+/);
        if (sessionMatch) {
          await setSessionCookie(sessionMatch[0]);
        }
      }

      const data = await registerResponse.json();
      if (!registerResponse.ok) {
        const errorMsg = data.error || (isArabic ? 'حدث خطأ' : 'An error occurred');
        Alert.alert(isArabic ? 'خطأ' : 'Error', errorMsg);
        return;
      }

      onLogin(data.user, data.token);
    } catch {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'فشل الاتصال بالخادم' : 'Failed to connect to server'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        credentials: 'include',
      });

      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        const sessionMatch = setCookieHeader.match(/connect\.sid=[^;]+/);
        if (sessionMatch) {
          await setSessionCookie(sessionMatch[0]);
        }
      }

      const data = await response.json();
      if (!response.ok) {
        let errorMsg = data.error || (isArabic ? 'حدث خطأ' : 'An error occurred');
        if (errorMsg === 'Invalid email or password') {
          errorMsg = isArabic ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : errorMsg;
        }
        Alert.alert(isArabic ? 'خطأ' : 'Error', errorMsg);
        return;
      }

      onLogin(data.user, data.token);
    } catch {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'فشل الاتصال بالخادم' : 'Failed to connect to server'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSendCode = async () => {
    if (!email.trim()) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'البريد الإلكتروني مطلوب' : 'Email is required'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok) {
        let errorMsg = data.error || (isArabic ? 'حدث خطأ' : 'An error occurred');
        if (response.status === 404) {
          errorMsg = isArabic ? 'لا يوجد حساب بهذا البريد الإلكتروني' : 'No account found with this email';
        }
        Alert.alert(isArabic ? 'خطأ' : 'Error', errorMsg);
        return;
      }
      Alert.alert(
        isArabic ? 'تم' : 'Success',
        isArabic ? 'تم إرسال رمز استعادة كلمة المرور إلى بريدك الإلكتروني' : 'Password reset code sent to your email'
      );
      setForgotPasswordStep('verify');
    } catch {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'فشل الاتصال بالخادم' : 'Failed to connect to server'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordVerifyAndReset = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'رمز التحقق غير صحيح' : 'Invalid verification code'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters'
      );
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: verificationCode.trim(),
          newPassword: password
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data.error === 'Verification code expired'
          ? (isArabic ? 'انتهت صلاحية رمز التحقق. يرجى إعادة الإرسال' : 'Verification code expired. Please resend')
          : data.error === 'Invalid verification code'
            ? (isArabic ? 'رمز التحقق غير صحيح' : 'Invalid verification code')
            : data.error || (isArabic ? 'حدث خطأ' : 'An error occurred');
        Alert.alert(isArabic ? 'خطأ' : 'Error', errorMsg);
        return;
      }

      Alert.alert(
        isArabic ? 'نجاح' : 'Success',
        isArabic ? 'تم تغيير كلمة المرور بنجاح، يمكنك الآن تسجيل الدخول.' : 'Password reset successfully, you can now sign in.'
      );
      setAuthMode('login');
      resetForm();
    } catch {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'فشل الاتصال بالخادم' : 'Failed to connect to server'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderSignupForm = () => (
    <>
      <View style={styles.nameRow}>
        <View style={[styles.inputContainer, { flex: 1 }]}>
          <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isArabic && styles.inputRTL]}
            placeholder={isArabic ? 'الاسم الأول' : 'First Name'}
            placeholderTextColor="#94a3b8"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            testID="input-first-name"
          />
        </View>
        <View style={[styles.inputContainer, { flex: 1 }]}>
          <TextInput
            style={[styles.input, isArabic && styles.inputRTL]}
            placeholder={isArabic ? 'الاسم الأخير' : 'Last Name'}
            placeholderTextColor="#94a3b8"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            testID="input-last-name"
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isArabic && styles.inputRTL]}
          placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'}
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          testID="input-email"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="call-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isArabic && styles.inputRTL]}
          placeholder={isArabic ? 'رقم الهاتف' : 'Phone Number'}
          placeholderTextColor="#94a3b8"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          testID="input-phone"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { flex: 1 }, isArabic && styles.inputRTL]}
          placeholder={isArabic ? 'كلمة المرور' : 'Password'}
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          testID="input-password"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} testID="button-toggle-password">
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isArabic && styles.inputRTL]}
          placeholder={isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}
          placeholderTextColor="#94a3b8"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry={!showPassword}
          testID="input-password-confirm"
        />
      </View>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleSendCode}
        disabled={isLoading}
        testID="button-send-code"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.buttonContent}>
            <Ionicons name="mail-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.loginButtonText}>
              {isArabic ? 'إرسال رمز التحقق' : 'Send Verification Code'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );

  const renderVerifyStep = () => (
    <>
      <View style={styles.emailBadge}>
        <Ionicons name="mail" size={18} color="#3b82f6" />
        <Text style={styles.emailBadgeText}>{email}</Text>
      </View>

      <Text style={styles.verifyHint}>
        {isArabic ? 'أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك' : 'Enter the 6-digit code sent to your email'}
      </Text>

      <View style={[styles.inputContainer, styles.codeInputContainer]}>
        <TextInput
          style={styles.codeInput}
          placeholder="000000"
          placeholderTextColor="#94a3b8"
          value={verificationCode}
          onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          testID="input-verification-code"
        />
      </View>

      <Text style={styles.checkEmailText}>
        {isArabic ? 'تحقق من صندوق البريد الوارد للحصول على رمز التحقق' : 'Check your email inbox for the verification code'}
      </Text>

      <TouchableOpacity
        style={[styles.loginButton, verificationCode.length !== 6 && styles.buttonDisabled]}
        onPress={handleVerifyAndRegister}
        disabled={isLoading || verificationCode.length !== 6}
        testID="button-verify-code"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.buttonContent}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.loginButtonText}>
              {isArabic ? 'تحقق وأنشئ الحساب' : 'Verify & Create Account'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.verifyActions}>
        <TouchableOpacity onPress={() => setSignupStep('form')} testID="button-back-to-form">
          <View style={styles.backButton}>
            <Ionicons name="arrow-back" size={16} color="#3b82f6" />
            <Text style={styles.backButtonText}>{isArabic ? 'رجوع' : 'Back'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSendCode} disabled={isLoading} testID="button-resend-code">
          <Text style={styles.resendText}>{isArabic ? 'إعادة إرسال الرمز' : 'Resend Code'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderLoginForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isArabic && styles.inputRTL]}
          placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'}
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          testID="input-email"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { flex: 1 }, isArabic && styles.inputRTL]}
          placeholder={isArabic ? 'كلمة المرور' : 'Password'}
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          testID="input-password"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} testID="button-toggle-password">
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.forgotPasswordContainer}
        onPress={() => {
          resetForm();
          setAuthMode('forgot-password');
        }}
      >
        <Text style={styles.forgotPasswordText}>
          {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={isLoading}
        testID="button-auth-submit"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>
            {isArabic ? 'تسجيل الدخول' : 'Sign In'}
          </Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderForgotPasswordFlow = () => {
    if (forgotPasswordStep === 'email') {
      return (
        <>
          <Text style={styles.verifyHint}>
            {isArabic ? 'أدخل بريدك الإلكتروني لإرسال رمز استعادة كلمة المرور.' : 'Enter your email to receive a password reset code.'}
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isArabic && styles.inputRTL]}
              placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'}
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="input-forgot-email"
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleForgotPasswordSendCode}
            disabled={isLoading}
            testID="button-forgot-send-code"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="mail-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.loginButtonText}>
                  {isArabic ? 'إرسال الرمز' : 'Send Code'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      );
    }

    if (forgotPasswordStep === 'verify') {
      return (
        <>
          <View style={styles.emailBadge}>
            <Ionicons name="mail" size={18} color="#3b82f6" />
            <Text style={styles.emailBadgeText}>{email}</Text>
          </View>

          <Text style={styles.verifyHint}>
            {isArabic ? 'أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك لتغيير كلمة المرور.' : 'Enter the 6-digit code sent to your email to reset your password.'}
          </Text>

          <View style={[styles.inputContainer, styles.codeInputContainer]}>
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor="#94a3b8"
              value={verificationCode}
              onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              testID="input-forgot-verification-code"
            />
          </View>

          <View style={styles.verifyActions}>
            <TouchableOpacity onPress={() => setForgotPasswordStep('email')} testID="button-forgot-back-to-email">
              <View style={styles.backButton}>
                <Ionicons name="arrow-back" size={16} color="#3b82f6" />
                <Text style={styles.backButtonText}>{isArabic ? 'رجوع' : 'Back'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPasswordSendCode} disabled={isLoading} testID="button-forgot-resend-code">
              <Text style={styles.resendText}>{isArabic ? 'إعادة إرسال الرمز' : 'Resend Code'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { marginTop: 16 }]}
            onPress={() => {
              if (verificationCode.length === 6) {
                setForgotPasswordStep('reset');
              } else {
                Alert.alert(
                  isArabic ? 'خطأ' : 'Error',
                  isArabic ? 'رمز التحقق يجب أن يتكون من 6 أرقام' : 'Verification code must be 6 digits'
                );
              }
            }}
            disabled={isLoading || verificationCode.length !== 6}
            testID="button-forgot-next-step"
          >
            <View style={styles.buttonContent}>
              <Text style={styles.loginButtonText}>
                {isArabic ? 'التالي' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </View>
          </TouchableOpacity>
        </>
      );
    }

    if (forgotPasswordStep === 'reset') {
      return (
        <>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }, isArabic && styles.inputRTL]}
              placeholder={isArabic ? 'كلمة المرور الجديدة' : 'New Password'}
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              testID="input-forgot-password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} testID="button-toggle-password">
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isArabic && styles.inputRTL]}
              placeholder={isArabic ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
              placeholderTextColor="#94a3b8"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry={!showPassword}
              testID="input-forgot-password-confirm"
            />
          </View>

          <View style={styles.verifyActions}>
            <TouchableOpacity onPress={() => setForgotPasswordStep('verify')} testID="button-forgot-back-to-verify">
              <View style={styles.backButton}>
                <Ionicons name="arrow-back" size={16} color="#3b82f6" />
                <Text style={styles.backButtonText}>{isArabic ? 'رجوع' : 'Back'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { marginTop: 16 }]}
            onPress={handleForgotPasswordVerifyAndReset}
            disabled={isLoading}
            testID="button-forgot-reset-submit"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.loginButtonText}>
                  {isArabic ? 'حفظ كلمة المرور' : 'Save Password'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      );
    }

    return null;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={[styles.logoContainer, { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }]}>
            <Ionicons name="flask" size={56} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{t('appName')}</Text>
          <Text style={[styles.tagline, { color: colors.mutedText }]}>
            {isArabic ? 'تحليل ذكي لنتائج فحوصاتك الطبية' : 'Smart Analysis for Your Lab Results'}
          </Text>

          <View style={styles.trustBadgesRow}>
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
              <Text style={styles.trustBadgeLabel}>
                {isArabic ? 'آمن وخاص' : 'Secure & Private'}
              </Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="flask" size={20} color="#3b82f6" />
              <Text style={styles.trustBadgeLabel}>
                {isArabic ? '+50 مؤشر' : '50+ Biomarkers'}
              </Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="sparkles" size={20} color="#7c3aed" />
              <Text style={styles.trustBadgeLabel}>
                {isArabic ? 'تحليل ذكي' : 'AI Insights'}
              </Text>
            </View>
          </View>

          <View style={[styles.formContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {authMode === 'signup'
                ? signupStep === 'verify'
                  ? (isArabic ? 'تحقق من البريد الإلكتروني' : 'Verify Email')
                  : (isArabic ? 'إنشاء حساب جديد' : 'Create Account')
                : authMode === 'forgot-password'
                  ? (isArabic ? 'مساعدة في تسجيل الدخول' : 'Login Help')
                  : (isArabic ? 'تسجيل الدخول' : 'Sign In')}
            </Text>

            {authMode === 'signup'
              ? signupStep === 'form'
                ? renderSignupForm()
                : renderVerifyStep()
              : authMode === 'forgot-password'
                ? renderForgotPasswordFlow()
                : renderLoginForm()}

            {authMode === 'forgot-password' ? (
              <TouchableOpacity
                onPress={() => {
                  setAuthMode('login');
                  resetForm();
                }}
                style={[styles.switchButton, { marginTop: 16 }]}
                testID="button-back-to-login"
              >
                <Text style={[styles.switchText, { color: colors.primary }]}>
                  {isArabic ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  resetForm();
                }}
                style={styles.switchButton}
                testID="button-switch-auth-mode"
              >
                <Text style={[styles.switchText, { color: colors.primary }]}>
                  {authMode === 'signup'
                    ? (isArabic ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'Already have an account? Sign In')
                    : (isArabic ? 'ليس لديك حساب؟ إنشاء حساب جديد' : "Don't have an account? Create Account")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.trialText}>
            {isArabic ? '15 يوم تجربة مجانية' : '15-day free trial'}
          </Text>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => i18n.changeLanguage(isArabic ? 'en' : 'ar')}
            testID="button-language-toggle"
          >
            <Ionicons name="language" size={20} color={colors.mutedText} />
            <Text style={[styles.languageButtonText, { color: colors.mutedText }]}>
              {isArabic ? 'English' : 'العربية'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://health-insight-ai.replit.app/privacy')} testID="link-privacy-login">
              <Text style={[styles.footerLink, { color: colors.mutedText }]}>{isArabic ? 'الخصوصية' : 'Privacy'}</Text>
            </TouchableOpacity>
            <Text style={[styles.footerDivider, { color: colors.mutedText }]}>|</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://health-insight-ai.replit.app/terms')} testID="link-terms-login">
              <Text style={[styles.footerLink, { color: colors.mutedText }]}>{isArabic ? 'الشروط' : 'Terms'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (isArabic: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center'
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  passwordOptions: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordContainer: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  trustBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  trustBadge: {
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    maxWidth: 80,
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: isArabic ? 0 : 8,
    marginLeft: isArabic ? 8 : 0,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1e293b',
  },
  inputRTL: {
    textAlign: 'right',
  },
  eyeIcon: {
    padding: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 15,
    width: '100%',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '700',
  },
  switchButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  emailBadgeText: {
    fontSize: 14,
    color: '#64748b',
  },
  verifyHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  codeInputContainer: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  codeInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 12,
    paddingVertical: 16,
    color: '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  checkEmailText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  verifyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  resendText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  trialText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '600',
    marginBottom: 16,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  languageButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  footerLink: {
    fontSize: 12,
    color: '#94a3b8',
  },
  footerDivider: {
    fontSize: 12,
    color: '#d1d5db',
  },
});

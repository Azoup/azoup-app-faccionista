import { FIRST_ACCESS_DEFAULT_PASSWORD } from '../constants/firstAccess';
import { useTheme } from '../contexts/ThemeContext';
import {
  backendUrlMissingMessage,
  completePasswordReset,
  getBackendUrl,
  isPasswordStrongEnough,
  isResetCodeValid,
  requestPasswordReset,
} from '../lib/passwordResetApi';
import { isSupabaseConfigured, supabase, supabaseConfigMessage } from '../lib/supabase';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  /** Retorna mensagem de erro ou null se liberou o app (login_faccionista + dashboard OK). */
  onSignedIn: () => Promise<string | null>;
};

export function LoginScreen({ onSignedIn }: Props) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [firstAccessOpen, setFirstAccessOpen] = useState(false);
  const [faEmail, setFaEmail] = useState('');
  const [faNewPass, setFaNewPass] = useState('');
  const [faConfirm, setFaConfirm] = useState('');
  const [faLoading, setFaLoading] = useState(false);
  const [faMsg, setFaMsg] = useState<string | null>(null);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotMsgSuccess, setForgotMsgSuccess] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setMsg(supabaseConfigMessage);
    }
  }, []);

  async function submit() {
    setMsg(null);
    const em = email.trim().toLowerCase();
    if (!em || !password) {
      setMsg('Informe e-mail e senha.');
      return;
    }
    if (!isSupabaseConfigured()) {
      setMsg(supabaseConfigMessage);
      return;
    }

    setLoading(true);
    try {
      const { data: signData, error } = await supabase.auth.signInWithPassword({ email: em, password });
      if (error) {
        setMsg(error.message);
        return;
      }
      if (!signData.session) {
        setMsg('Login não criou sessão. Verifique o e-mail confirmado no Supabase Auth.');
        return;
      }
      const serverErr = await onSignedIn();
      if (serverErr) {
        setMsg(serverErr);
        return;
      }
    } catch (e) {
      const text = e instanceof Error ? e.message : 'erro desconhecido';
      setMsg(`Erro ao entrar: ${text}`);
    } finally {
      setLoading(false);
    }
  }

  function openFirstAccess() {
    setFaMsg(null);
    setFaEmail(email.trim().toLowerCase());
    setFaNewPass('');
    setFaConfirm('');
    setFirstAccessOpen(true);
  }

  function openForgotPassword() {
    const hasBackend = Boolean(getBackendUrl());
    setForgotMsg(hasBackend ? null : backendUrlMissingMessage);
    setForgotMsgSuccess(false);
    setForgotStep('email');
    setForgotEmail(email.trim().toLowerCase());
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotOpen(true);
  }

  function closeForgotPassword() {
    if (forgotLoading) return;
    setForgotOpen(false);
  }

  async function sendForgotCode() {
    if (!getBackendUrl()) {
      setForgotMsgSuccess(false);
      setForgotMsg(backendUrlMissingMessage);
      return;
    }

    setForgotMsg(null);
    setForgotMsgSuccess(false);
    const em = forgotEmail.trim().toLowerCase();
    if (!em) {
      setForgotMsg('Informe o e-mail.');
      return;
    }

    setForgotLoading(true);
    try {
      const result = await requestPasswordReset(em);
      if (!result.ok) {
        setForgotMsg(result.message);
        return;
      }
      if (!result.emailCadastrado) {
        setForgotMsg(result.message);
        return;
      }
      setForgotMsg(result.message);
      setForgotMsgSuccess(true);
      setForgotStep('reset');
    } finally {
      setForgotLoading(false);
    }
  }

  async function submitForgotReset() {
    if (!getBackendUrl()) {
      setForgotMsgSuccess(false);
      setForgotMsg(backendUrlMissingMessage);
      return;
    }

    setForgotMsg(null);
    setForgotMsgSuccess(false);
    const em = forgotEmail.trim().toLowerCase();
    const code = resetCode.trim();

    if (!isResetCodeValid(code)) {
      setForgotMsg('Informe o código de 6 dígitos.');
      return;
    }
    if (!isPasswordStrongEnough(newPassword)) {
      setForgotMsg('A senha deve ter pelo menos 8 caracteres, com letras e números.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotMsg('A confirmação da senha não confere.');
      return;
    }

    setForgotLoading(true);
    try {
      const result = await completePasswordReset(em, code, newPassword);
      if (!result.ok) {
        setForgotMsg(result.message);
        return;
      }
      setForgotOpen(false);
      setEmail(em);
      setPassword('');
      setMsg(result.message + ' Entre com a nova senha.');
    } finally {
      setForgotLoading(false);
    }
  }

  async function saveFirstAccess() {
    setFaMsg(null);
    const em = faEmail.trim().toLowerCase();
    if (!em) {
      setFaMsg('Informe o e-mail.');
      return;
    }
    if (!faNewPass || faNewPass.length < 6) {
      setFaMsg('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (faNewPass !== faConfirm) {
      setFaMsg('A confirmação da senha não confere.');
      return;
    }

    setFaLoading(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: em,
        password: FIRST_ACCESS_DEFAULT_PASSWORD,
      });
      if (signErr) {
        setFaMsg(
          'Não foi possível validar. Verifique se o e-mail existe no Auth e se a senha ainda é a padrão de primeiro acesso.',
        );
        return;
      }

      const { error: updErr } = await supabase.auth.updateUser({ password: faNewPass });
      if (updErr) {
        await supabase.auth.signOut();
        setFaMsg(updErr.message);
        return;
      }
      await supabase.auth.signOut();

      setFirstAccessOpen(false);
      setEmail(em);
      setPassword('');
      setMsg('Senha alterada com sucesso. Entre com a nova senha.');
    } finally {
      setFaLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.inner}>
          <View style={styles.card}>
            <Image
              source={require('../logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="App Faccionista"
            />
            <Text style={[styles.brand, { color: theme.primary }]}>App Faccionista</Text>

            <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="E-mail"
            placeholderTextColor={theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceVariant,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Senha"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceVariant,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
          />

          {msg ? (
            <View style={[styles.errBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text
                style={[
                  styles.err,
                  { color: msg.includes('Senha alterada') ? theme.success : theme.error },
                ]}
              >
                {msg}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={loading}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: theme.primary },
              (pressed || loading) && styles.btnDim,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={theme.textOnPrimary} />
            ) : (
              <Text style={[styles.btnText, { color: theme.textOnPrimary }]}>Entrar</Text>
            )}
          </Pressable>

            <Pressable
              onPress={openForgotPassword}
              style={styles.linkBtn}
              accessibilityRole="button"
            >
              <Text style={[styles.linkText, { color: theme.primary }]}>Esqueceu a senha?</Text>
            </Pressable>
            <Pressable onPress={openFirstAccess} style={[styles.linkBtn, styles.linkBtnTight]}>
              <Text style={[styles.linkText, { color: theme.primary }]}>Primeiro acesso</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={firstAccessOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !faLoading && setFirstAccessOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Primeiro acesso</Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              Informe o e-mail da sua conta e a nova senha. Só funciona se a senha atual ainda for a padrão definida
              pelo sistema.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                value={faEmail}
                onChangeText={setFaEmail}
                placeholder="E-mail"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceVariant,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />
              <TextInput
                value={faNewPass}
                onChangeText={setFaNewPass}
                placeholder="Nova senha (mín. 6 caracteres)"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceVariant,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />
              <TextInput
                value={faConfirm}
                onChangeText={setFaConfirm}
                placeholder="Confirmar nova senha"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceVariant,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />
              {faMsg ? <Text style={[styles.err, { color: theme.error }]}>{faMsg}</Text> : null}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => !faLoading && setFirstAccessOpen(false)}
                  style={[styles.modalBtn, { borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.text, fontWeight: '600' }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={saveFirstAccess}
                  disabled={faLoading}
                  style={[
                    styles.modalBtn,
                    { backgroundColor: theme.primary, borderColor: theme.primary },
                    faLoading && styles.btnDim,
                  ]}
                >
                  {faLoading ? (
                    <ActivityIndicator color={theme.textOnPrimary} />
                  ) : (
                    <Text style={{ color: theme.textOnPrimary, fontWeight: '700' }}>Salvar</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={forgotOpen}
        transparent
        animationType="fade"
        onRequestClose={closeForgotPassword}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {forgotStep === 'email' ? 'Esqueci a senha' : 'Redefinir senha'}
            </Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              {forgotStep === 'email'
                ? 'Informe o e-mail da sua conta. Enviaremos um código de 6 dígitos.'
                : 'Digite o código recebido por e-mail e escolha a nova senha.'}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                value={forgotEmail}
                onChangeText={setForgotEmail}
                placeholder="E-mail"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={forgotStep === 'email' && !forgotLoading}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceVariant,
                    color: theme.text,
                    borderColor: theme.border,
                    opacity: forgotStep === 'reset' ? 0.85 : 1,
                  },
                ]}
              />
              {forgotStep === 'reset' ? (
                <>
                  <TextInput
                    value={resetCode}
                    onChangeText={(t) => setResetCode(t.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Código (6 dígitos)"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={6}
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.surfaceVariant,
                        color: theme.text,
                        borderColor: theme.border,
                        letterSpacing: 4,
                      },
                    ]}
                  />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Nova senha (mín. 8, letras e números)"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.surfaceVariant,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                  <TextInput
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    placeholder="Confirmar nova senha"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.surfaceVariant,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                </>
              ) : null}
              {forgotMsg ? (
                <Text
                  style={[
                    styles.err,
                    { color: forgotMsgSuccess ? theme.success : theme.error },
                  ]}
                >
                  {forgotMsg}
                </Text>
              ) : null}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={closeForgotPassword}
                  disabled={forgotLoading}
                  style={[styles.modalBtn, { borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.text, fontWeight: '600' }}>Cancelar</Text>
                </Pressable>
                {forgotStep === 'email' ? (
                  <Pressable
                    onPress={sendForgotCode}
                    disabled={forgotLoading || !getBackendUrl()}
                    style={[
                      styles.modalBtn,
                      { backgroundColor: theme.primary, borderColor: theme.primary },
                      forgotLoading && styles.btnDim,
                    ]}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color={theme.textOnPrimary} />
                    ) : (
                      <Text style={{ color: theme.textOnPrimary, fontWeight: '700' }}>Enviar código</Text>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={submitForgotReset}
                    disabled={forgotLoading}
                    style={[
                      styles.modalBtn,
                      { backgroundColor: theme.primary, borderColor: theme.primary },
                      forgotLoading && styles.btnDim,
                    ]}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color={theme.textOnPrimary} />
                    ) : (
                      <Text style={{ color: theme.textOnPrimary, fontWeight: '700' }}>Redefinir</Text>
                    )}
                  </Pressable>
                )}
              </View>
              {forgotStep === 'reset' ? (
                <Pressable
                  onPress={() => {
                    setForgotStep('email');
                    setResetCode('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setForgotMsg(null);
                  }}
                  disabled={forgotLoading}
                  style={styles.resendLink}
                >
                  <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 14 }}>
                    Solicitar novo código
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const FORM_MAX_WIDTH = 400;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
  },
  logo: {
    width: 240,
    height: 136,
    alignSelf: 'center',
    marginBottom: 16,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  errBox: {
    width: '100%',
    alignSelf: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  err: { fontSize: 14, lineHeight: 20 },
  btn: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDim: { opacity: 0.75 },
  btnText: { fontSize: 17, fontWeight: '700' },
  linkBtn: { marginTop: 20, alignSelf: 'center', paddingVertical: 8 },
  linkBtnTight: { marginTop: 8 },
  linkText: { fontSize: 16, fontWeight: '700', textDecorationLine: 'underline' },
  resendLink: { alignSelf: 'center', paddingVertical: 12, marginBottom: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
    ...(Platform.OS === 'web' ? { zIndex: 1000 } : {}),
  },
  modalBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  modalSub: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
});

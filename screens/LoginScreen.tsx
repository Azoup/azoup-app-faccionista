import { FIRST_ACCESS_DEFAULT_PASSWORD } from '../constants/firstAccess';
import { darkTheme } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useState } from 'react';
import {
  ActivityIndicator,
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

const theme = darkTheme;

type Props = {
  /** Retorna mensagem de erro ou null se liberou o app (login_faccionista + dashboard OK). */
  onSignedIn: () => Promise<string | null>;
};

export function LoginScreen({ onSignedIn }: Props) {
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

  async function submit() {
    setMsg(null);
    const em = email.trim().toLowerCase();
    if (!em || !password) {
      setMsg('Informe e-mail e senha.');
      return;
    }
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      setMsg('Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env');
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
          <Text style={[styles.brand, { color: theme.primary }]}>App Faccionista</Text>
          <Text style={[styles.sub, { color: theme.textSecondary }]}>
            Entre com o e-mail e senha do Supabase Auth. O acesso só é liberado se existir
            linha em login_faccionista com auth_user_id igual ao seu usuário e status ativo.
          </Text>

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

          <Pressable onPress={openFirstAccess} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: theme.primary }]}>Primeiro acesso</Text>
          </Pressable>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 32, justifyContent: 'center' },
  brand: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 28 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  errBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  err: { fontSize: 14, lineHeight: 20 },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDim: { opacity: 0.75 },
  btnText: { fontSize: 17, fontWeight: '700' },
  linkBtn: { marginTop: 20, alignSelf: 'center', paddingVertical: 8 },
  linkText: { fontSize: 16, fontWeight: '700', textDecorationLine: 'underline' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
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

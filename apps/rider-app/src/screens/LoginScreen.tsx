import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../lib/api";
import { setAuth, type AuthUser } from "../lib/auth";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export default function LoginScreen() {
  const { setSignedIn } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Login failed", data.error ?? "Invalid credentials");
        return;
      }

      const user = data.user as AuthUser;
      if (user.role !== "rider") {
        Alert.alert("Access denied", "This app is for riders only.");
        return;
      }

      const profile = await fetch(`${API_URL}/api/riders/me`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const profileData = await profile.json();

      if (!profile.ok || !profileData.rider?.id) {
        Alert.alert("Error", "No rider profile linked to this account.");
        return;
      }

      await setAuth(data.token, user, profileData.rider.id);
      setSignedIn(true);
    } catch {
      Alert.alert(
        "Connection error",
        "Cannot reach server. Check EXPO_PUBLIC_API_URL and that the API is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>KC</Text>
        <Text style={styles.title}>Karachi Courier</Text>
        <Text style={styles.subtitle}>Rider App</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
          placeholder="+923001234567"
          placeholderTextColor="#94a3b8"
        />

        <Text style={[styles.label, styles.labelSpaced]}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#94a3b8"
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 56,
    height: 56,
    lineHeight: 56,
    textAlign: "center",
    backgroundColor: "#1a1a2e",
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    borderRadius: 14,
    overflow: "hidden",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a1a2e",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  labelSpaced: {
    marginTop: 16,
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    minHeight: 52,
    color: "#0f172a",
  },
  button: {
    marginTop: 24,
    backgroundColor: "#16a34a",
    borderRadius: 12,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});

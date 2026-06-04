import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { formatCurrencyPkr } from "@karachi-courier/shared";
import { useAuth } from "../context/AuthContext";
import { useRider } from "../context/RiderContext";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { rider, todayDeliveries, todayCodCollected, loading } = useRider();

  function handleLogout() {
    Alert.alert("Logout", "Sign out of the rider app?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  }

  if (loading && !rider) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{rider?.name ?? "Rider"}</Text>
        <Text style={styles.meta}>{rider?.phone}</Text>
        <Text style={styles.meta}>
          {rider?.zone ?? "—"} · Bike {rider?.bike_number ?? "—"}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{todayDeliveries}</Text>
          <Text style={styles.statLabel}>Deliveries today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {formatCurrencyPkr(todayCodCollected)}
          </Text>
          <Text style={styles.statLabel}>COD collected</Text>
        </View>
      </View>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
  },
  meta: {
    fontSize: 17,
    color: "#94a3b8",
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 48,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#16a34a",
  },
  statLabel: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 6,
  },
  logoutBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#dc2626",
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: "#dc2626",
    fontSize: 18,
    fontWeight: "800",
  },
});

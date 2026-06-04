import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { apiFetch } from "../lib/api";
import { getRiderId } from "../lib/auth";
import { useRider } from "../context/RiderContext";
import type { MainTabParamList } from "../types";

function formatDuration(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function HomeScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList, "Home">>();
  const { rider, activeShift, jobsCount, refresh, loading } = useRider();
  const [shiftLoading, setShiftLoading] = useState(false);
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (!activeShift?.started_at) {
      setDuration("");
      return;
    }
    const tick = () => setDuration(formatDuration(activeShift.started_at));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [activeShift?.started_at]);

  async function startShift() {
    const riderId = await getRiderId();
    if (!riderId) return;
    setShiftLoading(true);
    try {
      await apiFetch(`/api/riders/${riderId}/shift/start`, { method: "POST" });
      await refresh();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to start shift",
      );
    } finally {
      setShiftLoading(false);
    }
  }

  async function endShift() {
    const riderId = await getRiderId();
    if (!riderId) return;

    Alert.alert("End shift?", "You will stop receiving location tracking.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Shift",
        style: "destructive",
        onPress: async () => {
          setShiftLoading(true);
          try {
            const res = await apiFetch<{ shift: { total_deliveries?: number; total_cod_collected?: number } }>(
              `/api/riders/${riderId}/shift/end`,
              { method: "POST" },
            );
            await refresh();
            Alert.alert(
              "Shift ended",
              `Deliveries: ${res.shift.total_deliveries ?? 0}\nCOD collected: PKR ${(res.shift.total_cod_collected ?? 0).toLocaleString()}`,
            );
          } catch (err) {
            Alert.alert(
              "Error",
              err instanceof Error ? err.message : "Failed to end shift",
            );
          } finally {
            setShiftLoading(false);
          }
        },
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

  const onShift = rider?.is_on_shift ?? false;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {rider?.name ?? "Rider"}</Text>
        <Text style={styles.zone}>{rider?.zone ?? "Karachi"} zone</Text>
      </View>

      <View style={styles.card}>
        {onShift ? (
          <>
            <Text style={styles.shiftLabel}>Shift active</Text>
            <Text style={styles.shiftDuration}>{duration || "Just started"}</Text>
            <Pressable
              style={[styles.bigButton, styles.endButton]}
              onPress={endShift}
              disabled={shiftLoading}
            >
              {shiftLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.bigButtonText}>End Shift</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.shiftLabel}>You are off shift</Text>
            <Text style={styles.shiftHint}>Start your shift to begin deliveries</Text>
            <Pressable
              style={[styles.bigButton, styles.startButton]}
              onPress={startShift}
              disabled={shiftLoading}
            >
              {shiftLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.bigButtonText}>Start Shift</Text>
              )}
            </Pressable>
          </>
        )}
      </View>

      <Pressable
        style={styles.jobsCard}
        onPress={() => navigation.navigate("JobsTab")}
      >
        <View>
          <Text style={styles.jobsTitle}>My Jobs</Text>
          <Text style={styles.jobsSubtitle}>Pending deliveries</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{jobsCount}</Text>
        </View>
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
    padding: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  zone: {
    fontSize: 17,
    color: "#94a3b8",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  shiftLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  shiftDuration: {
    fontSize: 32,
    fontWeight: "800",
    color: "#16a34a",
    marginTop: 8,
    marginBottom: 20,
  },
  shiftHint: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 20,
  },
  bigButton: {
    minHeight: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  startButton: {
    backgroundColor: "#16a34a",
  },
  endButton: {
    backgroundColor: "#dc2626",
  },
  bigButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  jobsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 88,
  },
  jobsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  jobsSubtitle: {
    fontSize: 15,
    color: "#64748b",
    marginTop: 4,
  },
  badge: {
    backgroundColor: "#16a34a",
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});

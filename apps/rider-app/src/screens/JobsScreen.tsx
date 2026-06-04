import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { formatCurrencyPkr } from "@karachi-courier/shared";
import { apiFetch } from "../lib/api";
import { getRiderId } from "../lib/auth";
import { useRider } from "../context/RiderContext";
import type { JobsStackParamList, Shipment } from "../types";

export default function JobsScreen() {
  const navigation =
    useNavigation<StackNavigationProp<JobsStackParamList, "JobsList">>();
  const { setJobsCount } = useRider();
  const [jobs, setJobs] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const riderId = await getRiderId();
      if (!riderId) return;
      const res = await apiFetch<{ jobs: Shipment[] }>(
        `/api/riders/${riderId}/jobs`,
      );
      setJobs(res.jobs);
      setJobsCount(res.jobs.length);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setJobsCount]);

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <FlatList
      data={jobs}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadJobs(true)} />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No active jobs</Text>
          <Text style={styles.emptyText}>Pull down to refresh</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate("JobDetail", { shipment: item })}
        >
          <Text style={styles.tracking}>{item.tracking_number}</Text>
          <Text style={styles.recipient}>{item.recipient_name}</Text>
          <Text style={styles.address} numberOfLines={2}>
            {item.delivery_address}
          </Text>
          <Text style={styles.area}>{item.delivery_area}</Text>
          {item.payment_method === "cod" && item.cod_amount != null && (
            <Text style={styles.cod}>
              COD {formatCurrencyPkr(Number(item.cod_amount))}
            </Text>
          )}
          <Text style={styles.status}>{item.status.replace(/_/g, " ")}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#334155",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 48,
  },
  tracking: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16a34a",
    fontFamily: "monospace",
  },
  recipient: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a2e",
    marginTop: 8,
  },
  address: {
    fontSize: 16,
    color: "#475569",
    marginTop: 6,
    lineHeight: 22,
  },
  area: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 4,
  },
  cod: {
    fontSize: 18,
    fontWeight: "800",
    color: "#16a34a",
    marginTop: 10,
  },
  status: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 8,
    textTransform: "capitalize",
  },
});

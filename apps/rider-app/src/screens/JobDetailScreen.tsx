import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type CameraViewRef,
} from "expo-camera";
import * as Location from "expo-location";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { formatCurrencyPkr } from "@karachi-courier/shared";
import { apiFetch } from "../lib/api";
import { useRider } from "../context/RiderContext";
import type { JobsStackParamList } from "../types";

export default function JobDetailScreen() {
  const navigation =
    useNavigation<StackNavigationProp<JobsStackParamList, "JobDetail">>();
  const route = useRoute<RouteProp<JobsStackParamList, "JobDetail">>();
  const { shipment: initial } = route.params;
  const [shipment, setShipment] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraViewRef>(null);
  const { refresh, setJobsCount } = useRider();

  async function updateStatus(status: string, note?: string) {
    setLoading(true);
    try {
      await apiFetch(`/api/shipments/${shipment.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      });
      setShipment((s) => ({ ...s, status }));
      await refresh();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Update failed",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePickedUp() {
    await updateStatus("picked_up");
    Alert.alert("Updated", "Marked as picked up");
  }

  async function handleFailed() {
    if (!failReason.trim()) {
      Alert.alert("Required", "Please enter a reason");
      return;
    }
    setShowFailModal(false);
    await updateStatus("failed", failReason.trim());
    setFailReason("");
    setJobsCount((c) => Math.max(0, c - 1));
    navigation.goBack();
  }

  async function openDeliveryCamera() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Camera required", "Enable camera for proof of delivery");
        return;
      }
    }
    setShowCamera(true);
  }

  async function submitDelivery() {
    setLoading(true);
    try {
      const photo = await cameraRef.current?.takePicture({
        base64: true,
        quality: 0.5,
      });

      if (!photo?.base64) {
        Alert.alert("Error", "Could not capture photo");
        return;
      }

      const { status: locStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (locStatus !== "granted") {
        Alert.alert("Location required", "Enable GPS for delivery confirmation");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await apiFetch(`/api/pod/${shipment.id}`, {
        method: "POST",
        body: JSON.stringify({
          photo_url: `data:image/jpeg;base64,${photo.base64}`,
          delivery_lat: pos.coords.latitude,
          delivery_lng: pos.coords.longitude,
        }),
      });

      setShowCamera(false);
      setJobsCount((c) => Math.max(0, c - 1));
      await refresh();
      navigation.replace("DeliverySuccess", {
        trackingNumber: shipment.tracking_number,
      });
    } catch (err) {
      Alert.alert(
        "Delivery failed",
        err instanceof Error ? err.message : "Could not submit POD",
      );
    } finally {
      setLoading(false);
    }
  }

  const isCod =
    shipment.payment_method === "cod" && shipment.cod_amount != null;
  const canPickUp = shipment.status === "assigned";
  const canDeliver = ["assigned", "picked_up", "in_transit"].includes(
    shipment.status,
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.tracking}>{shipment.tracking_number}</Text>
      <Text style={styles.status}>{shipment.status.replace(/_/g, " ")}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Recipient</Text>
        <Text style={styles.value}>{shipment.recipient_name}</Text>
        <Pressable
          style={styles.callButton}
          onPress={() => Linking.openURL(`tel:${shipment.recipient_phone}`)}
        >
          <Text style={styles.callText}>Call {shipment.recipient_phone}</Text>
        </Pressable>

        <Text style={[styles.label, styles.spaced]}>Delivery address</Text>
        <Text style={styles.value}>{shipment.delivery_address}</Text>
        <Text style={styles.area}>{shipment.delivery_area}</Text>

        {isCod && (
          <View style={styles.codBox}>
            <Text style={styles.codLabel}>Collect COD</Text>
            <Text style={styles.codAmount}>
              {formatCurrencyPkr(Number(shipment.cod_amount))}
            </Text>
          </View>
        )}

        {shipment.notes ? (
          <>
            <Text style={[styles.label, styles.spaced]}>Notes</Text>
            <Text style={styles.value}>{shipment.notes}</Text>
          </>
        ) : null}
      </View>

      {canPickUp && (
        <Pressable
          style={[styles.actionBtn, styles.secondaryBtn]}
          onPress={handlePickedUp}
          disabled={loading}
        >
          <Text style={styles.secondaryBtnText}>Mark as Picked Up</Text>
        </Pressable>
      )}

      {canDeliver && shipment.status !== "delivered" && (
        <Pressable
          style={[styles.actionBtn, styles.primaryBtn]}
          onPress={openDeliveryCamera}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>Mark as Delivered</Text>
        </Pressable>
      )}

      {canDeliver && shipment.status !== "delivered" && (
        <Pressable
          style={[styles.actionBtn, styles.dangerBtn]}
          onPress={() => setShowFailModal(true)}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>Mark as Failed</Text>
        </Pressable>
      )}

      {loading && (
        <ActivityIndicator
          style={{ marginTop: 16 }}
          size="large"
          color="#16a34a"
        />
      )}

      <Modal visible={showFailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Failure reason</Text>
            <TextInput
              style={styles.modalInput}
              value={failReason}
              onChangeText={setFailReason}
              placeholder="e.g. Customer not available"
              multiline
            />
            <View style={styles.modalRow}>
              <Pressable
                style={[styles.actionBtn, styles.secondaryBtn, { flex: 1 }]}
                onPress={() => setShowFailModal(false)}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.dangerBtn, { flex: 1 }]}
                onPress={handleFailed}
              >
                <Text style={styles.primaryBtnText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView
            ref={(instance) => {
              cameraRef.current = instance as unknown as CameraViewRef;
            }}
            style={styles.camera}
            facing="back"
          />
          <View style={styles.cameraControls}>
            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={submitDelivery}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "Uploading…" : "Capture & Deliver"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20, paddingBottom: 40 },
  tracking: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16a34a",
    fontFamily: "monospace",
  },
  status: {
    fontSize: 18,
    color: "#64748b",
    marginTop: 4,
    textTransform: "capitalize",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  spaced: { marginTop: 16 },
  value: { fontSize: 18, color: "#1a1a2e", marginTop: 4, lineHeight: 26 },
  area: { fontSize: 16, fontWeight: "600", color: "#475569", marginTop: 4 },
  callButton: {
    marginTop: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  callText: { fontSize: 17, fontWeight: "700", color: "#2563eb" },
  codBox: {
    marginTop: 20,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#16a34a",
  },
  codLabel: { fontSize: 14, fontWeight: "600", color: "#15803d" },
  codAmount: { fontSize: 28, fontWeight: "800", color: "#16a34a", marginTop: 4 },
  actionBtn: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryBtn: { backgroundColor: "#16a34a" },
  secondaryBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#16a34a",
  },
  dangerBtn: { backgroundColor: "#dc2626" },
  primaryBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  secondaryBtnText: { color: "#16a34a", fontSize: 18, fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    fontSize: 16,
    textAlignVertical: "top",
  },
  modalRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraControls: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#1a1a2e",
    gap: 8,
  },
});

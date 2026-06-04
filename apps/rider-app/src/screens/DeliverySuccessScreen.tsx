import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { JobsStackParamList } from "../types";

export default function DeliverySuccessScreen() {
  const navigation =
    useNavigation<StackNavigationProp<JobsStackParamList, "DeliverySuccess">>();
  const route = useRoute<RouteProp<JobsStackParamList, "DeliverySuccess">>();
  const { trackingNumber } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✓</Text>
      <Text style={styles.title}>Delivered!</Text>
      <Text style={styles.tracking}>{trackingNumber}</Text>
      <Text style={styles.subtitle}>
        Proof of delivery submitted successfully.
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.buttonText}>Back to Jobs</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  icon: {
    fontSize: 72,
    color: "#16a34a",
    fontWeight: "800",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a1a2e",
    marginTop: 16,
  },
  tracking: {
    fontSize: 18,
    fontFamily: "monospace",
    color: "#16a34a",
    marginTop: 8,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 17,
    color: "#64748b",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 24,
  },
  button: {
    marginTop: 32,
    backgroundColor: "#16a34a",
    minHeight: 52,
    minWidth: 200,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});

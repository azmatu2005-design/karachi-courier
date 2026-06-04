import { createStackNavigator } from "@react-navigation/stack";
import JobsScreen from "../screens/JobsScreen";
import JobDetailScreen from "../screens/JobDetailScreen";
import DeliverySuccessScreen from "../screens/DeliverySuccessScreen";
import type { JobsStackParamList } from "../types";

const Stack = createStackNavigator<JobsStackParamList>();

export default function JobsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#1a1a2e" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700", fontSize: 18 },
      }}
    >
      <Stack.Screen
        name="JobsList"
        component={JobsScreen}
        options={{ title: "My Jobs" }}
      />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ title: "Job Detail" }}
      />
      <Stack.Screen
        name="DeliverySuccess"
        component={DeliverySuccessScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

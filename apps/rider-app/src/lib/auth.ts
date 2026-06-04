import AsyncStorage from "@react-native-async-storage/async-storage";

export const TOKEN_KEY = "kc_rider_token";
export const USER_KEY = "kc_rider_user";
export const RIDER_ID_KEY = "kc_rider_id";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getRiderId(): Promise<string | null> {
  return AsyncStorage.getItem(RIDER_ID_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function setAuth(
  token: string,
  user: AuthUser,
  riderId: string,
): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
    [RIDER_ID_KEY, riderId],
  ]);
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, RIDER_ID_KEY]);
}

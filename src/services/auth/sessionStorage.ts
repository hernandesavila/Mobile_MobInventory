import * as SecureStore from 'expo-secure-store';

import { Session } from '@/types';

const SESSION_KEY = 'patrimonio_simples_session';
let memorySession: Session | null = null;

async function canUseSecureStore() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function saveSessionStore(session: Session) {
  const serialized = JSON.stringify(session);
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(SESSION_KEY, serialized);
  } else {
    memorySession = session;
  }
}

export async function readSessionStore(): Promise<Session | null> {
  if (await canUseSecureStore()) {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  }

  return memorySession;
}

export async function clearSessionStore() {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } else {
    memorySession = null;
  }
}

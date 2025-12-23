import {
  clearSessionStore,
  readSessionStore,
  saveSessionStore,
} from '@/services/auth/sessionStorage';
import { Session } from '@/types';

export async function loadSession(): Promise<Session | null> {
  return readSessionStore();
}

export async function persistSession(session: Session) {
  await saveSessionStore(session);
}

export async function dropSession() {
  await clearSessionStore();
}

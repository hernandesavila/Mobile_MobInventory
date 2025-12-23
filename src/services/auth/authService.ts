import { verifyUserCredentials } from '@/repositories/userRepository';
import { Credentials } from '@/types';

export async function signInWithCredentials(credentials: Credentials) {
  const { username, password } = credentials;

  if (!username || !password) {
    throw new Error('Informe usuario e senha para continuar.');
  }

  const user = await verifyUserCredentials(username.trim(), password);

  return {
    userId: user.id,
    username: user.username,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function signOutSession() {
  return Promise.resolve();
}

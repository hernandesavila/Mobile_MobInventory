import { execute, query } from '@/db';
import { hashPassword, verifyPassword } from '@/utils';

type NewUser = {
  username: string;
  password: string;
  mustChangePassword?: boolean;
  securityQuestion?: string;
  securityAnswer?: string;
};

export type UserRecord = {
  id: number;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  securityQuestion?: string;
  securityAnswerHash?: string;
  securityAnswerSalt?: string;
  mustChangePassword: boolean;
  createdAt: number;
};

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  password_salt: string;
  security_question?: string;
  security_answer_hash?: string;
  security_answer_salt?: string;
  must_change_password: number;
  created_at: number;
};

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    securityQuestion: row.security_question,
    securityAnswerHash: row.security_answer_hash,
    securityAnswerSalt: row.security_answer_salt,
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: row.created_at,
  };
}

export async function getUserByUsername(username: string): Promise<UserRecord | null> {
  const result = await query('SELECT * FROM users WHERE username = ? LIMIT 1', [
    username,
  ]);
  if (!result.rows.length) {
    return null;
  }
  return mapUser(result.rows.item(0));
}

export async function getUserById(id: number): Promise<UserRecord | null> {
  const result = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  if (!result.rows.length) {
    return null;
  }
  return mapUser(result.rows.item(0));
}

export async function createUser(payload: NewUser): Promise<UserRecord> {
  if (!payload.username?.trim()) {
    throw new Error('Usuario e obrigatorio.');
  }
  if (!payload.password) {
    throw new Error('Senha e obrigatoria.');
  }

  const now = Date.now();
  const { salt, hash } = await hashPassword(payload.password);

  let answerHash = null;
  let answerSalt = null;

  if (payload.securityAnswer) {
    const answerCrypto = await hashPassword(payload.securityAnswer.trim().toLowerCase());
    answerHash = answerCrypto.hash;
    answerSalt = answerCrypto.salt;
  }

  const result = await execute(
    `INSERT INTO users (
      username, 
      password_hash, 
      password_salt, 
      security_question, 
      security_answer_hash, 
      security_answer_salt, 
      must_change_password, 
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.username.trim(),
      hash,
      salt,
      payload.securityQuestion ?? null,
      answerHash,
      answerSalt,
      payload.mustChangePassword ? 1 : 0,
      now,
    ],
  );

  const insertId = result.insertId ?? 0;
  return {
    id: insertId,
    username: payload.username.trim(),
    passwordHash: hash,
    passwordSalt: salt,
    securityQuestion: payload.securityQuestion,
    securityAnswerHash: answerHash ?? undefined,
    securityAnswerSalt: answerSalt ?? undefined,
    mustChangePassword: Boolean(payload.mustChangePassword),
    createdAt: now,
  };
}

export async function updatePassword(userId: number, newPassword: string): Promise<void> {
  const { salt, hash } = await hashPassword(newPassword);
  await execute(
    'UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0 WHERE id = ?',
    [hash, salt, userId],
  );
}

export async function updatePasswordByUsername(
  username: string,
  newPassword: string,
): Promise<void> {
  const user = await getUserByUsername(username);
  if (!user) {
    throw new Error('Usuario nao encontrado.');
  }
  await updatePassword(user.id, newPassword);
}

export async function deleteUser(userId: number): Promise<void> {
  await execute('DELETE FROM users WHERE id = ?', [userId]);
}

export async function verifyUserCredentials(username: string, password: string) {
  const user = await getUserByUsername(username);
  if (!user) {
    throw new Error('Usuario ou senha invalidos.');
  }

  const valid = await verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!valid) {
    throw new Error('Usuario ou senha invalidos.');
  }

  return user;
}

export async function verifySecurityAnswer(
  username: string,
  answer: string,
): Promise<boolean> {
  const user = await getUserByUsername(username);
  if (!user || !user.securityAnswerHash || !user.securityAnswerSalt) {
    return false;
  }

  return verifyPassword(
    answer.trim().toLowerCase(),
    user.securityAnswerSalt,
    user.securityAnswerHash,
  );
}

export async function getUserCount(): Promise<number> {
  const result = await query('SELECT COUNT(*) as count FROM users');
  return result.rows.item(0)?.count ?? 0;
}

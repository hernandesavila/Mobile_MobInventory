import { execute } from '@/db';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export async function logAppEvent(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await execute(
      'INSERT INTO app_log (level, message, metadata, created_at) VALUES (?, ?, ?, ?)',
      [level, message, metadata ? JSON.stringify(metadata) : null, Date.now()],
    );
  } catch {
    // evita quebrar fluxo principal caso o log falhe
  }
}

export async function logError(message: string, metadata?: Record<string, unknown>) {
  return logAppEvent('ERROR', message, metadata);
}

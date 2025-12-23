import * as SecureStore from 'expo-secure-store';

import { AppSettings } from '@/types';

const SETTINGS_KEY = 'patrimonio_simples_settings';

const DEFAULT_SETTINGS: AppSettings = {
  itemsPerPage: 20,
  missingRule: 'zero',
  allowCreateNew: true,
  patrimonyFormat: 'PAT-{seq}',
};

async function canUseSecureStore() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

let memorySettings: AppSettings | null = null;

export async function loadSettings(): Promise<AppSettings> {
  if (await canUseSecureStore()) {
    const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as AppSettings) };
    }
  } else if (memorySettings) {
    return memorySettings;
  }

  return DEFAULT_SETTINGS;
}

export async function saveSettings(next: AppSettings) {
  const merged = { ...DEFAULT_SETTINGS, ...next };
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(merged));
  } else {
    memorySettings = merged;
  }
  return merged;
}

export function clearSettingsCache() {
  memorySettings = null;
}

export { DEFAULT_SETTINGS };

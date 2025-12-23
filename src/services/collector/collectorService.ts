import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { execute } from '@/db';
import {
  createBatch,
  getBatchItems,
  getOpenBatch,
  saveCachedAreas,
  updateBatchStatus,
} from '@/repositories/collectorRepository';

const KEY_COLLECTOR_ID = 'collector_id';
const KEY_COLLECTOR_NAME = 'collector_name';
const KEY_MASTER_BASE_URL = 'master_base_url';
const KEY_MASTER_PIN = 'master_pin';

export async function getCollectorId(): Promise<string> {
  let id = await SecureStore.getItemAsync(KEY_COLLECTOR_ID);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(KEY_COLLECTOR_ID, id);
  }
  return id;
}

export async function getCollectorName(): Promise<string | null> {
  return await SecureStore.getItemAsync(KEY_COLLECTOR_NAME);
}

export async function setCollectorName(name: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_COLLECTOR_NAME, name);
}

export async function getMasterBaseUrl(): Promise<string | null> {
  return await SecureStore.getItemAsync(KEY_MASTER_BASE_URL);
}

export async function setMasterBaseUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_MASTER_BASE_URL, url);
}

export async function getMasterPin(): Promise<string | null> {
  return await SecureStore.getItemAsync(KEY_MASTER_PIN);
}

export async function setMasterPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_MASTER_PIN, pin);
}

export async function logCollectorEvent(
  eventType: string,
  payload: object = {},
): Promise<void> {
  const collectorId = await getCollectorId();
  const eventId = Crypto.randomUUID();
  const createdAt = Date.now();
  const payloadStr = JSON.stringify(payload);

  await execute(
    `INSERT INTO collector_event_log (event_id, collector_id, event_type, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [eventId, collectorId, eventType, payloadStr, createdAt],
  );
}

export async function syncAreasFromMaster(): Promise<void> {
  const baseUrl = await getMasterBaseUrl();
  const pin = await getMasterPin();
  if (!baseUrl) throw new Error('Mestre não configurado');

  const headers: HeadersInit = {};
  if (pin) {
    headers['X-MobInv-PIN'] = pin;
  }

  const response = await fetch(`${baseUrl}/areas`, { headers });
  if (!response.ok) throw new Error('Falha ao baixar áreas');

  const areas = await response.json();
  await saveCachedAreas(areas);
  await logCollectorEvent('AREAS_SYNCED', { count: areas.length });
}

export async function ensureOpenBatch(): Promise<number> {
  const openBatch = await getOpenBatch();
  if (openBatch) return openBatch.id;

  const collectorId = await getCollectorId();
  const collectorName = (await getCollectorName()) || 'Unknown';
  const baseUrl = (await getMasterBaseUrl()) || '';

  const batchId = await createBatch(collectorId, collectorName, baseUrl);
  await logCollectorEvent('BATCH_STARTED', { batchId });
  return batchId;
}

export async function testMasterConnection(url: string, pin: string): Promise<boolean> {
  try {
    const headers: HeadersInit = {};
    if (pin) {
      headers['X-MobInv-PIN'] = pin;
    }
    const response = await fetch(`${url}/ping`, { headers });
    return response.ok;
  } catch (e) {
    return false;
  }
}

export async function sendBatchToMaster(batchId: number): Promise<void> {
  const batch = await getOpenBatch(); // Or get specific batch by ID if we had that function
  // For now assuming we are sending the open batch or the one passed.
  // Ideally we should fetch the batch by ID.

  // Let's assume the passed batchId is valid and we need to fetch items.
  const items = await getBatchItems(batchId);
  if (items.length === 0) {
    throw new Error('Lote vazio.');
  }

  const collectorId = await getCollectorId();
  const collectorName = (await getCollectorName()) || 'Unknown';
  const baseUrl = await getMasterBaseUrl();
  const pin = await getMasterPin();

  if (!baseUrl) throw new Error('Mestre não configurado');

  const payload = {
    collectorId,
    collectorName,
    startedAt: batch?.started_at || Date.now(), // Fallback if batch obj not fully loaded
    items: items.map((item) => ({
      tempId: item.temp_id,
      areaIdFromMaster: item.master_area_id,
      areaName: item.area_name,
      assetName: item.asset_name,
      patrimonyNumber: item.patrimony_number,
      description: item.description,
      quantity: item.quantity,
      unitValue: item.unit_value,
      createdAt: item.created_at,
    })),
  };

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (pin) {
      headers['X-MobInv-PIN'] = pin;
    }

    const response = await fetch(`${baseUrl}/sync/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    await updateBatchStatus(batchId, 'sent');
    await logCollectorEvent('BATCH_SENT', { batchId, remoteBatchId: data.batchId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    await updateBatchStatus(batchId, 'send_failed');
    await logCollectorEvent('BATCH_SEND_FAILED', { batchId, error: msg });
    throw error;
  }
}

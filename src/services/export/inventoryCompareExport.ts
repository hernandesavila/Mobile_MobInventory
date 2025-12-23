import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { listInventoryDiffs } from '@/services/inventory/inventoryCompareService';
import { Area, InventoryDiffStatus } from '@/types';

type ExportFilters = {
  inventoryId: number;
  onlyDivergent?: boolean;
  search?: string;
};

async function fetchAllDiffs(filters: ExportFilters) {
  const pageSize = 200;
  let page = 1;
  let all: Awaited<ReturnType<typeof listInventoryDiffs>>['items'] = [];
  let total = 0;
  let hasMore = true;

  while (hasMore) {
    const { items, total: t } = await listInventoryDiffs(filters.inventoryId, {
      onlyDivergent: filters.onlyDivergent,
      search: filters.search,
      page,
      pageSize,
    });
    all = [...all, ...items];
    total = t;
    if (all.length >= total || items.length === 0) {
      hasMore = false;
    } else {
      page += 1;
    }
  }

  return { items: all, total };
}

function statusLabel(status: InventoryDiffStatus) {
  switch (status) {
    case 'OK':
      return 'OK';
    case 'DIVERGENT':
      return 'Divergente';
    case 'MISSING':
      return 'Ausente';
    case 'NEW':
      return 'Novo';
    default:
      return status;
  }
}

function formatDate(timestamp?: number | null) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString();
}

export async function exportInventoryDiffToPDF(filters: ExportFilters, areas: Area[]) {
  const areaLookup: Record<number, string> = {};
  areas.forEach((area) => {
    areaLookup[area.id] = area.name;
  });

  const { items } = await fetchAllDiffs(filters);
  const filterSummary = [
    filters.onlyDivergent ? 'Somente divergentes' : null,
    filters.search ? `Busca: ${filters.search}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${item.assetNumber ?? '-'}</td>
          <td>${item.assetName}</td>
          <td>${item.areaId ? (areaLookup[item.areaId] ?? item.areaId) : '-'}</td>
          <td style="text-align:right;">${item.l0Quantity}</td>
          <td style="text-align:right;">${item.l1Quantity}</td>
          <td>${statusLabel(item.status)}</td>
        </tr>
      `,
    )
    .join('');

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 4px; }
          .meta { color: #555; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background: #f2f4f7; text-align: left; }
        </style>
      </head>
      <body>
        <h1>Comparativo Inventario</h1>
        <div class="meta">
          ${filterSummary || 'Sem filtros'}<br/>
          Gerado em: ${formatDate(Date.now())}
        </div>
        <table>
          <thead>
            <tr>
              <th>N§ Patrimonio</th>
              <th>Nome</th>
              <th>Area</th>
              <th>L0</th>
              <th>L1</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  const pdf = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(pdf.uri);
}

export async function exportInventoryDiffToXLSX(filters: ExportFilters, areas: Area[]) {
  const areaLookup: Record<number, string> = {};
  areas.forEach((area) => {
    areaLookup[area.id] = area.name;
  });

  const { items } = await fetchAllDiffs(filters);
  const data = items.map((item) => ({
    Numero: item.assetNumber ?? '-',
    Nome: item.assetName,
    Area: item.areaId ? (areaLookup[item.areaId] ?? item.areaId) : '-',
    L0: item.l0Quantity,
    L1: item.l1Quantity,
    Status: statusLabel(item.status),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Comparativo');

  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const filePath = `${FileSystem.cacheDirectory}inventario-comparativo.xlsx`;
  await FileSystem.writeAsStringAsync(filePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(filePath);
}

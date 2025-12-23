import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { listInventoryDiffs } from '@/services/inventory/inventoryCompareService';
import { Area } from '@/types';

type ExportFilters = {
  inventoryId: number;
};

function formatDate(timestamp?: number | null) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString();
}

async function fetchFinals(filters: ExportFilters) {
  const { items } = await listInventoryDiffs(filters.inventoryId, {
    onlyDivergent: false,
    search: '',
    page: 1,
    pageSize: 500,
  });
  return items;
}

export async function exportInventoryAdjustmentPDF(
  filters: ExportFilters,
  areas: Area[],
) {
  const areaLookup: Record<number, string> = {};
  areas.forEach((a) => {
    areaLookup[a.id] = a.name;
  });
  const items = await fetchFinals(filters);
  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${item.assetNumber ?? '-'}</td>
          <td>${item.assetName}</td>
          <td>${item.areaId ? (areaLookup[item.areaId] ?? item.areaId) : '-'}</td>
          <td>${item.l0Quantity}</td>
          <td>${item.l1Quantity}</td>
          <td>${item.l2Quantity ?? 0}</td>
          <td>${item.finalQuantity ?? item.l1Quantity ?? item.l0Quantity}</td>
          <td>${item.resolutionChoice ?? '-'}</td>
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
        <h1>Relatorio final de ajuste</h1>
        <div class="meta">Gerado em: ${formatDate(Date.now())}</div>
        <table>
          <thead>
            <tr>
              <th>N§ Patrimonio</th>
              <th>Nome</th>
              <th>Area</th>
              <th>L0</th>
              <th>L1</th>
              <th>L2</th>
              <th>Final</th>
              <th>Decisao</th>
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

export async function exportInventoryAdjustmentXLSX(
  filters: ExportFilters,
  areas: Area[],
) {
  const areaLookup: Record<number, string> = {};
  areas.forEach((a) => {
    areaLookup[a.id] = a.name;
  });
  const items = await fetchFinals(filters);
  const data = items.map((item) => ({
    Numero: item.assetNumber ?? '-',
    Nome: item.assetName,
    Area: item.areaId ? (areaLookup[item.areaId] ?? item.areaId) : '-',
    L0: item.l0Quantity,
    L1: item.l1Quantity,
    L2: item.l2Quantity ?? 0,
    Final: item.finalQuantity ?? item.l1Quantity ?? item.l0Quantity,
    Decisao: item.resolutionChoice ?? '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ajuste');

  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const filePath = `${FileSystem.cacheDirectory}inventario-ajuste.xlsx`;
  await FileSystem.writeAsStringAsync(filePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(filePath);
}

import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { listAssetsPaginated, AssetFilters } from '@/repositories/assetRepository';
import { AssetItem, Area } from '@/types';

type ExportFilters = Omit<AssetFilters, 'page' | 'pageSize'>;

async function fetchAllAssets(filters: ExportFilters) {
  const pageSize = 200;
  let page = 1;
  let all: AssetItem[] = [];
  let total = 0;
  let hasMore = true;

  while (hasMore) {
    const { items, total: pageTotal } = await listAssetsPaginated({
      ...filters,
      page,
      pageSize,
    });

    all = [...all, ...items];
    total = pageTotal;

    if (all.length >= total || items.length === 0) {
      hasMore = false;
    } else {
      page += 1;
    }
  }

  return { assets: all, total };
}

function formatDate(timestamp?: number) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function currency(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export async function exportAssetsToPDF(filters: ExportFilters, areas: Area[]) {
  const areaLookup: Record<number, string> = {};
  areas.forEach((area) => {
    areaLookup[area.id] = area.name;
  });

  const { assets } = await fetchAllAssets(filters);
  const totalItems = assets.length;
  const totalValor = assets.reduce(
    (acc, item) => acc + (item.unitValue ?? 0) * (item.quantity ?? 0),
    0,
  );

  const filterSummary = [
    filters.areaId ? `Area: ${areaLookup[filters.areaId] ?? filters.areaId}` : null,
    filters.searchName ? `Nome: ${filters.searchName}` : null,
    filters.searchNumber ? `Numero: ${filters.searchNumber}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const rows = assets
    .map(
      (item) => `
        <tr>
          <td>${areaLookup[item.areaId] ?? item.areaId}</td>
          <td>${item.name}</td>
          <td>${item.assetNumber}</td>
          <td>${item.description ?? ''}</td>
          <td style="text-align:right;">${item.quantity}</td>
          <td style="text-align:right;">${currency(item.unitValue)}</td>
          <td style="text-align:right;">${currency((item.unitValue ?? 0) * item.quantity)}</td>
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
          tfoot td { font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>Relatorio de Patrimonios</h1>
        <div class="meta">
          ${filterSummary || 'Sem filtros aplicados'}<br/>
          Gerado em: ${formatDate(Date.now())}
        </div>
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Nome</th>
              <th>Nº Patrimonio</th>
              <th>Descricao</th>
              <th>Qtd</th>
              <th>Valor Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="4">Totais</td>
              <td style="text-align:right;">${totalItems}</td>
              <td></td>
              <td style="text-align:right;">${currency(totalValor)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;

  const pdf = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(pdf.uri);
}

export async function exportAssetsToXLSX(filters: ExportFilters, areas: Area[]) {
  const areaLookup: Record<number, string> = {};
  areas.forEach((area) => {
    areaLookup[area.id] = area.name;
  });

  const { assets } = await fetchAllAssets(filters);

  const data = assets.map((item) => ({
    Area: areaLookup[item.areaId] ?? item.areaId,
    Nome: item.name,
    'Nº Patrimonio': item.assetNumber,
    Descricao: item.description ?? '',
    Quantidade: item.quantity,
    'Valor Unitario': item.unitValue ?? 0,
    Total: (item.unitValue ?? 0) * item.quantity,
    Cadastro: formatDate(item.createdAt),
    Alteracao: formatDate(item.updatedAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Patrimonios');

  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const filePath = `${FileSystem.cacheDirectory}patrimonios.xlsx`;
  await FileSystem.writeAsStringAsync(filePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(filePath);
}

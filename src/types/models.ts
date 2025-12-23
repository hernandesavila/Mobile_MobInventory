export type User = {
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

export type Area = {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: number;
};

export type AssetItem = {
  id: number;
  assetNumber: string;
  name: string;
  description?: string | null;
  quantity: number;
  unitValue?: number | null;
  areaId: number;
  createdAt: number;
  updatedAt: number;
};

export type InventoryScope = 'ALL' | 'AREA';
export type InventoryStatus = 'open' | 'finished';

export type Inventory = {
  id: number;
  name: string;
  scopeType: InventoryScope;
  areaId?: number | null;
  status: InventoryStatus;
  createdAt: number;
  finishedAt?: number | null;
};

export type InventorySnapshotItem = {
  id: number;
  inventoryId: number;
  assetId: number;
  assetNumber: string;
  assetName: string;
  areaId: number;
  quantity: number;
  createdAt: number;
};

export type InventoryReadItem = {
  id: number;
  inventoryId: number;
  assetId?: number | null;
  assetNumber?: string | null;
  assetName: string;
  areaId?: number | null;
  isNewItem: boolean;
  quantity: number;
  createdAt: number;
};

export type InventoryDiffStatus = 'OK' | 'DIVERGENT' | 'MISSING' | 'NEW';

export type InventoryDiff = {
  id: number;
  inventoryId: number;
  assetId?: number | null;
  assetNumber?: string | null;
  assetName: string;
  areaId?: number | null;
  l0Quantity: number;
  l1Quantity: number;
  l2Quantity?: number;
  finalQuantity?: number | null;
  resolutionChoice?: 'L1' | 'L2' | 'IGNORE' | null;
  resolutionNote?: string | null;
  status: InventoryDiffStatus;
  createdAt: number;
};

export type InventoryAdjustmentLog = {
  id: number;
  inventoryId: number;
  assetId?: number | null;
  assetNumber?: string | null;
  beforeQty?: number | null;
  afterQty?: number | null;
  decision: string;
  note?: string | null;
  userId?: number | null;
  createdAt: number;
};

export type MissingRule = 'zero' | 'keep';

export type AppSettings = {
  itemsPerPage: number;
  missingRule: MissingRule;
  allowCreateNew: boolean;
  patrimonyFormat: string;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  CollectorConfig: undefined;
  CollectorConnect: undefined;
  CollectorAction: undefined;
  CollectorScan: undefined;
};

export type AppTabsParamList = {
  Dashboard: undefined;
  Areas: undefined;
  Patrimonio: undefined;
  Inventario: undefined;
  BackupRestore: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  MasterReceive: undefined;
  MasterBatchList: undefined;
  MasterBatchDetail: { batchId: string };
};

export type AreasStackParamList = {
  AreaList: undefined;
  AreaForm: { areaId?: number };
};

export type AssetsStackParamList = {
  AssetList: undefined;
  AssetDetail: { assetId: number };
  AssetForm: { assetId?: number };
};

export type InventoriesStackParamList = {
  InventoryList: undefined;
  InventoryForm: undefined;
  InventoryRead: { inventoryId: number };
  InventoryCompare: { inventoryId: number };
  InventorySecondRead: { inventoryId: number };
  InventoryResolution: { inventoryId: number };
};

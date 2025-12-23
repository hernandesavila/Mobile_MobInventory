/* eslint-disable @typescript-eslint/no-var-requires */
const Module = require('module');

const originalRequire = Module.prototype.require;

Module.prototype.require = function patchedRequire(moduleName, ...rest) {
  if (moduleName === 'react-native') {
    return {
      Platform: { OS: 'node' },
      NativeModules: {},
      StyleSheet: { create: (styles) => styles },
    };
  }

  if (moduleName === 'expo-sqlite') {
    const mockTx = {
      executeSql: (_sql, _params, success) => {
        if (success) {
          success(mockTx, { rows: { length: 0, item: () => ({}) }, insertId: 1 });
        }
      },
    };
    const db = {
      transaction: (cb, _err, success) => {
        cb(mockTx);
        if (success) success();
      },
      readTransaction: (cb) => cb(mockTx),
    };
    return {
      openDatabase: () => db,
    };
  }

  if (moduleName === 'expo-secure-store') {
    return {
      isAvailableAsync: async () => false,
      getItemAsync: async () => null,
      setItemAsync: async () => {},
      deleteItemAsync: async () => {},
    };
  }

  if (moduleName === 'expo-modules-core') {
    return {
      requireNativeModule: () => ({}),
    };
  }

  if (moduleName === 'expo-file-system') {
    return {
      writeAsStringAsync: async () => {},
      readAsStringAsync: async () => '{}',
      cacheDirectory: '/tmp',
      documentDirectory: '/tmp',
      StorageAccessFramework: {
        createFileAsync: async () => '/tmp/file',
        writeAsStringAsync: async () => {},
      },
    };
  }

  if (moduleName === 'expo-sharing') {
    return {
      isAvailableAsync: async () => false,
      shareAsync: async () => {},
    };
  }

  if (moduleName === 'expo-document-picker') {
    return {
      getDocumentAsync: async () => ({ canceled: true }),
    };
  }

  if (moduleName === 'expo-print') {
    return {
      printToFileAsync: async () => ({ uri: '/tmp/file.pdf' }),
    };
  }

  if (moduleName === 'expo-crypto') {
    return {
      digestStringAsync: async (_algo, value) => value,
    };
  }

  return originalRequire.call(this, moduleName, ...rest);
};

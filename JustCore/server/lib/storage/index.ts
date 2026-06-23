import { LocalDiskStorage } from "./local.ts";
import { SharePointStorage } from "./sharepoint.ts";
import type { StorageService, StorageDriver } from "./types.ts";

// Instâncias preguiçosas: o SharePoint só é instanciado quando usado (não exige env em dev).
const local = new LocalDiskStorage();
let sharepoint: SharePointStorage | null = null;

// Storage por driver específico — usado no DOWNLOAD: um arquivo subido como `local`
// continua sendo lido do disco mesmo que o app hoje esteja em modo `sharepoint`.
export function storageByDriver(driver: string): StorageService {
  if (driver === "sharepoint") return (sharepoint ??= new SharePointStorage());
  return local;
}

// Storage padrão (para UPLOAD), definido por STORAGE_DRIVER (default `local`).
export function getStorage(): StorageService {
  return storageByDriver((process.env.STORAGE_DRIVER as StorageDriver) ?? "local");
}

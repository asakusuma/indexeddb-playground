import {
  guardPromise
} from './utils';

const DB_TIMEOUT = 1000;

// IndexDB Constants
const DB_NAME = 'test-store';
const OBJECT_STORE_NAME = 'state';

// Store key constants
const LAST_UPDATE = 'last-update';

function exec(req: IDBRequest, transaction: IDBTransaction, label: string) {
  const result = new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve(req.result);
    };
    transaction.onerror = () => {
      reject(new Error(`IndexedDB transaction error: ${transaction.error.message}`));
    };
  });

  return guardPromise(result, `IndexedDB Timeout: ${label}`, DB_TIMEOUT);
}

export function purge() {
  return getStore(openDB(), 'readwrite', ({ transaction, store}) => {
    return exec(store.clear(), transaction, 'Purging data');
  });
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const dbReq = indexedDB.open(DB_NAME);

    dbReq.onblocked = () => {
      reject(new Error('IndexedDB blocked'));
    };

    dbReq.onerror = () => {
      reject(new Error(`IndexedDB error: ${dbReq.error.message}`));
    };

    dbReq.onupgradeneeded = () => {
      dbReq.result.createObjectStore(OBJECT_STORE_NAME);
    };

    dbReq.onsuccess = function() {
      resolve(dbReq.result as IDBDatabase);
    };

    setTimeout(() => {
      reject(new Error('Timeout opening IndexedDB'));
    }, DB_TIMEOUT);
  });
}

interface StoreReference {
  transaction: IDBTransaction;
  store: IDBObjectStore;
}

type StoreReferenceCallback<T> = (storeReference: StoreReference) => T | Promise<T>;

function getStore<T>(getDb: Promise<IDBDatabase>, mode: IDBTransactionMode, cb: StoreReferenceCallback<T>) {
  const req = getDb.then((db) => {
    const transaction = db.transaction(OBJECT_STORE_NAME, mode);
    // We can't return/resolve a promise with the transaction because the transaction
    // must be used synchronously. Otherwise the browser can close the transaction
    return cb({
      transaction,
      store: transaction.objectStore(OBJECT_STORE_NAME)
    });
  });

  return guardPromise(req, 'Timeout getting object store', DB_TIMEOUT);
}

export default class Store {
  private db: Promise<IDBDatabase>;
  private getDB() {
    if (!this.db) {
      this.db = openDB();
    }
    return this.db;
  }
  private getStore<T>(mode: IDBTransactionMode, cb: StoreReferenceCallback<T>) {
    return getStore(this.getDB(), mode, cb);
  }
  private set(key: string, value: string) {
    return this.getStore('readwrite', ({ store, transaction}) => {
      return exec(store.put(value, key), transaction, `Setting key [${key}]`);
    });
  }
  private get(key: string): Promise<string> {
    return this.getStore<string>('readonly', ({ store, transaction}) => {
      return exec(store.get(key), transaction, `Getting key [${key}]`) as Promise<string>;
    });
  }
  public clear() {
    return this.getStore('readwrite', ({ store, transaction}) => {
      return exec(store.clear(), transaction, `Clearing store`);
    });
  }
  public getLastVitalsUpdate() {
    return this.get(LAST_UPDATE);
  }
  public markVitalsUpdate() {
    return this.set(LAST_UPDATE, Date.now().toString());
  }
}
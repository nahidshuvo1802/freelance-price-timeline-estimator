
import { ProjectExample, EstimationHistory } from "../types";

const DB_NAME = "FreelanceSalesBotDB";
const DB_VERSION = 1;
const STORE_EXAMPLES = "knowledge_base";
const STORE_HISTORY = "estimation_history";

class DatabaseService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject("Failed to open database");
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_EXAMPLES)) {
          db.createObjectStore(STORE_EXAMPLES, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          db.createObjectStore(STORE_HISTORY, { keyPath: "id" });
        }
      };
    });
  }

  async getAllExamples(): Promise<ProjectExample[]> {
    return this.getAll<ProjectExample>(STORE_EXAMPLES);
  }

  async saveExample(example: ProjectExample): Promise<void> {
    return this.put(STORE_EXAMPLES, example);
  }

  async deleteExample(id: string): Promise<void> {
    return this.delete(STORE_EXAMPLES, id);
  }

  async getAllHistory(): Promise<EstimationHistory[]> {
    return this.getAll<EstimationHistory>(STORE_HISTORY);
  }

  async saveHistory(history: EstimationHistory): Promise<void> {
    return this.put(STORE_HISTORY, history);
  }

  async clearAll(): Promise<void> {
    await this.clearStore(STORE_EXAMPLES);
    await this.clearStore(STORE_HISTORY);
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(`Error fetching from ${storeName}`);
    });
  }

  private async put(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(`Error saving to ${storeName}`);
    });
  }

  private async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(`Error deleting from ${storeName}`);
    });
  }

  private async clearStore(storeName: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(`Error clearing ${storeName}`);
    });
  }
}

export const dbService = new DatabaseService();

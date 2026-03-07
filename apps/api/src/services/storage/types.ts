export interface StorageAdapter {
  /** Write data to storage at the given key. */
  put(key: string, data: Buffer, contentType: string): Promise<void>;

  /** Read data from storage. Returns null if not found. */
  get(key: string): Promise<Buffer | null>;

  /** Delete data from storage. No-op if key does not exist. */
  delete(key: string): Promise<void>;

  /** Check if a key exists in storage. */
  exists(key: string): Promise<boolean>;
}

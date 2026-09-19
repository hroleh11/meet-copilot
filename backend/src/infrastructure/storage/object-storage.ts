export interface StoredObject {
  key: string;
  mimeType: string;
  bytes: Buffer;
}

export abstract class ObjectStorage {
  abstract put(object: StoredObject): Promise<void>;

  abstract delete(key: string): Promise<void>;
}

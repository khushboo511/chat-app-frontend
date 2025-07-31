import { openDB, IDBPDatabase } from "idb";
import {
  KeyHelper,
  SessionCipher,
  SessionBuilder,
  SignalProtocolAddress,
  encrypt,
  decrypt,
  getRandomBytes,
} from "@privacyresearch/libsignal-protocol-typescript";
import {
  crypto,
} from "@privacyresearch/libsignal-protocol-typescript/lib/internal";
import { Buffer } from "buffer";
import { isBase64 } from "validator";

(window as any).Buffer = Buffer;

class SignalProtocolStore {
  private db: IDBPDatabase;

  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  static async initialize(userId: string): Promise<SignalProtocolStore> {
    const db = await openDB(`chatKeys-${userId}`, 1, {
      upgrade(db) {
        db.createObjectStore("keys");
      },
    });
    return new SignalProtocolStore(db);
  }

  async get(key: string, defaultValue?: any): Promise<any> {
    return (await this.db.get("keys", key)) || defaultValue;
  }

  async put(key: string, value: any): Promise<void> {
    await this.db.put("keys", value, key);
  }

  async getIdentityKeyPair(): Promise<any> {
    return this.get("identityKeyPair");
  }

  async getLocalRegistrationId(): Promise<number> {
    return this.get("registrationId");
  }

  async storePreKey(keyId: number, preKey: any): Promise<void> {
    await this.put(`preKey.${keyId}`, preKey);
  }

  async storeSignedPreKey(keyId: number, signedPreKey: any): Promise<void> {
    await this.put(`signedPreKey.${keyId}`, signedPreKey);
  }

  async getPreKey(keyId: number): Promise<any> {
    return this.get(`preKey.${keyId}`);
  }

  async getSignedPreKey(keyId: number): Promise<any> {
    return this.get(`signedPreKey.${keyId}`);
  }

  async isTrustedIdentity(
    identifier: string,
    identityKey: ArrayBuffer,
    direction: any
  ): Promise<boolean> {
    // For simplicity, assuming all identity keys are trusted for now
    // In production, implement logic to verify the identity key
    return true;
  }

  async saveIdentity(
    identifier: string,
    identityKey: ArrayBuffer
  ): Promise<boolean> {
    await this.put(`identity.${identifier}`, identityKey);
    return true;
  }

  async loadSession(identifier: string): Promise<ArrayBuffer | undefined> {
    return this.get(`session.${identifier}`);
  }

  async storeSession(identifier: string, record: ArrayBuffer): Promise<void> {
    await this.put(`session.${identifier}`, record);
  }

  async removePreKey(keyId: number): Promise<void> {
    await this.db.delete("keys", `preKey.${keyId}`);
  }

  async storeRoomSharedKey(roomId: string, key: Buffer): Promise<void> {
    await this.put(`roomKey.${roomId}`, key);
  }

  async getRoomSharedKey(roomId: string): Promise<Buffer | undefined> {
    return this.get(`roomKey.${roomId}`);
  }
}

function generateRegistrationId(): number {
  return KeyHelper.generateRegistrationId();
}

export async function generateUserKeys(
  userId: string,
  deviceId: string,
  deviceName: string
): Promise<SignalProtocolStore> {
  const store = await SignalProtocolStore.initialize(userId);
  const existingIdentityKey = await store.getIdentityKeyPair();
  if (existingIdentityKey) {
    return store;
  }

  const registrationId = generateRegistrationId();
  await store.put("registrationId", registrationId);

  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  await store.put("identityKeyPair", identityKeyPair);

  const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);
  await store.storeSignedPreKey(signedPreKey.keyId, signedPreKey);

  const oneTimePreKeys = await Promise.all(
    Array.from({ length: 10 }, (_, i) => KeyHelper.generatePreKey(i))
  );
  for (const key of oneTimePreKeys) {
    await store.storePreKey(key.keyId, key);
  }

  await fetch("http://localhost:3000/user/api/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      userId,
      deviceId,
      deviceName,
      identityPublicKey: Buffer.from(identityKeyPair.pubKey).toString("base64"),
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: Buffer.from(signedPreKey.keyPair.pubKey).toString("base64"),
        signature: Buffer.from(signedPreKey.signature).toString("base64"),
      },
      oneTimePreKeys: oneTimePreKeys.map((key) => ({
        keyId: key.keyId,
        publicKey: Buffer.from(key.keyPair.pubKey).toString("base64"),
      })),
      registrationId,
    }),
  });

  return store;
}

export async function generateRoomSharedKey(
  roomId: string,
  room: any,
  store: SignalProtocolStore
): Promise<void> {
  // Generate a random 256-bit shared key using Signal Protocol's Crypto
  const sharedKeyArrayBuffer = await getRandomBytes(32);
  const sharedKey = Buffer.from(sharedKeyArrayBuffer);
  console.log(
    `Generated shared key for room ${roomId}:`,
    sharedKey.toString("hex")
  );

  const encryptedKeys: {
    userId: string;
    encryptedSecretKeys: { deviceId: string; key: string }[];
  }[] = [];
  for (const member of room.members) {
    const recipientId = member.userId.toString();
    const memberKeys: { deviceId: string; key: string }[] = [];
    const res = await fetch(
      `http://localhost:3000/user/api/keys/${recipientId}`,
      { credentials: "include" }
    );
    const keyBundle = await res.json();
    if (!keyBundle?.devices || keyBundle.devices.length === 0) {
      console.warn(`No devices found for ${recipientId}`);
      continue;
    }

    for (const device of keyBundle.devices) {
      const address = new SignalProtocolAddress(
        `${recipientId}-${device.deviceId}`,
        1
      );
      const sessionExists = await store.loadSession(address.toString());
      if (!sessionExists) {
        const builder = new SessionBuilder(store as any, address);
        await builder.processPreKey({
          registrationId: device.registrationId,
          identityKey: Buffer.from(device.identityPublicKey, "base64").buffer,
          signedPreKey: {
            keyId: device.signedPreKey.keyId,
            publicKey: Buffer.from(device.signedPreKey.publicKey, "base64")
              .buffer,
            signature: Buffer.from(device.signedPreKey.signature, "base64")
              .buffer,
          },
          preKey: device.oneTimePreKeys?.[0] && {
            keyId: device.oneTimePreKeys[0].keyId,
            publicKey: Buffer.from(device.oneTimePreKeys[0].publicKey, "base64")
              .buffer,
          },
        });
      }
      const sessionCipher = new SessionCipher(store as any, address);
      const { body } = await sessionCipher.encrypt(sharedKeyArrayBuffer);
      memberKeys.push({
        deviceId: device.deviceId,
        key: Buffer.from(body).toString("base64"),
      });
    }
    encryptedKeys.push({
      userId: recipientId,
      encryptedSecretKeys: memberKeys,
    });
  }

  await store.storeRoomSharedKey(roomId, sharedKey);

  await fetch(`http://localhost:3000/room/api/${roomId}/shared-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ encryptedKeys }),
  });
}

export async function getRoomSharedKey(
  userId: string,
  deviceId: string,
  roomId: string,
  store: SignalProtocolStore
): Promise<Buffer> {
  let sharedKey = await store.getRoomSharedKey(roomId);
  if (sharedKey) {
    console.log(`Retrieved cached shared key for room ${roomId}`);
    return sharedKey;
  }

  const res = await fetch(
    `http://localhost:3000/room/api/${roomId}/shared-key`,
    {
      credentials: "include",
    }
  );
  const { members } = await res.json();
  const member = members.find((m: any) => m.userId === userId);
  if (!member) {
    throw new Error(`No member found for ${userId} in room ${roomId}`);
  }
  const encryptedKeyEntry = member.encryptedSecretKeys.find(
    (entry: any) => entry.deviceId === deviceId
  );

  if (!encryptedKeyEntry) {
    throw new Error(
      `No encrypted shared key found for ${userId}-${deviceId} in room ${roomId}`
    );
  }

  const address = new SignalProtocolAddress(`${userId}-${deviceId}`, 1);
  const sessionCipher = new SessionCipher(store as any, address);
  const plaintext = await sessionCipher.decryptPreKeyWhisperMessage(
    Buffer.from(encryptedKeyEntry.key, "base64").buffer,
    "binary"
  );
  sharedKey = Buffer.from(plaintext);
  await store.storeRoomSharedKey(roomId, sharedKey);
  console.log(`Decrypted and stored shared key for room ${roomId}`);
  return sharedKey;
}

export async function encryptMessage(
  userId: string,
  room: any,
  message: string,
  store: SignalProtocolStore
): Promise<{ roomId: string; ciphertext: string }> {
  const roomId = room._id.toString();
  const sharedKey = await getRoomSharedKey(
    userId,
    room.deviceId,
    roomId,
    store
  );

  // Use Signal Protocol's Crypto for AES-GCM encryption
  const iv = crypto.getRandomBytes(12);
  const encodedMessage = new TextEncoder().encode(message);
  const ciphertextWithTag = await encrypt(
    sharedKey,
    encodedMessage,
    Buffer.from(iv)
  );

  // Signal Protocol's Crypto.encrypt returns ciphertext + auth tag
  const ciphertext = Buffer.from(ciphertextWithTag).toString("base64");

  console.log(`Encrypted message for room ${roomId}:`, ciphertext);
  return { roomId, ciphertext };
}

export async function decryptMessage(
  userId: string,
  deviceId: string,
  roomId: string,
  ciphertext: string,
  store: SignalProtocolStore
): Promise<string> {
  console.log("decryptMessage called with:", {
    userId,
    deviceId,
    roomId,
    ciphertext,
  });
  if (!ciphertext || typeof ciphertext === "undefined" || ciphertext === "") {
    console.error(`Skipping decryption: Invalid ciphertext for room ${roomId}`);
    return "";
  }
  if (!isBase64(ciphertext)) {
    console.error(`Invalid base64 ciphertext for room ${roomId}:`, ciphertext);
    return "";
  }

  try {
    const sharedKey = await getRoomSharedKey(userId, deviceId, roomId, store);
    const buffer = Buffer.from(ciphertext, "base64");
    if (buffer.length < 28) {
      console.error(
        `Ciphertext too short for room ${roomId}: ${buffer.length} bytes`
      );
      return "";
    }

    const iv = buffer.slice(0, 12);
    const ciphertextWithTag = buffer.slice(12);
    const decrypted = await decrypt(sharedKey, ciphertextWithTag, iv);
    const plaintext = new TextDecoder().decode(Buffer.from(decrypted));

    console.log(`Decrypted text for room ${roomId}:`, plaintext);
    return plaintext;
  } catch (error) {
    console.error(`Decryption failed for room ${roomId}: ${error.message}`);
    return "";
  }
}

export async function getIdentityFingerprint(
  store: SignalProtocolStore
): Promise<string> {
  const identityKeyPair = await store.getIdentityKeyPair();
  return Buffer.from(identityKeyPair.pubKey).toString("hex");
}

export { SignalProtocolStore };

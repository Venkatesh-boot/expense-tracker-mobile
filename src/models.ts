import * as Crypto from 'expo-crypto';

export * from './domain';

export function createId(): string {
  return Crypto.randomUUID();
}

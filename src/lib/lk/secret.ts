// Portal passwords are the student's credentials for a third-party site, so
// they are encrypted at rest (AES-256-GCM) with LK_SECRET_KEY and only
// decrypted for the reveal action. Server-only.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export class MissingSecretKeyError extends Error {
  constructor() {
    super('LK_SECRET_KEY не задан: пароли порталов нельзя сохранить')
  }
}

function key(): Buffer {
  const raw = process.env.LK_SECRET_KEY
  if (!raw) throw new MissingSecretKeyError()
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) throw new Error('LK_SECRET_KEY must be 32 bytes, base64-encoded')
  return buf
}

/** Returns `v1.<iv>.<tag>.<ciphertext>`, all base64. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.')
}

export function decryptSecret(blob: string): string {
  const [v, iv, tag, data] = blob.split('.')
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Unknown secret format')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
}

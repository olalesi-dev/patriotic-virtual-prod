import {
  createLocalEnvelopeKeyProviderFromBase64,
  type EnvelopeKeyProvider,
} from '@workspace/crypto/field-encryption';

export interface PhiEncryptionEnv {
  NODE_ENV?: string;
  PHI_ENCRYPTION_KEY_PROVIDER?: string;
  PHI_ENCRYPTION_KMS_KEY_ID?: string;
  PHI_ENCRYPTION_LOCAL_KEY_ID?: string;
  PHI_ENCRYPTION_LOCAL_MASTER_KEY_B64?: string;
  PHI_ENCRYPTION_REQUIRE_MANAGED_KEY_IN_PRODUCTION?: string;
}

export type PhiEncryptionProviderKind = 'kms' | 'local';

export interface PhiEncryptionProviderConfig {
  provider: PhiEncryptionProviderKind;
  keyId: string;
  requireManagedKeyInProduction: boolean;
}

const truthyValues = new Set(['1', 'true', 'yes', 'on']);

export const parsePhiEncryptionBoolean = (
  value: string | undefined,
  defaultValue: boolean,
) => {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  return truthyValues.has(value.trim().toLowerCase());
};

export const resolvePhiEncryptionProviderConfig = (
  env: PhiEncryptionEnv,
): PhiEncryptionProviderConfig => {
  const provider = normalizeProvider(env.PHI_ENCRYPTION_KEY_PROVIDER);
  const requireManagedKeyInProduction = parsePhiEncryptionBoolean(
    env.PHI_ENCRYPTION_REQUIRE_MANAGED_KEY_IN_PRODUCTION,
    true,
  );

  if (
    env.NODE_ENV === 'production' &&
    requireManagedKeyInProduction &&
    provider === 'local'
  ) {
    throw new Error(
      'Production PHI encryption requires a managed KMS/Vault provider.',
    );
  }

  const keyId =
    provider === 'kms'
      ? env.PHI_ENCRYPTION_KMS_KEY_ID?.trim()
      : env.PHI_ENCRYPTION_LOCAL_KEY_ID?.trim();
  if (!keyId) {
    throw new Error(`PHI encryption ${provider} key id is required.`);
  }

  return {
    provider,
    keyId,
    requireManagedKeyInProduction,
  };
};

export const createPhiEnvelopeKeyProvider = (
  env: PhiEncryptionEnv,
): EnvelopeKeyProvider => {
  const config = resolvePhiEncryptionProviderConfig(env);

  if (config.provider === 'kms') {
    throw new Error(
      'Managed KMS/Vault envelope provider is not configured in this runtime yet.',
    );
  }

  const localMasterKey = env.PHI_ENCRYPTION_LOCAL_MASTER_KEY_B64?.trim();
  if (!localMasterKey) {
    throw new Error('PHI_ENCRYPTION_LOCAL_MASTER_KEY_B64 is required.');
  }

  return createLocalEnvelopeKeyProviderFromBase64(config.keyId, localMasterKey);
};

const normalizeProvider = (
  provider: string | undefined,
): PhiEncryptionProviderKind => {
  const normalized = provider?.trim().toLowerCase() || 'local';
  if (normalized === 'kms' || normalized === 'local') {
    return normalized;
  }

  throw new Error('PHI_ENCRYPTION_KEY_PROVIDER must be "kms" or "local".');
};

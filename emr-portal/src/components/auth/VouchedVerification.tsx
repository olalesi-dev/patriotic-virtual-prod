"use client";

import * as React from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { apiFetchJson } from '@/lib/api-client';
import { buildVouchedWebhookUrl, type VouchedCompletionResponse } from '@/lib/identity-verification';

declare global {
    interface Window {
        Vouched?: (options: Record<string, unknown>) => {
            mount: (selector: string) => Promise<void> | void;
            unmount?: (selector: string) => Promise<void> | void;
        };
    }
}

interface VouchedVerificationProps {
    user: FirebaseUser;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthDate?: string;
    onCompleted: (result: VouchedCompletionResponse) => void;
    onError: (message: string) => void;
}

let vouchedScriptPromise: Promise<void> | null = null;

function loadVouchedScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Vouched can only load in the browser.'));
    }

    if (typeof window.Vouched === 'function') {
        return Promise.resolve();
    }

    if (vouchedScriptPromise) {
        return vouchedScriptPromise;
    }

    vouchedScriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-vouched-sdk="true"]') as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load the Vouched SDK.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://static.vouched.id/plugin/releases/latest/index.js';
        script.async = true;
        script.dataset.vouchedSdk = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load the Vouched SDK.'));
        document.head.appendChild(script);
    });

    return vouchedScriptPromise;
}

function formatBirthDate(value?: string): string | undefined {
    if (!value) return undefined;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value;
    return `${match[2]}/${match[3]}/${match[1]}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

export function VouchedVerification({
    user,
    firstName,
    lastName,
    email,
    phone,
    birthDate,
    onCompleted,
    onError,
}: VouchedVerificationProps) {
    const containerId = React.useId().replace(/:/g, '-');
    const [isLoading, setIsLoading] = React.useState(true);
    const publicKey = process.env.NEXT_PUBLIC_VOUCHED_PUBLIC_KEY?.trim() ?? '';

    React.useEffect(() => {
        if (!publicKey) {
            onError('Vouched is not configured because NEXT_PUBLIC_VOUCHED_PUBLIC_KEY is missing.');
            setIsLoading(false);
            return;
        }

        let isActive = true;
        let instance: ReturnType<NonNullable<typeof window.Vouched>> | null = null;
        let initTimeout: number | null = null;
        const internalId = `patient:${user.uid}:${Date.now()}`;

        const mount = async () => {
            try {
                await loadVouchedScript();
                if (!isActive) return;
                if (typeof window.Vouched !== 'function') {
                    throw new Error('Vouched did not initialize correctly.');
                }

                instance = window.Vouched({
                    appId: publicKey,
                    callbackURL: buildVouchedWebhookUrl(),
                    verification: {
                        firstName,
                        lastName,
                        email,
                        phone,
                        birthDate: formatBirthDate(birthDate),
                        internalId,
                    },
                    properties: [
                        { name: 'firebaseUid', value: user.uid },
                        { name: 'internalId', value: internalId },
                        { name: 'role', value: 'patient' },
                    ],
                    liveness: 'enhanced',
                    id: 'camera',
                    idLiveness: 'distance',
                    includeBarcode: true,
                    manualCaptureTimeout: 20000,
                    maxRetriesBeforeNext: 3,
                    numForceRetries: 3,
                    showTermsAndPrivacy: true,
                    crossDevice: true,
                    crossDeviceQRCode: true,
                    crossDeviceSMS: true,
                    theme: {
                        name: 'avant',
                    },
                    onInit: () => {
                        if (!isActive) {
                            return;
                        }

                        if (initTimeout) {
                            window.clearTimeout(initTimeout);
                            initTimeout = null;
                        }

                        setIsLoading(false);
                    },
                    onCamera: (cameraState: { hasCamera?: boolean; hasPermission?: boolean }) => {
                        if (cameraState.hasCamera === false || cameraState.hasPermission === false) {
                            onError('Camera access is required to complete identity verification.');
                        }
                    },
                    onDone: async (job: { id?: string }) => {
                        if (!isActive) return;

                        const jobId = typeof job?.id === 'string' ? job.id.trim() : '';
                        if (!jobId) {
                            onError('Identity verification completed without a valid Vouched job id.');
                            return;
                        }

                        try {
                            const result = await apiFetchJson<VouchedCompletionResponse>('/api/v1/vouched/jobs/complete', {
                                method: 'POST',
                                user,
                                body: { jobId, internalId },
                            });

                            if (!isActive) return;
                            onCompleted(result);
                        } catch (error) {
                            onError(getErrorMessage(error, 'Identity verification could not be finalized.'));
                        }
                    },
                });

                await Promise.resolve(instance.mount(`#${containerId}`));

                initTimeout = window.setTimeout(() => {
                    if (!isActive) {
                        return;
                    }

                    setIsLoading(false);
                    onError('Identity verification did not finish loading. Please refresh and try again.');
                }, 8000);
            } catch (error) {
                if (!isActive) return;
                setIsLoading(false);
                onError(getErrorMessage(error, 'Identity verification could not start.'));
            }
        };

        void mount();

        return () => {
            isActive = false;
            if (initTimeout) {
                window.clearTimeout(initTimeout);
            }
            if (instance?.unmount) {
                void Promise.resolve(instance.unmount(`#${containerId}`)).catch(() => undefined);
            }
        };
    }, [birthDate, containerId, email, firstName, lastName, onCompleted, onError, phone, publicKey, user]);

    return (
        <div className="w-full h-[720px] rounded-2xl bg-white overflow-hidden relative">
            {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm font-medium bg-white">
                    Loading secure identity verification...
                </div>
            ) : null}
            <div id={containerId} className="h-full w-full bg-white" />
        </div>
    );
}
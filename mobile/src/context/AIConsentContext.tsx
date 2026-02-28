import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export type AIConsentStatus = 'unknown' | 'accepted' | 'declined';

const AI_CONSENT_KEY = 'aiDataProcessingConsentV2';

interface AIConsentContextType {
  status: AIConsentStatus;
  isReady: boolean;
  hidePrompt: boolean;
  isAccepted: boolean;
  accept: () => Promise<void>;
  decline: () => Promise<void>;
  hidePromptForever: () => Promise<void>;
}

const AIConsentContext = createContext<AIConsentContextType | undefined>(undefined);

export function AIConsentProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AIConsentStatus>('unknown');
  const [isReady, setIsReady] = useState(false);
  const [hidePrompt, setHidePrompt] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      SecureStore.getItemAsync(AI_CONSENT_KEY),
      SecureStore.getItemAsync('aiDataProcessingConsentHidePromptV2'),
    ])
      .then(([consentValue, hidePromptValue]) => {
        if (!mounted) return;
        if (consentValue === 'accepted' || consentValue === 'declined') {
          setStatus(consentValue);
        } else {
          setStatus('unknown');
        }
        setHidePrompt(hidePromptValue === '1');
        setIsReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setStatus('unknown');
        setHidePrompt(false);
        setIsReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const accept = async () => {
    setStatus('accepted');
    await SecureStore.setItemAsync(AI_CONSENT_KEY, 'accepted');
  };

  const decline = async () => {
    setStatus('declined');
    await SecureStore.setItemAsync(AI_CONSENT_KEY, 'declined');
  };

  const hidePromptForever = async () => {
    setHidePrompt(true);
    await SecureStore.setItemAsync('aiDataProcessingConsentHidePromptV2', '1');

    // Default to unknown if they just hid it instead of actively declining
  };

  const value = useMemo(
    () => ({
      status,
      isReady,
      hidePrompt,
      isAccepted: status === 'accepted',
      accept,
      decline,
      hidePromptForever,
    }),
    [status, isReady, hidePrompt]
  );

  return <AIConsentContext.Provider value={value}>{children}</AIConsentContext.Provider>;
}

export function useAIConsent() {
  const context = useContext(AIConsentContext);
  if (!context) {
    throw new Error('useAIConsent must be used within AIConsentProvider');
  }
  return context;
}

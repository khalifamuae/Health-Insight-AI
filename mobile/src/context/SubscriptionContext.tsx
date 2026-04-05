import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSubscriptionStatus } from '../services/IAPService';

interface SubscriptionState {
  plan: 'free' | 'pro' | 'trainer';
  isActive: boolean;
  isTrialActive: boolean;
  trialEndsAt: string | null;
  expiresAt: string | null;
  subscriberManagementActive: boolean;
  subscriberManagementLimit: number;
  loading: boolean;
  // Helper functions
  isPaid: () => boolean;
  isTrainer: () => boolean;
  canUpload: () => boolean;
  canUseAIDiet: () => boolean;
  shouldShowAds: () => boolean;
  refreshStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState>({
  plan: 'free',
  isActive: false,
  isTrialActive: false,
  trialEndsAt: null,
  expiresAt: null,
  subscriberManagementActive: false,
  subscriberManagementLimit: 0,
  loading: true,
  isPaid: () => false,
  isTrainer: () => false,
  canUpload: () => false,
  canUseAIDiet: () => false,
  shouldShowAds: () => true,
  refreshStatus: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    plan: 'free' as 'free' | 'pro' | 'trainer',
    isActive: false,
    isTrialActive: false,
    trialEndsAt: null as string | null,
    expiresAt: null as string | null,
    subscriberManagementActive: false,
    subscriberManagementLimit: 0,
    loading: true,
  });

  const refreshStatus = async () => {
    try {
      const status = await getSubscriptionStatus();
      setState({
        plan: status.plan,
        isActive: status.isActive,
        isTrialActive: status.isTrialActive,
        trialEndsAt: status.trialEndsAt,
        expiresAt: status.expiresAt,
        subscriberManagementActive: status.subscriberManagementActive || false,
        subscriberManagementLimit: status.subscriberManagementLimit || 0,
        loading: false,
      });
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const isPaid = () => state.plan !== 'free' && state.isActive;
  const isTrainer = () => state.subscriberManagementActive && state.isActive;
  const canUpload = () => isPaid() || state.isTrialActive;
  const canUseAIDiet = () => isPaid() || state.isTrialActive;
  const shouldShowAds = () => !isPaid() && !state.isTrialActive;

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        isPaid,
        isTrainer,
        canUpload,
        canUseAIDiet,
        shouldShowAds,
        refreshStatus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}

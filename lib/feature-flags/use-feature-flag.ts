'use client';

import { useState, useEffect } from 'react';
import { FEATURE_FLAGS, FeatureFlagKey } from './flags';

/**
 * Client React Hook to observe a Feature Flag status
 */
export function useFeatureFlag(
  flagKey: FeatureFlagKey | string,
  fallbackValue?: boolean
): { isEnabled: boolean; isLoading: boolean } {
  const defaultVal =
    fallbackValue !== undefined
      ? fallbackValue
      : FEATURE_FLAGS[flagKey]?.defaultValue ?? false;

  const [isEnabled, setIsEnabled] = useState<boolean>(defaultVal);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function checkFlag() {
      try {
        const res = await fetch(`/api/public/flags?key=${encodeURIComponent(flagKey)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.isEnabled === 'boolean') {
            setIsEnabled(data.isEnabled);
          }
        }
      } catch {
        // Retain default value on network failure
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    checkFlag();

    return () => {
      isMounted = false;
    };
  }, [flagKey]);

  return { isEnabled, isLoading };
}

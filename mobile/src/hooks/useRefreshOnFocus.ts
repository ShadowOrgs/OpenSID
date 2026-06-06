import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

export function useRefreshOnFocus(callback: (isInitial: boolean) => void | Promise<void>) {
  const hasFocused = useRef(false);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useFocusEffect(
    useCallback(() => {
      const isInitial = !hasFocused.current;
      hasFocused.current = true;
      void callbackRef.current(isInitial);
    }, []),
  );
}

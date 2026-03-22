import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const DataSyncContext = createContext(null);

export const DataSyncProvider = ({ children }) => {
  const [tick, setTick] = useState(0);
  const bumpAll = useCallback(() => setTick((t) => t + 1), []);

  const value = useMemo(() => ({ tick, bumpAll }), [tick, bumpAll]);

  return <DataSyncContext.Provider value={value}>{children}</DataSyncContext.Provider>;
};

export const useDataSync = () => {
  const ctx = useContext(DataSyncContext);
  if (!ctx) {
    return { tick: 0, bumpAll: () => {} };
  }
  return ctx;
};

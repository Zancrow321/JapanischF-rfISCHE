import { SQLiteProvider } from 'expo-sqlite';
import type { PropsWithChildren } from 'react';

import { migrate } from './schema';

export const DATABASE_NAME = 'lernstand.db';

export function DatabaseProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
      {children}
    </SQLiteProvider>
  );
}

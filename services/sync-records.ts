type SyncRecord = Record<string, unknown>;

const persistedColumnsByCollection: Record<string, readonly string[]> = {
  cycle_compounds: [
    'id',
    'cycle_id',
    'compound_id',
    'name',
    'amount',
    'amount_unit',
    'dosing_period',
    'start_date',
    'end_date',
    'created_at',
    'last_modified',
  ],
};

export const sanitizeRecordForSync = <T extends SyncRecord>(
  collectionName: string,
  record: T,
): T => {
  const persistedColumns = persistedColumnsByCollection[collectionName];
  if (!persistedColumns) {
    return record;
  }

  const sanitizedRecord: SyncRecord = {};

  persistedColumns.forEach((column) => {
    if (column in record) {
      sanitizedRecord[column] = record[column];
    }
  });

  return sanitizedRecord as T;
};
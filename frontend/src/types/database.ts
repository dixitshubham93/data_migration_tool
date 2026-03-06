export interface DatabaseConnection {
  protocol: 'mongodb' | 'mysql';
  username: string;
  password: string;
  host: string;
  port: number;
  database?: string;
  /** Selected collection names. Empty = none selected yet. */
  collections?: string[];
  /** When true, all collections in the database will be migrated. */
  migrateAllCollections?: boolean;
}

export interface MigrationConfig {
  data: {
    source: DatabaseConnection;
    target: DatabaseConnection;
  };
  filter: Record<string, any>;
}

export interface DataRow {
  id: string | number;
  [key: string]: any;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';
export type MigrationStatus = 'idle' | 'previewing' | 'ready' | 'migrating' | 'completed' | 'error';
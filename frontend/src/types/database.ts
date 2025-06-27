export interface DatabaseConnection {
  protocol: 'mongodb' | 'mysql';
  username: string;
  password: string;
  host: string;
  port: number;
  database?: string;
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
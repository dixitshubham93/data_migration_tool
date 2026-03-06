import React, { useState, useEffect } from 'react';
import { Database, Eye, EyeOff, Loader, CheckCircle, XCircle, Link, ChevronDown } from 'lucide-react';
import { DatabaseConnection, ConnectionStatus } from '../types/database';

const baseUrl = import.meta.env.VITE_BACKEND_URL;

interface DatabaseConnectionFormProps {
  title: string;
  connection: DatabaseConnection;
  status: ConnectionStatus;
  onConnectionChange: (connection: DatabaseConnection) => void;
  onConnect: () => void;
  showDatabase?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/** Parse a MongoDB or MySQL connection URL into credential fields. */
const parseConnectionUrl = (url: string): Partial<DatabaseConnection> | null => {
  try {
    // mongodb+srv:// is not a standard URL scheme in some browsers — normalise it
    const normalised = url.startsWith('mongodb+srv://')
      ? url.replace('mongodb+srv://', 'https://')
      : url;
    const parsed = new URL(normalised);
    const resolvedProtocol: 'mongodb' | 'mysql' = url.startsWith('mongodb') ? 'mongodb' : 'mysql';
    const defaultPort = resolvedProtocol === 'mongodb' ? 27017 : 3306;
    const port = parsed.port ? parseInt(parsed.port) : defaultPort;
    // For SRV URLs the real host is in hostname (minus port)
    const host = url.startsWith('mongodb+srv://')
      ? parsed.hostname          // e.g. cluster0.abc.mongodb.net
      : parsed.hostname;
    const database = parsed.pathname.replace(/^\//, '').split('?')[0] || undefined;

    return {
      protocol: resolvedProtocol,
      host,
      port,
      username: parsed.username ? decodeURIComponent(parsed.username) : '',
      password: parsed.password ? decodeURIComponent(parsed.password) : '',
      ...(database ? { database } : {}),
    };
  } catch {
    return null;
  }
};

export const DatabaseConnectionForm: React.FC<DatabaseConnectionFormProps> = ({
  title,
  connection,
  status,
  onConnectionChange,
  onConnect,
  showDatabase = true,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [connectionUrl, setConnectionUrl] = useState('');
  // true when user pasted a valid MongoDB URL that had no database segment
  const [urlMissingDb, setUrlMissingDb] = useState(false);

  // MongoDB db/collection selection state (only used when protocol === 'mongodb')
  const [availableDbs, setAvailableDbs] = useState<string[]>([]);
  const [loadingDbs, setLoadingDbs] = useState(false);
  const [selectedDb, setSelectedDb] = useState('');
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [migrateAll, setMigrateAll] = useState(false);

  // ----- Fetch databases once the connection is confirmed -----
  useEffect(() => {
    if (status !== 'connected' || connection.protocol !== 'mongodb') {
      setAvailableDbs([]);
      setSelectedDb('');
      setAvailableCollections([]);
      setSelectedCollections(new Set());
      setMigrateAll(false);
      return;
    }
    const fetchDbs = async () => {
      setLoadingDbs(true);
      try {
        const res = await fetch(`${baseUrl}/migrate/databases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: connection }),
          credentials: 'include',
        });
        const result = await res.json();
        if (res.ok && result.success) {
          setAvailableDbs(result.data.databases ?? []);
          if (connection.database && result.data.databases?.includes(connection.database)) {
            setSelectedDb(connection.database);
          }
        }
      } catch (e) {
        console.error('Failed to list databases:', e);
      } finally {
        setLoadingDbs(false);
      }
    };
    fetchDbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ----- Fetch collections when a database is selected -----
  useEffect(() => {
    if (!selectedDb || status !== 'connected') {
      setAvailableCollections([]);
      setSelectedCollections(new Set());
      setMigrateAll(false);
      return;
    }
    const fetchCols = async () => {
      setLoadingCollections(true);
      try {
        const res = await fetch(`${baseUrl}/migrate/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { ...connection, database: selectedDb } }),
          credentials: 'include',
        });
        const result = await res.json();
        if (res.ok && result.success) {
          setAvailableCollections(result.data.collections ?? []);
        }
      } catch (e) {
        console.error('Failed to list collections:', e);
      } finally {
        setLoadingCollections(false);
      }
    };
    onConnectionChange({ ...connection, database: selectedDb, collections: [], migrateAllCollections: false });
    fetchCols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDb]);

  // Propagate collection selection changes to parent
  useEffect(() => {
    if (!selectedDb) return;
    onConnectionChange({
      ...connection,
      database: selectedDb,
      collections: migrateAll ? availableCollections : Array.from(selectedCollections),
      migrateAllCollections: migrateAll,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollections, migrateAll]);

  const toggleCollection = (col: string) => {
    setSelectedCollections(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      return next;
    });
  };

  const handleInputChange = (field: keyof DatabaseConnection, value: string | number) => {
    onConnectionChange({ ...connection, [field]: value });
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'connecting': return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Database className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Failed';
      default: return 'Not Connected';
    }
  };



  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 transition-all duration-300">
      <div className="p-6 cursor-pointer" onClick={onToggleCollapse}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon()}
                <span className={`text-sm ${status === 'connected' ? 'text-emerald-600' :
                  status === 'connecting' ? 'text-blue-600' :
                    status === 'error' ? 'text-red-600' :
                      'text-gray-500'
                  }`}>
                  {getStatusText()}
                </span>
              </div>
            </div>
          </div>
          <div className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="px-6 pb-6 space-y-4">

          {/* ── Connection URL ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connection URL <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Link className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={connectionUrl}
                onChange={(e) => {
                  const url = e.target.value;
                  setConnectionUrl(url);
                  // Reset db/collection selections when URL changes
                  setSelectedDb('');
                  setSelectedCollections(new Set());
                  setMigrateAll(false);
                  setAvailableDbs([]);
                  setAvailableCollections([]);

                  if (url.trim()) {
                    const parsed = parseConnectionUrl(url.trim());
                    if (parsed) {
                      // Track whether the URL itself lacked a database segment
                      setUrlMissingDb(parsed.protocol === 'mongodb' && !parsed.database);
                      onConnectionChange({ ...connection, ...parsed });
                    }
                  } else {
                    setUrlMissingDb(false);
                  }
                }}
                placeholder="mongodb+srv://user:pass@cluster.mongodb.net/db  or  mysql://user:pass@host:3306/db"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm font-mono"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">Paste a connection string to auto-fill the fields below.</p>
          </div>

          {/* ── Credential fields (unchanged) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Protocol</label>
              <select
                value={connection.protocol}
                onChange={(e) => handleInputChange('protocol', e.target.value as 'mongodb' | 'mysql')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="mongodb">MongoDB</option>
                <option value="mysql">MySQL</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Host</label>
              <input
                type="text"
                value={connection.host}
                onChange={(e) => handleInputChange('host', e.target.value)}
                placeholder="localhost"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={connection.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="root"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
              <input
                type="number"
                value={connection.port}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 0)}
                placeholder="3306"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={connection.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Static database field (original) */}
            {showDatabase && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Database</label>
                <input
                  type="text"
                  value={connection.database || ''}
                  onChange={(e) => handleInputChange('database', e.target.value)}
                  placeholder="database_name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            )}
          </div>

          {/* ── Database name input: only when URL parsed but no DB found ── */}
          {urlMissingDb && status !== 'connected' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={connection.database || ''}
                onChange={(e) => handleInputChange('database', e.target.value)}
                placeholder="Enter the database name to connect to"
                className="w-full px-3 py-2 border border-amber-400 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors"
              />
              <p className="mt-1 text-xs text-amber-600">The connection URL does not include a database name. Please provide one.</p>
            </div>
          )}

          {/* ── Test Connection button (unchanged) ── */}
          <div className="pt-2">
            <button
              onClick={onConnect}
              disabled={status === 'connecting' || !connection.host || !connection.username}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {status === 'connecting' ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                'Test Connection'
              )}
            </button>
          </div>

          {/* ── Database + Collection selection (MongoDB only, shown after successful connect) ── */}
          {status === 'connected' && connection.protocol === 'mongodb' && (
            <div className="pt-2 space-y-4 border-t border-gray-100">

              {/* Database picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 text-blue-500" />
                  Select Database
                  {loadingDbs && <Loader className="w-3 h-3 animate-spin text-blue-500" />}
                </label>
                <select
                  value={selectedDb}
                  onChange={(e) => setSelectedDb(e.target.value)}
                  disabled={loadingDbs || availableDbs.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">
                    {loadingDbs ? 'Fetching databases…' : availableDbs.length === 0 ? 'No databases found' : '— choose a database —'}
                  </option>
                  {availableDbs.map((db) => (
                    <option key={db} value={db}>{db}</option>
                  ))}
                </select>
              </div>

              {/* Collection selection (shown once a DB is chosen) */}
              {selectedDb && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <ChevronDown className="w-4 h-4 text-emerald-500" />
                      Collections
                      {loadingCollections && <Loader className="w-3 h-3 animate-spin text-emerald-500" />}
                    </label>
                    {/* Migrate All toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => setMigrateAll(v => !v)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${migrateAll ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${migrateAll ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                      </div>
                      <span className="text-xs font-medium text-gray-600">Migrate All</span>
                    </label>
                  </div>

                  {migrateAll ? (
                    <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                      ✓ All <span className="font-semibold">{availableCollections.length}</span> collections will be migrated.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {loadingCollections ? (
                        <div className="px-3 py-3 text-sm text-gray-400 flex items-center gap-2">
                          <Loader className="w-3 h-3 animate-spin" /> Fetching collections…
                        </div>
                      ) : availableCollections.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-gray-400">No collections found.</div>
                      ) : (
                        availableCollections.map((col) => (
                          <label key={col} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCollections.has(col)}
                              onChange={() => toggleCollection(col)}
                              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-gray-700 font-mono">{col}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}

                  {/* Summary badge */}
                  {!migrateAll && selectedCollections.size > 0 && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      {selectedCollections.size} of {availableCollections.length} collection{selectedCollections.size !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

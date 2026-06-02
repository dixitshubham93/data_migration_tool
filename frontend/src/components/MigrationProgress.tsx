import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle, Clock, AlertCircle, ArrowRight, RefreshCw,
  Database, Table2, ChevronDown, ChevronRight, Zap
} from 'lucide-react';
import { MigrationStatus } from '../types/database';

interface CollectionState {
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  processedDocs: number;
  totalDocs: number;
  error?: string;
  rolledBack?: boolean;
}

interface ErTable {
  table: string;
  columns: Record<string, string>;
  foreignKeys: { column: string; refTable: string }[];
}

interface MigrationProgressProps {
  status: MigrationStatus;
  migrationId: string | null;
  onStartMigration: () => void;
  onReset: () => void;
}

import { BASE_URL } from '../utils/api';

export const MigrationProgress: React.FC<MigrationProgressProps> = ({
  status,
  migrationId,
  onStartMigration,
  onReset,
}) => {
  const [collections, setCollections] = useState<Record<string, CollectionState>>({});
  const [erDiagram, setErDiagram] = useState<ErTable[]>([]);
  const [liveStatus, setLiveStatus] = useState<'running' | 'done' | 'failed' | null>(null);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [showEr, setShowEr] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Open SSE stream when migrationId is available
  useEffect(() => {
    if (!migrationId) return;

    // Reset state for new migration
    setCollections({});
    setErDiagram([]);
    setLiveStatus('running');
    setShowEr(false);

    const es = new EventSource(`${BASE_URL}/migrate/progress/${migrationId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        switch (payload.event) {
          case 'state':
            // Initial state dump on connect
            if (payload.collections) {
              setCollections(payload.collections);
            }
            break;

          case 'collection_start':
            setCollections(prev => ({
              ...prev,
              [payload.collection]: {
                status: 'running',
                processedDocs: 0,
                totalDocs: 0,
              },
            }));
            break;

          case 'progress':
            setCollections(prev => ({
              ...prev,
              [payload.collection]: {
                ...prev[payload.collection],
                status: 'running',
                processedDocs: payload.processedDocs,
                totalDocs: payload.totalDocs,
              },
            }));
            break;

          case 'collection_committed':
          case 'collection_done':
            setCollections(prev => ({
              ...prev,
              [payload.collection]: {
                ...prev[payload.collection],
                status: 'done',
              },
            }));
            break;

          case 'collection_skipped':
            setCollections(prev => ({
              ...prev,
              [payload.collection]: {
                ...prev[payload.collection],
                status: 'skipped',
              },
            }));
            break;

          case 'collection_error':
            setCollections(prev => ({
              ...prev,
              [payload.collection]: {
                ...prev[payload.collection],
                status: 'failed',
                error: payload.error,
                rolledBack: payload.rolledBack,
              },
            }));
            break;

          case 'complete':
            setLiveStatus('done');
            if (payload.erDiagram?.length) {
              setErDiagram(payload.erDiagram);
              setShowEr(true);
            }
            es.close();
            break;

          case 'error':
            setLiveStatus('failed');
            es.close();
            break;
        }
      } catch { /* malformed SSE message */ }
    };

    es.onerror = () => {
      // SSE disconnected — try to fetch final status
      fetch(`${BASE_URL}/migrate/status/${migrationId}`)
        .then(r => r.json())
        .then(r => {
          if (r.data?.status === 'done') {
            setLiveStatus('done');
            if (r.data?.erDiagram?.length) {
              setErDiagram(r.data.erDiagram);
              setShowEr(true);
            }
          } else if (r.data?.status === 'failed') {
            setLiveStatus('failed');
          }
        })
        .catch(() => {});
      es.close();
    };

    return () => {
      es.close();
    };
  }, [migrationId]);

  // ── Helpers ──────────────────────────────────────────────────────
  const colEntries = Object.entries(collections);
  const doneCount = colEntries.filter(([, c]) => c.status === 'done').length;
  const totalCount = colEntries.length;
  const overallPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const statusColor = {
    pending: 'bg-gray-200',
    running: 'bg-blue-500 animate-pulse',
    done: 'bg-emerald-500',
    failed: 'bg-red-500',
    skipped: 'bg-amber-400',
  };

  const statusLabel = {
    pending: 'Pending',
    running: 'Migrating…',
    done: 'Done',
    failed: 'Failed',
    skipped: 'Skipped (resumed)',
  };

  // ── Idle / Ready state ───────────────────────────────────────────
  if (status === 'ready') {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Migrate</h3>
        <p className="text-gray-600 mb-6">Data preview completed. Click below to start migration.</p>
        <button
          onClick={onStartMigration}
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <ArrowRight className="w-5 h-5" />
          Start Migration
        </button>
      </div>
    );
  }

  if (status === 'error' && !migrationId) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Migration Failed</h3>
        <p className="text-gray-600 mb-6">Failed to start migration. Please try again.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onStartMigration} className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">Retry</button>
          <button onClick={onReset} className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">Reset</button>
        </div>
      </div>
    );
  }

  // ── Migration started (migrating or completed with SSE) ──────────
  return (
    <div className="space-y-6">

      {/* ── Overall progress card ── */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {liveStatus === 'done'
              ? <CheckCircle className="w-6 h-6 text-emerald-500" />
              : liveStatus === 'failed'
              ? <AlertCircle className="w-6 h-6 text-red-500" />
              : <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            }
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {liveStatus === 'done'
                  ? 'Migration Complete!'
                  : liveStatus === 'failed'
                  ? 'Migration Failed'
                  : 'Migration in Progress…'}
              </h3>
              {migrationId && (
                <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {migrationId}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-800">{overallPct}%</span>
            <p className="text-xs text-gray-400">{doneCount} / {totalCount} collections</p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              liveStatus === 'done' ? 'bg-emerald-500' :
              liveStatus === 'failed' ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${overallPct}%` }}
          />
        </div>

        {/* Per-collection breakdown */}
        {colEntries.length > 0 && (
          <div className="mt-5 space-y-2">
            {colEntries.map(([name, col]) => {
              const pct = col.totalDocs > 0
                ? Math.round((col.processedDocs / col.totalDocs) * 100)
                : col.status === 'done' ? 100 : 0;

              return (
                <div key={name} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor[col.status]}`} />
                  <span className="text-sm text-gray-700 font-mono flex-1 truncate" title={name}>{name}</span>
                  <span className="text-xs text-gray-400 w-20 text-right">
                    {col.status === 'running' && col.totalDocs > 0
                      ? `${col.processedDocs.toLocaleString()} / ${col.totalDocs.toLocaleString()}`
                      : statusLabel[col.status]}
                  </span>
                  <div className="w-24 bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${statusColor[col.status].replace(' animate-pulse', '')}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {col.error && (
                    <span className="text-xs text-red-500 truncate max-w-[120px]" title={col.error}>
                      ⚠ {col.error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        {liveStatus === 'done' && (
          <div className="mt-6 flex gap-3 justify-center">
            <button onClick={onReset} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> New Migration
            </button>
          </div>
        )}
        {liveStatus === 'failed' && (
          <div className="mt-6 flex gap-3 justify-center">
            <button onClick={onStartMigration} className="bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 transition-colors">Retry</button>
            <button onClick={onReset} className="bg-gray-600 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors">Reset</button>
          </div>
        )}
      </div>

      {/* ── ER Diagram ── */}
      {showEr && erDiagram.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">ER Diagram</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {erDiagram.length} table{erDiagram.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {erDiagram.map((table) => (
              <div key={table.table} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Table header */}
                <button
                  onClick={() => setExpandedTable(expandedTable === table.table ? null : table.table)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Table2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800 font-mono truncate" title={table.table}>
                      {table.table}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {Object.keys(table.columns).length} cols
                    </span>
                    {expandedTable === table.table
                      ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    }
                  </div>
                </button>

                {/* Columns list */}
                {expandedTable === table.table && (
                  <div className="divide-y divide-gray-100">
                    {Object.entries(table.columns).map(([col, type]) => {
                      const isFk = table.foreignKeys?.some(fk => fk.column === col);
                      const isPk = col === '_id';
                      return (
                        <div key={col} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                          <div className="flex items-center gap-1.5">
                            {isPk && <span className="text-amber-500 text-xs font-bold">PK</span>}
                            {isFk && <span className="text-blue-500 text-xs font-bold">FK</span>}
                            <span className="text-sm text-gray-700 font-mono">{col}</span>
                          </div>
                          <span className="text-xs text-gray-400 font-mono">{type}</span>
                        </div>
                      );
                    })}
                    {/* FK references */}
                    {table.foreignKeys?.length > 0 && (
                      <div className="px-4 py-2 bg-blue-50">
                        {table.foreignKeys.map(fk => (
                          <p key={fk.column} className="text-xs text-blue-600">
                            <span className="font-mono">{fk.column}</span>
                            {' → '}
                            <span className="font-mono font-medium">{fk.refTable}._id</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Idle fallback */}
      {!migrationId && status !== 'migrating' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Waiting for Configuration</h3>
          <p className="text-gray-600">Complete the database connections to proceed.</p>
        </div>
      )}
    </div>
  );
};

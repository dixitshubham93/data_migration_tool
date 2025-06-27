import React, { useState, useEffect } from 'react';
import { Database, ArrowRight, Zap } from 'lucide-react';
import { DatabaseConnectionForm } from './components/DatabaseConnectionForm';
import { DataPreview } from './components/DataPreview';
import { ConfigurationSummary } from './components/ConfigurationSummary';
import { MigrationProgress } from './components/MigrationProgress';
import { DatabaseConnection, ConnectionStatus, MigrationStatus, MigrationConfig } from './types/database';
import { getAllMockData, mockColumns } from './utils/mockData';

function App() {
  // Connection states

  const [sourceConnection, setSourceConnection] = useState<DatabaseConnection>({
    protocol: 'mongodb',
    username: 'root',
    password: 'password',
    host: 'localhost',
    port: 27017,
    database: 'mongodatabase'
  });

  const [targetConnection, setTargetConnection] = useState<DatabaseConnection>({
    protocol: 'mysql',
    username: 'root',
    password: 'password',
    host: 'localhost',
    port: 3306
  });

  const [sourceStatus, setSourceStatus] = useState<ConnectionStatus>('idle');
  const [targetStatus, setTargetStatus] = useState<ConnectionStatus>('idle');
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>('idle');

  // UI states
  const [sourceCollapsed, setSourceCollapsed] = useState(false);
  const [targetCollapsed, setTargetCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Data
  const [previewData] = useState(getAllMockData());

  const migrationConfig: MigrationConfig = {
    data: {
      source: sourceConnection,
      target: targetConnection
    },
    filter: {}
  };

  const handleSourceConnect = async () => {
  setSourceStatus('connecting');

  try {
    const res = await fetch('http://localhost:3000/migrate/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: sourceConnection
      }),
      credentials: 'include'
    });

    const result = await res.json();
    if (res.ok && result.success) {
      setSourceStatus('connected');
    } else {
      setSourceStatus('error');
      console.error(result.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Connection error:', error);
    setSourceStatus('error');
  }
};


  const handleTargetConnect = async () => {
  setTargetStatus('connecting');

  try {
    const res = await fetch('http://localhost:3000/migrate/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: targetConnection
      }),
      credentials: 'include' // Only if your backend uses cookies/sessions
    });

    const result = await res.json();
    if (res.ok && result.success) {
      setTargetStatus('connected');
    } else {
      setTargetStatus('error');
      console.error(result.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Connection error:', error);
    setTargetStatus('error');
  }
};


  const handlePreviewData = async () => {
    setMigrationStatus('previewing');
    setShowPreview(false);
    // Simulate data loading
    await new Promise(resolve => setTimeout(resolve, 1500));
    setShowPreview(true);
    setMigrationStatus('ready');
  };

  const handleStartMigration = async () => {
  setMigrationStatus('migrating');

  try {
    const res = await fetch('http://localhost:3000/migrate/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
      source: sourceConnection,
      target: targetConnection
    },
    filter: {} // Replace this with your actual migration data
      }),
      credentials: 'include' // Only if backend uses cookies/sessions
    });

    const result = await res.json();
    if (res.ok && result.success) {
      setMigrationStatus('completed');
    } else {
      setMigrationStatus('error');
      console.error(result.message || 'Migration failed');
    }
  } catch (error) {
    console.error('Migration error:', error);
    setMigrationStatus('error');
  }
};


  const handleReset = () => {
    setSourceStatus('idle');
    setTargetStatus('idle');
    setMigrationStatus('idle');
    setShowPreview(false);
    setSourceCollapsed(false);
    setTargetCollapsed(false);
  };

  // Auto-collapse forms when both are connected
  useEffect(() => {
    if (sourceStatus === 'connected' && targetStatus === 'connected') {
      setSourceCollapsed(true);
      setTargetCollapsed(true);
    }
  }, [sourceStatus, targetStatus]);

  const canPreview = sourceStatus === 'connected' && targetStatus === 'connected';
  const showMigrationSection = canPreview && (migrationStatus === 'ready' || migrationStatus === 'migrating' || migrationStatus === 'completed' || migrationStatus === 'error');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Migration Tool</h1>
              <p className="text-gray-600 mt-1">Seamlessly migrate data between databases</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Connection Forms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <DatabaseConnectionForm
              title="Source Database"
              connection={sourceConnection}
              status={sourceStatus}
              onConnectionChange={setSourceConnection}
              onConnect={handleSourceConnect}
              showDatabase={true}
              isCollapsed={sourceCollapsed}
              onToggleCollapse={() => setSourceCollapsed(!sourceCollapsed)}
            />

            <DatabaseConnectionForm
              title="Target Database"
              connection={targetConnection}
              status={targetStatus}
              onConnectionChange={setTargetConnection}
              onConnect={handleTargetConnect}
              showDatabase={false}
              isCollapsed={targetCollapsed}
              onToggleCollapse={() => setTargetCollapsed(!targetCollapsed)}
            />
          </div>

          {/* Preview Data Button */}
          {canPreview && !showPreview && migrationStatus === 'idle' && (
            <div className="text-center">
              <button
                onClick={handlePreviewData}
                className="bg-emerald-600 text-white px-8 py-4 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-3 mx-auto text-lg font-semibold shadow-lg"
              >
                <Zap className="w-6 h-6" />
                Preview Data
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* Loading State */}
          {migrationStatus === 'previewing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-gray-600 mt-4 text-lg">Loading data preview...</p>
            </div>
          )}

          {/* Data Preview */}
          {showPreview && (
            <div className="space-y-8">
              <DataPreview
                data={previewData}
                columns={mockColumns}
                title="Source Data Preview"
                isLoading={false}
              />

              {/* Migration Progress */}
              {showMigrationSection && (
                <MigrationProgress
                  status={migrationStatus}
                  onStartMigration={handleStartMigration}
                  onReset={handleReset}
                />
              )}
            </div>
          )}

          {/* Configuration Summary */}
          {(sourceStatus === 'connected' || targetStatus === 'connected') && (
            <ConfigurationSummary config={migrationConfig} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
import  { useState } from 'react';
import { Database, ArrowRight, Settings, AlertCircle } from 'lucide-react';
import DataPreview from './components/DataPreview';

const databaseTypes = [
  { id: 'mysql', name: 'MySQL', icon: '🗄' },
  { id: 'postgresql', name: 'PostgreSQL', icon: '🐘' },
  { id: 'mongodb', name: 'MongoDB', icon: '🍃' },
  { id: 'sqlite', name: 'SQLite', icon: '📊' },
  { id: 'csv', name: 'CSV File', icon: '📄' },
];

function App() {
  const [sourceType, setSourceType] = useState('');
  const [targetType, setTargetType] = useState('');
  const [sourceConfig, setSourceConfig] = useState('');
  const [targetConfig, setTargetConfig] = useState('');

  const handleMigration = async () => {
    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceType,
          sourceConfig,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Migration started successfully:', data);
        alert('Migration started successfully');
      } else {
        console.error('Failed to start migration:', response.statusText);
        alert('Failed to start migration. Please try again.');
      }
    } catch (error) {
      console.error('Error while starting migration:', error);
      alert('An error occurred. Please check the console for more details.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Migration Tool</h1>
                <p className="text-sm text-gray-500">Transfer data between different database systems</p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Settings className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Source Database Section */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Source Database</h2>
              <p className="text-sm text-gray-500">Select your source cloud database type</p>
            </div>
            <div className="p-6">
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Source Database Type</option>
                {databaseTypes.map((db) => (
                  <option key={db.id} value={db.id}>
                    {db.icon} {db.name}
                  </option>
                ))}
              </select>

              {sourceType && (
                <div>
                  <p className="text-sm text-gray-500 my-1">Enter your source global database Connection string</p>
                  <input className='w-full my-3 ' onChange={(e)=>{setSourceConfig(e.target.value)}} type='text' id='url' placeholder='protocol://username:password@hostname:port/database
'></input>
                 
                </div>
              )}

              {sourceConfig && (
                <DataPreview
                  title="Source Data Preview"
                  data={[]} // This would be populated with actual source data
                  className="mt-6"
                />
              )}
            </div>
          </div>

          {/* Migration Arrow */}
          <div className="flex items-center justify-center">
            <div className="p-4 rounded-full bg-blue-50 border-2 border-blue-100">
              <ArrowRight className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {/* Target Database Section */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Target Database</h2>
              <p className="text-sm text-gray-500">Select your target database type</p>
            </div>
            <div className="p-6">
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Target Database Type</option>
                {databaseTypes.map((db) => (
                  <option key={db.id} value={db.id}>
                    {db.icon} {db.name}
                  </option>
                ))}
              </select>

              {targetType && (
                <div>
                <p className="text-sm text-gray-500 my-1">Enter your source global database Connection string</p>
                <input className='w-full my-3 ' onChange={(e)=>{setTargetConfig(e.target.value)}} type='text' id='url' placeholder='protocol://username:password@hostname:port/database
'></input>
                
              </div>
              )}

              {targetConfig && (
                <DataPreview
                  title="Transformed Data Preview"
                  data={[]} // This would be populated with transformed data
                  className="mt-6"
                />
              )}
            </div>
          </div>
        </div>
        
        {(!sourceType || !targetType) && (
          <div className="mt-8 flex items-center justify-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
            <p className="text-sm text-yellow-700">
              Please select both source and target database types to begin the migration process
            </p>
          </div>
        )}

        {sourceConfig && targetConfig && (
          <div className="mt-8 flex justify-center">
            <button
              className="px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              onClick={handleMigration}
            >
              Start Migration
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

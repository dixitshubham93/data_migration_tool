import React, { useState } from 'react';

interface DatabaseConfigProps {
  type: string;
  onConfigSubmit: (config: any) => void;
  className?: string;
}

const DatabaseConfig: React.FC<DatabaseConfigProps> = ({ type, onConfigSubmit, className = '' }) => {
  const [config, setConfig] = useState({
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    filepath: '', // for CSV files
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfigSubmit(config);
  };

  const renderFields = () => {
    if (type === 'csv') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File Path</label>
            <input
              type="text"
              value={config.filepath}
              onChange={(e) => setConfig({ ...config, filepath: e.target.value })}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
              placeholder="/path/to/file.csv"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
              placeholder="localhost"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <input
              type="text"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: e.target.value })}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
              placeholder="3306"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
          <input
            type="text"
            value={config.database}
            onChange={(e) => setConfig({ ...config, database: e.target.value })}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
            placeholder="mydb"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            type="text"
            value={config.username}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
            placeholder="root"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={config.password}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
          />
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {renderFields()}
      <button
        type="submit"
        className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        Connect
      </button>
    </form>
  );
};

export default DatabaseConfig;
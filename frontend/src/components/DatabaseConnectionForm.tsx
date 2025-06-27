import React, { useState } from 'react';
import { Database, Eye, EyeOff, Loader, CheckCircle, XCircle } from 'lucide-react';
import { DatabaseConnection, ConnectionStatus } from '../types/database';

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

  const handleInputChange = (field: keyof DatabaseConnection, value: string | number) => {
    onConnectionChange({
      ...connection,
      [field]: value
    });
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'connecting':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Database className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Failed';
      default:
        return 'Not Connected';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 transition-all duration-300">
      <div 
        className="p-6 cursor-pointer"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon()}
                <span className={`text-sm ${
                  status === 'connected' ? 'text-emerald-600' :
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Protocol
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Host
              </label>
              <input
                type="text"
                value={connection.host}
                onChange={(e) => handleInputChange('host', e.target.value)}
                placeholder="localhost"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={connection.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="root"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <input
                type="number"
                value={connection.port}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 0)}
                placeholder="3306"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
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

            {showDatabase && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Database {!showDatabase && <span className="text-gray-400">(optional)</span>}
                </label>
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

          <div className="pt-4">
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
        </div>
      )}
    </div>
  );
};




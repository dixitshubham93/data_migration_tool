import React from 'react';
import { CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { MigrationStatus } from '../types/database';

interface MigrationProgressProps {
  status: MigrationStatus;
  onStartMigration: () => void;
  onReset: () => void;
}

export const MigrationProgress: React.FC<MigrationProgressProps> = ({
  status,
  onStartMigration,
  onReset
}) => {
  const getStatusContent = () => {
    switch (status) {
      case 'ready':
        return {
          icon: <CheckCircle className="w-8 h-8 text-emerald-500" />,
          title: 'Ready to Migrate',
          description: 'Data preview completed. Ready to start migration.',
          action: (
            <button
              onClick={onStartMigration}
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              Start Migration
            </button>
          )
        };
      
      case 'migrating':
        return {
          icon: <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />,
          title: 'Migration in Progress',
          description: 'Please wait while we migrate your data...',
          action: null
        };
      
      case 'completed':
        return {
          icon: <CheckCircle className="w-8 h-8 text-emerald-500" />,
          title: 'Migration Complete!',
          description: 'Your data has been successfully migrated.',
          action: (
            <button
              onClick={onReset}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Migration
            </button>
          )
        };
      
      case 'error':
        return {
          icon: <AlertCircle className="w-8 h-8 text-red-500" />,
          title: 'Migration Failed',
          description: 'An error occurred during migration. Please try again.',
          action: (
            <div className="flex gap-3">
              <button
                onClick={onStartMigration}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onReset}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            </div>
          )
        };
      
      default:
        return {
          icon: <Clock className="w-8 h-8 text-gray-400" />,
          title: 'Waiting for Configuration',
          description: 'Complete the database connections to proceed.',
          action: null
        };
    }
  };

  const content = getStatusContent();

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
      <div className="mb-4">
        {content.icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {content.title}
      </h3>
      <p className="text-gray-600 mb-6">
        {content.description}
      </p>
      {content.action}
    </div>
  );
};
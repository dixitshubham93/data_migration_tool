import React, { useState } from 'react';
import { Code, Copy, Check } from 'lucide-react';
import { MigrationConfig } from '../types/database';

interface ConfigurationSummaryProps {
  config: MigrationConfig;
}

export const ConfigurationSummary: React.FC<ConfigurationSummaryProps> = ({ config }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const maskedConfig = {
    ...config,
    data: {
      source: {
        ...config.data.source,
        password: '••••••••'
      },
      target: {
        ...config.data.target,
        password: '••••••••'
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Code className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Configuration Summary</h3>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy JSON
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-800 font-mono">
            {JSON.stringify(maskedConfig, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { DataPreview } from './DataPreview';
import { DatabaseConnection } from '../types/database';

interface Props {
  sourceConnection: DatabaseConnection;
}

const baseUrl = import.meta.env.VITE_BACKEND_URL; // ✅ Access base URL from env
console.log('Base URL:', baseUrl);
export const DataPreviewContainer: React.FC<Props> = ({ sourceConnection }) => {
  const [dataMap, setDataMap] = useState<{ [collection: string]: any[] }>({});
  const [loading, setLoading] = useState(true);

  // Stable cache key — only re-fetch when the actual connection target changes,
  // NOT when collection selection or other UI state updates the object reference.
  const connectionKey = JSON.stringify({
    protocol: sourceConnection.protocol,
    host: sourceConnection.host,
    port: sourceConnection.port,
    username: sourceConnection.username,
    database: sourceConnection.database,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${baseUrl}/migrate/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: sourceConnection }),
        });

        const json = await res.json();
        console.log("this is the data", json);
        if (json && typeof json === 'object') {
          setDataMap(json);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionKey]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
        <p className="text-lg">Fetching collection data…</p>
        <p className="text-sm text-gray-400 mt-1">Large collections may take a moment</p>
      </div>
    );
  }

  if (Object.keys(dataMap).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-lg font-medium">No data found</p>
        <p className="text-sm mt-1">The selected database has no collections or all collections are empty.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {Object.entries(dataMap).map(([collectionName, data]) => {
        const columns =
          data.length > 0
            ? Object.keys(data[0]).map((key) => ({
              key,
              label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
              sortable: true,
            }))
            : [];

        return (
          <DataPreview
            key={collectionName}
            title={`Collection: ${collectionName}`}
            data={data}
            columns={columns}
            isLoading={false}
          />
        );
      })}
    </div>
  );
};

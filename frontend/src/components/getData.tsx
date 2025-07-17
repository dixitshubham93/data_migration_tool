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
  }, [sourceConnection]);

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
            isLoading={loading}
          />
        );
      })}
    </div>
  );
};

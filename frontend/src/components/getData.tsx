import React, { useEffect, useState } from 'react';
import { DataPreview } from './DataPreview';
import { DatabaseConnection } from '../types/database';

interface Props {
  sourceConnection: DatabaseConnection;
}

import { BASE_URL } from '../utils/api';

/**
 * Fetches a preview of each collection using the new paginated API:
 *  1. POST /migrate/collections  → get collection names
 *  2. POST /migrate/preview      → get first page of each collection
 *
 * Renders each collection in a DataPreview table.
 */
export const DataPreviewContainer: React.FC<Props> = ({ sourceConnection }) => {
  const [dataMap, setDataMap] = useState<{ [collection: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch only when the real connection target changes
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
      setError(null);
      setDataMap({});

      try {
        // Step 1 — get collection list for the selected database
        const colRes = await fetch(`${BASE_URL}/migrate/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: sourceConnection }),
          credentials: 'include',
        });

        const colJson = await colRes.json();
        if (!colRes.ok || !colJson.success) {
          setError(colJson.message ?? 'Failed to fetch collections');
          return;
        }

        const collections: string[] = colJson.data?.collections ?? [];
        if (collections.length === 0) {
          setDataMap({});
          return;
        }

        // Step 2 — fetch first page (10 rows) of each collection in parallel
        const previews = await Promise.all(
          collections.map(async (collection) => {
            try {
              const res = await fetch(`${BASE_URL}/migrate/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  source: sourceConnection,
                  collection,
                  pageSize: 10,
                }),
                credentials: 'include',
              });
              const json = await res.json();
              const docs = json?.data?.documents ?? [];
              return [collection, docs] as [string, any[]];
            } catch {
              return [collection, []] as [string, any[]];
            }
          })
        );

        // Filter out collections with 0 docs (truly empty)
        const result = Object.fromEntries(previews.filter(([, docs]) => docs.length > 0));
        setDataMap(result);
      } catch (err: any) {
        console.error('Preview failed:', err);
        setError('Could not load data preview. Check the console for details.');
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-red-500">
        <p className="text-lg font-medium">Preview failed</p>
        <p className="text-sm mt-1">{error}</p>
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

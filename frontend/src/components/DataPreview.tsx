import React from 'react';
import { Table } from 'lucide-react';

interface DataPreviewProps {
  title: string;
  data: any[];
  className?: string;
}

const DataPreview: React.FC<DataPreviewProps> = ({ title, data, className = '' }) => {
  return (
    <div className={`${className} border rounded-lg border-gray-200`}>
      <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-gray-50">
        <div className="flex items-center space-x-2">
          <Table className="h-5 w-5 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
        <span className="text-sm text-gray-500">{data.length} rows</span>
      </div>
      <div className="p-4">
        {data.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">Connect to database to preview data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th
                      key={key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Object.values(row).map((value: any, j) => (
                      <td
                        key={j}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataPreview;
import { DataRow, TableColumn } from '../types/database';

export const mockColumns: TableColumn[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'created_at', label: 'Created At', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export const mockData: DataRow[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Admin',
    created_at: '2024-01-15T10:30:00Z',
    status: 'Active',
    id_: 1,
    name_: 'John Doe',
    email_: 'john.doe@example.com',
    role_: 'Admin',
    created_at_: '2024-01-15T10:30:00Z',
    status_: 'Active',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'User',
    created_at: '2024-01-16T14:22:00Z',
    status: 'Active',
    id_: 1,
    name_: 'John Doe',
    email_: 'john.doe@example.com',
    role_: 'Admin',
    created_at_: '2024-01-15T10:30:00Z',
    status_: 'Active',
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    role: 'Moderator',
    created_at: '2024-01-17T09:15:00Z',
    status: 'Inactive',
    id_: 1,
    name_: 'John Doe',
    email_: 'john.doe@example.com',
    role_: 'Admin',
    created_at_: '2024-01-15T10:30:00Z',
    status_: 'Active',
  },
  {
    id: 4,
    name: 'Alice Williams',
    email: 'alice.williams@example.com',
    role: 'User',
    created_at: '2024-01-18T16:45:00Z',
    status: 'Active',
    id_: 1,
    name_: 'John Doe',
    email_: 'john.doe@example.com',
    role_: 'Admin',
    created_at_: '2024-01-15T10:30:00Z',
    status_: 'Active',
  },
  {
    id: 5,
    name: 'Charlie Brown',
    email: 'charlie.brown@example.com',
    role: 'User',
    created_at: '2024-01-19T11:20:00Z',
    status: 'Pending',
    id_: 1,
    name_: 'John Doe',
    email_: 'john.doe@example.com',
    role_: 'Admin',
    created_at_: '2024-01-15T10:30:00Z',
    status_: 'Active',
  },
  {
    id: 6,
    name: 'Diana Prince',
    email: 'diana.prince@example.com',
    role: 'Admin',
    created_at: '2024-01-20T13:10:00Z',
    status: 'Active',
    id_: 1,
    name_: 'John Doe',
    email_: 'john.doe@example.com',
    role_: 'Admin',
    created_at_: '2024-01-15T10:30:00Z',
    status_: 'Active',
  },
  {
    id: 7,
    name: 'Edward Norton',
    email: 'edward.norton@example.com',
    role: 'User',
    created_at: '2024-01-21T08:35:00Z',
    status: 'Active',
    id_: 1,
    name_: 'John Doe',
    email_: 'john.doe@example.com',
    role_: 'Admin',
    created_at_: '2024-01-15T10:30:00Z',
    status_: 'Active',
  },
  {
    id: 8,
    name: 'Fiona Green',
    email: 'fiona.green@example.com',
    role: 'Moderator',
    created_at: '2024-01-22T15:50:00Z',
    status: 'Inactive',
    id_: 1,
    name_: 'John Doe',
    email_: 'john.doe@example.com',
    role_: 'Admin',
    created_at_: '2024-01-15T10:30:00Z',
    status_: 'Active',
  },
  
];

// export const generateMockData = (count: number = 50): DataRow[] => {
//   const roles = ['Admin', 'User', 'Moderator'];
//   const statuses = ['Active', 'Inactive', 'Pending'];
//   const names = [
//     'Alex Johnson', 'Sam Wilson', 'Jordan Lee', 'Taylor Swift', 'Morgan Freeman',
//     'Casey Adams', 'Riley Cooper', 'Avery Davis', 'Parker Evans', 'Quinn Foster'
//   ];
  
//   return Array.from({ length: count }, (_, index) => ({
//     id: index + 9,
//     name: names[index % names.length] + ` ${Math.floor(index / names.length) + 1}`,
//     email: `user${index + 9}@example.com`,
//     role: roles[Math.floor(Math.random() * roles.length)],
//     created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
//     status: statuses[Math.floor(Math.random() * statuses.length)],
//     id_: index + 9,
//     name_: names[index % names.length] + ` ${Math.floor(index / names.length) + 1}`,
//     email_: `user${index + 9}@example.com`,
//     role_: roles[Math.floor(Math.random() * roles.length)],
//     created_at_: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
//     status_: statuses[Math.floor(Math.random() * statuses.length)]
//   }));
// };

export const getAllMockData = (): DataRow[] => {
  return [...mockData];
};
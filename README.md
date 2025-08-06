# Data Migration Tool
[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/dixitshubham93/data_migration_tool)

A full-stack application designed to facilitate seamless data migration from a MongoDB source to a MySQL target. The tool provides a user-friendly interface to configure, preview, and execute the migration process.

The core migration engine automatically infers a relational schema from schemaless MongoDB documents, handles nested objects and arrays by creating normalized tables, and intelligently manages data insertion.

## Features

- **Dual Database Support**: Connect to a MongoDB source and a MySQL target.
- **Connection Testing**: Validate source and target database credentials before migration.
- **Data Preview**: Inspect data from source MongoDB collections directly in the UI before committing to the migration.
- **Automated Schema Inference**: Intelligently creates a MySQL schema by analyzing MongoDB documents and inferring appropriate SQL data types (`VARCHAR`, `DOUBLE`, `BOOLEAN`, `JSON`, etc.).
- **Normalization of Nested Data**: Automatically handles nested objects and arrays by creating separate, linked tables in MySQL to maintain data integrity and relational structure.
- **Relationship Detection**: Infers foreign key relationships between collections based on `Id` field naming conventions.
- **Interactive UI**: A clean, modern frontend built with React, TypeScript, and TailwindCSS to guide the user through the migration process.
- **Real-time Feedback**: Visual indicators for connection status and migration progress.

## Tech Stack

- **Backend**:
  - **Framework**: Node.js, Express.js
  - **Database Drivers**: `mongodb`, `mysql2`
  - **Environment**: `dotenv`, `cors`
- **Frontend**:
  - **Framework/Library**: React, TypeScript, Vite
  - **Styling**: TailwindCSS
  - **Icons**: `lucide-react`
- **Development**:
  - **Linting/Formatting**: ESLint, Prettier
  - **Dev Server**: `nodemon` (backend), Vite (frontend)

## How It Works

The migration logic is the core of this application. When a migration is initiated:

1.  **Connection**: The backend establishes a connection to both the source MongoDB database and the target MySQL server.
2.  **Database Creation**: It creates the target database in MySQL if it doesn't already exist, using the name of the source MongoDB database.
3.  **Schema Inference**: For each collection in MongoDB, the tool:
    - Samples a subset of documents to analyze their structure.
    - Infers an appropriate SQL data type for each field.
    - Identifies nested objects and arrays which require normalization.
4.  **Table Creation**:
    - A primary table is created in MySQL corresponding to the MongoDB collection.
    - Nested objects and arrays are moved into their own separate tables. A foreign key (`<parent_table>_ref_id`) is added to link them back to the primary record, effectively normalizing the data.
5.  **Data Transfer**:
    - The tool iterates through all documents in the source collection.
    - Each document is flattened and transformed into a format suitable for SQL insertion.
    - Data is inserted into the corresponding primary and nested tables in MySQL.
    - The process handles dynamic schema changes by adding new columns to a table if they are discovered in documents processed later.

## Getting Started

### Prerequisites

- Node.js (v16.20.1 or higher)
- npm (Node Package Manager)
- An accessible MongoDB instance (source)
- An accessible MySQL instance (target)

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/dixitshubham93/data_migration_tool.git
    cd data_migration_tool
    ```

2.  **Set up the Backend:**
    - Navigate to the backend directory: `cd backend`
    - Install dependencies:
      ```sh
      npm install
      ```
    - Create a `.env` file in the `backend` directory and add the following variables:
      ```env
      PORT=8000
      FRONTEND_URL=http://localhost:5173
      ```
    - Start the backend server:
      ```sh
      npm run server
      ```
      The server will be running on `http://localhost:8000`.

3.  **Set up the Frontend:**
    - Navigate to the frontend directory: `cd ../frontend`
    - Install dependencies:
      ```sh
      npm install
      ```
    - Create a `.env` file in the `frontend` directory and add the backend URL:
      ```env
      VITE_BACKEND_URL=http://localhost:8000/
      ```
    - Start the frontend development server:
      ```sh
      npm run dev
      ```
      The application will be accessible at `http://localhost:5173`.

## Usage

1.  Open your browser and navigate to `http://localhost:5173`.
2.  **Configure Source**: Fill in the connection details for your source MongoDB database and click "Test Connection".
3.  **Configure Target**: Fill in the connection details for your target MySQL database and click "Test Connection".
4.  **Preview Data**: Once both connections are successful, click the "Preview Data" button. This will fetch data from your MongoDB collections and display them in tables.
5.  **Start Migration**: After reviewing the data, scroll down to the "Migration Progress" section and click "Start Migration".
6.  The UI will show the migration status. Once completed, your data will be available in the target MySQL database.

## API Endpoints

The backend exposes the following REST API endpoints under the `/migrate` prefix:

-   `POST /migrate/check`: Tests a given database connection configuration.
    -   **Body**: `{ "data": DatabaseConnection }`
-   `POST /migrate/start`: Initiates the full data migration process.
    -   **Body**: `{ "data": { "source": DatabaseConnection, "target": DatabaseConnection } }`
-   `POST /migrate/data`: Fetches sample data from the source database for the UI preview.
    -   **Body**: `{ "data": DatabaseConnection }`

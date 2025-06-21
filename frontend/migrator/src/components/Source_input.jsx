import React, { useState } from 'react';
import axios from 'axios';

export const Source_input = () => {
  const [formData, setFormData] = useState({
    protocol: '',
    username: '',
    password: '',
    host: '',
    port: '',
    database: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // console.log(formData);
    const postData = {
      source: { ...formData },
      filter: {},
      target: {},
    };
    try {
        console.log(postData);
      const response = await axios.post('/api/migrate/start', postData, {
        headers: { 'Content-Type': 'application/json' }, 
      }    
    );
    console.log("request chali gai") 
      alert('Connection Successful: ' + response.data.message);
    } catch (error) {
      alert('Connection Failed: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="flex-1">
      <div className="text-xl text-center">Source</div>
      <div className="flex justify-center items-center bg-gray-100">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-center">Database Connection</h2>
          {Object.entries(formData).map(([key, value]) => (
            <div className="mb-4" key={key}>
              <label className="block text-gray-700 font-medium mb-1">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</label>
              <input
                type={key === 'password' ? 'password' : 'text'}
                name={key}
                value={value}
                onChange={handleChange}
                placeholder={`Enter ${key}`}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition">
            Connect
          </button>
        </form>
      </div>
    </div>
  );
};

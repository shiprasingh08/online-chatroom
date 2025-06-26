'use client';
import React, { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    // TODO: Add authentication logic here
    setError('');
    alert(`Welcome, ${username}!`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br bg-white">
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="bg-gray-100 p-8 rounded-lg shadow-lg  w-full max-w-md">
          <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Login to Chat Room</h2>
          {error && <div className="mb-4 text-red-500 text-center">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="w-full text-black px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="w-full text-black px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="w-full text-black px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="role">Role</label>
              <select
                id="role"
                className="w-full text-black px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                defaultValue="user"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition duration-200"
            >
              Login
            </button>
          </form>
        </div>
      </div>
      
    </div>
  );
}

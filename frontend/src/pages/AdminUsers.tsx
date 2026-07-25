import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface User {
  id: number;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('mill_floor');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/users', { email: newEmail, password: newPassword, role: newRole });
      setSuccess('User created successfully');
      setNewEmail('');
      setNewPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-lg font-semibold mb-4">Create New User</h2>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}
        <form onSubmit={handleCreateUser} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input type="email" required className="w-full p-2 border rounded" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input type="password" required className="w-full p-2 border rounded" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Role</label>
            <select className="w-full p-2 border rounded" value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="mill_floor">Mill Floor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="bg-brand text-white px-6 py-2 rounded hover:bg-brand-dark">Create User</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 text-gray-500">{user.id}</td>
                <td className="p-4 font-medium">{user.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4 text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

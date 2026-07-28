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

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('mill_floor');
  const [editPassword, setEditPassword] = useState('');

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

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword('');
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPassword('');
  };

  const saveEdit = async (id: number) => {
    setError('');
    setSuccess('');
    try {
      const payload: Record<string, string> = { email: editEmail, role: editRole };
      if (editPassword) payload.password = editPassword;
      await api.put(`/users/${id}`, payload);
      setSuccess('User updated successfully');
      setEditingId(null);
      setEditPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-lg font-semibold mb-4">Create New User</h2>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}
        <form onSubmit={handleCreateUser} className="flex flex-col sm:flex-row gap-4 sm:items-end">
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
          <button type="submit" className="bg-brand text-white px-6 py-2 rounded hover:bg-brand-dark h-fit">Create User</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto w-full max-w-full">
        <table className="w-full text-left min-w-[650px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">New Password</th>
              <th className="p-4">Created At</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const isEditing = editingId === user.id;
              return (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 text-gray-500">{user.id}</td>
                  <td className="p-4 font-medium">
                    {isEditing ? (
                      <input type="email" className="w-full p-1 border rounded" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                    ) : (
                      user.email
                    )}
                  </td>
                  <td className="p-4">
                    {isEditing ? (
                      <select className="w-full p-1 border rounded" value={editRole} onChange={e => setEditRole(e.target.value)}>
                        <option value="mill_floor">Mill Floor</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {isEditing ? (
                      <input type="password" placeholder="Leave blank to keep current" className="w-full p-1 border rounded" value={editPassword} onChange={e => setEditPassword(e.target.value)} />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    {isEditing ? (
                      <div className="flex gap-3">
                        <button onClick={() => saveEdit(user.id)} className="text-green-600 hover:text-green-800 text-sm font-medium">Save</button>
                        <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(user)} className="text-brand hover:underline text-sm font-medium">Edit</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

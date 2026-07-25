import React, { useState, useEffect } from 'react';
import api from '../api/axios';

interface MasterItem {
  id: number;
  name: string;
  is_active: boolean;
}

const CATEGORIES = [
  { id: 'products', label: 'Products' },
  { id: 'salesmen', label: 'Salesmen' },
  { id: 'expenses', label: 'Expense Heads' },
  { id: 'locations', label: 'Locations' },
  { id: 'bag_types', label: 'Bag Types' }
];

export default function AdminMasterData() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchItems = async () => {
    try {
      const res = await api.get(`/master/${activeCategory}`);
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeCategory]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post(`/master/${activeCategory}`, { name: newItemName });
      setSuccess('Item added successfully');
      setNewItemName('');
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add item');
    }
  };

  const toggleActive = async (item: MasterItem) => {
    try {
      await api.put(`/master/${activeCategory}/${item.id}`, {
        name: item.name,
        is_active: !item.is_active
      });
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Master Data Management</h1>
      
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              activeCategory === cat.id 
                ? 'bg-brand text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-lg font-semibold mb-4">Add New {CATEGORIES.find(c => c.id === activeCategory)?.label}</h2>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}
        
        <form onSubmit={handleCreate} className="flex gap-4 items-end max-w-md">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input 
              type="text" 
              required 
              className="w-full p-2 border rounded" 
              value={newItemName} 
              onChange={e => setNewItemName(e.target.value)} 
            />
          </div>
          <button type="submit" className="bg-brand text-white px-6 py-2 rounded hover:bg-brand-dark">Add</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 w-20">ID</th>
              <th className="p-4">Name</th>
              <th className="p-4 w-32">Status</th>
              <th className="p-4 w-32">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 text-gray-500">{item.id}</td>
                <td className="p-4 font-medium">{item.name}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => toggleActive(item)}
                    className={`text-sm ${item.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                  >
                    {item.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

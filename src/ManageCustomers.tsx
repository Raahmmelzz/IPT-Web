// src/ManageCustomers.tsx
import React, { useState, useEffect } from 'react';
import type { Customer } from './types';
import { customerAPI } from './api';

const ManageCustomers: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ name: '', username: '', email: '', number: '' });

    const loadCustomers = async () => {
        try {
            const res = await customerAPI.getCustomers();
            setCustomers(res.data);
        } catch (err) {
            console.error("Error loading customers:", err);
        }
    };

    useEffect(() => { loadCustomers(); }, []);

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure? This might delete associated orders!")) {
            try {
                await customerAPI.deleteCustomer(id);
                loadCustomers();
            } catch (err) {
                console.error("Error deleting customer:", err);
                alert("Failed to delete customer.");
            }
        }
    };

    const handleSave = async (id: number) => {
        try {
            await customerAPI.updateCustomer(id, editForm);
            setEditingId(null);
            loadCustomers();
        } catch (err) {
            console.error("Error updating customer:", err);
            alert("Failed to update customer. Username or email might be taken.");
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-2xl shadow-xl mt-8">


            <h3 className="text-xl font-bold mb-6 text-slate-800">Customer Database</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-slate-600 uppercase text-sm leading-normal">
                            <th className="py-3 px-6 font-bold">ID</th>
                            <th className="py-3 px-6 font-bold">Name</th>
                            <th className="py-3 px-6 font-bold">Username</th>
                            <th className="py-3 px-6 font-bold">Email</th>
                            <th className="py-3 px-6 font-bold">Number</th>
                            <th className="py-3 px-6 font-bold text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700 text-sm font-light">
                        {customers.map(c => (
                            <tr key={c.customerid} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="py-4 px-6 font-medium">{c.customerid}</td>
                                
                                <td className="py-4 px-6">
                                    {editingId === c.customerid ? (
                                        <input className="px-2 py-1 border rounded w-full" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                                    ) : c.name}
                                </td>
                                
                                <td className="py-4 px-6">
                                    {editingId === c.customerid ? (
                                        <input className="px-2 py-1 border rounded w-full" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} />
                                    ) : c.username}
                                </td>
                                
                                <td className="py-4 px-6">
                                    {editingId === c.customerid ? (
                                        <input className="px-2 py-1 border rounded w-full" type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                                    ) : c.email}
                                </td>

                                <td className="py-4 px-6">
                                    {editingId === c.customerid ? (
                                        <input className="px-2 py-1 border rounded w-full" value={editForm.number} onChange={e => setEditForm({...editForm, number: e.target.value})} />
                                    ) : c.number}
                                </td>

                                <td className="py-4 px-6 text-center flex justify-center gap-2">
                                    {editingId === c.customerid ? (
                                        <>
                                            <button onClick={() => handleSave(c.customerid!)} className="bg-green-500 text-white px-3 py-1 rounded-lg font-bold">Save</button>
                                            <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-3 py-1 rounded-lg font-bold">Cancel</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => {
                                                setEditingId(c.customerid!);
                                                setEditForm({ name: c.name, username: c.username, email: c.email, number: c.number });
                                            }} className="bg-indigo-500 text-white px-4 py-1 rounded-lg font-bold hover:bg-indigo-600">Edit</button>
                                            <button onClick={() => handleDelete(c.customerid!)} className="bg-red-500 text-white px-4 py-1 rounded-lg font-bold hover:bg-red-600">Delete</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageCustomers;
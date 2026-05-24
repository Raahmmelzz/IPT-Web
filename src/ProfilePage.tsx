import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom'; 
import type { Customer, Invoice, Product } from './types';
import { customerAPI, invoiceAPI, productAPI } from './api';

interface ProfilePageProps {
    loggedInCustomer: Customer | null;
    onLogout: () => void;
    onCustomerUpdate: (updated: Customer) => void;
}

type Tab = 'overview' | 'orders' | 'settings';

const ProfilePage: React.FC<ProfilePageProps> = ({
    loggedInCustomer,
    onLogout,
    onCustomerUpdate,
}) => {
    const navigate = useNavigate();
    const location = useLocation(); 

    // ✅ THE ULTIMATE FIX: 1. Check prop -> 2. Check router state -> 3. Check LocalStorage
    const activeCustomer = loggedInCustomer || location.state?.customer || (() => {
        const saved = localStorage.getItem('customer_data');
        try { return saved ? JSON.parse(saved) : null; } catch { return null; }
    })();

    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [products, setProducts] = useState<Record<number, Product>>({});
    const [loadingOrders, setLoadingOrders] = useState(true);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        name: activeCustomer?.name || '',
        email: activeCustomer?.email || '',
        number: activeCustomer?.number || '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeCustomer?.customerid) return;
        const formData = new FormData();
        formData.append('profile_picture', file);
        setIsUploadingAvatar(true);
        try {
            const res = await customerAPI.uploadAvatar(activeCustomer.customerid, formData);
            localStorage.setItem('customer_data', JSON.stringify(res.data));
            onCustomerUpdate(res.data);
        } catch { alert('Could not upload photo.'); }
        finally { setIsUploadingAvatar(false); e.target.value = ''; }
    };

    useEffect(() => {
        if (!activeCustomer) {
            navigate('/');
        } else {
            setEditData({
                name: activeCustomer.name,
                email: activeCustomer.email,
                number: activeCustomer.number,
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCustomer?.customerid]);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!activeCustomer) return;
            setLoadingOrders(true);
            try {
                const [invRes, prodRes] = await Promise.all([
                    invoiceAPI.getInvoices(),
                    productAPI.getProducts(),
                ]);
                const myInvoices = invRes.data.filter((inv: Invoice) => Number(inv.customer) === Number(activeCustomer.customerid));
                const productMap: Record<number, Product> = {};
                prodRes.data.forEach((p: Product) => { if (p.productid != null) productMap[p.productid] = p; });
                setInvoices(myInvoices);
                setProducts(productMap);
            } catch (e) { console.error(e); } finally { setLoadingOrders(false); }
        };
        fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCustomer?.customerid]);

    const totalSpent = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
    const avatarColor = ['from-indigo-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-orange-500 to-rose-600'][(activeCustomer?.customerid || 0) % 3];

    const handleSaveProfile = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!activeCustomer?.customerid || isSaving) return;
        setIsSaving(true);
        try {
            const res = await customerAPI.updateCustomer(activeCustomer.customerid, editData);
            
            // ✅ Keep LocalStorage updated with the new name/details!
            localStorage.setItem('customer_data', JSON.stringify(res.data));
            
            onCustomerUpdate(res.data);
            setSaveSuccess(true);
            setIsEditing(false);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) { alert("Save failed."); } finally { setIsSaving(false); }
    };

    // ✅ Bulletproof Logout
    const handleSignOut = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('customer_data');
        if (onLogout) onLogout();
        navigate('/');
    };

    if (!activeCustomer) return <div className="min-h-screen bg-slate-900" />;

    return (
        <div className="min-h-screen w-full bg-slate-900 font-sans overflow-x-hidden flex flex-col">
            <div className="w-full bg-slate-900/50 backdrop-blur-xl border-b border-white/5 py-4 sm:py-6 px-4 sm:px-12 flex justify-between items-center text-white sticky top-0 z-50">
                <button type="button" onClick={() => navigate('/')} className="font-black text-white/60 hover:text-indigo-400 transition-all flex items-center gap-2 group text-sm sm:text-lg">
                    <span className="text-xl group-hover:-translate-x-2 transition-transform">←</span>
                    <span className="hidden sm:inline">BACK TO STORE</span>
                    <span className="sm:hidden">Back</span>
                </button>
                <div className="flex items-center gap-2 sm:gap-4">
                    <h1 className="font-black text-sm sm:text-2xl tracking-[0.1em] sm:tracking-[0.3em] uppercase italic opacity-40">Profile</h1>
                    <div className="h-6 w-[2px] bg-white/10 mx-1 sm:mx-2" />
                    <button type="button" onClick={handleSignOut} className="text-red-400 font-black text-xs uppercase tracking-widest hover:text-red-300">Sign Out</button>
                </div>
            </div>

            <main className="flex-1 w-full flex flex-col">
                <div className="relative h-40 sm:h-64 lg:h-80 w-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 overflow-hidden">
                    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                    <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-900 to-transparent" />
                </div>

                <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-8 lg:px-12 -mt-12 sm:-mt-20 lg:-mt-32 relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-10 mb-6 sm:mb-12">
                        <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            {activeCustomer.profile_picture ? (
                                <img src={activeCustomer.profile_picture!} alt="avatar"
                                    className="w-20 h-20 sm:w-36 sm:h-36 lg:w-56 lg:h-56 rounded-3xl sm:rounded-[40px] lg:rounded-[50px] object-cover shadow-[0_15px_40px_rgba(0,0,0,0.5)] border-4 sm:border-8 lg:border-[16px] border-slate-900" />
                            ) : (
                                <div className={`w-20 h-20 sm:w-36 sm:h-36 lg:w-56 lg:h-56 rounded-3xl sm:rounded-[40px] lg:rounded-[50px] bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-4xl sm:text-6xl lg:text-8xl font-black shadow-[0_15px_40px_rgba(0,0,0,0.5)] border-4 sm:border-8 lg:border-[16px] border-slate-900`}>
                                    {getInitials(activeCustomer.name)}
                                </div>
                            )}
                            <div className="absolute inset-0 rounded-3xl sm:rounded-[40px] lg:rounded-[50px] bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                {isUploadingAvatar
                                    ? <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <span className="text-3xl sm:text-5xl">📷</span>
                                }
                            </div>
                            <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-7 h-7 sm:w-10 sm:h-10 bg-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-900 text-sm sm:text-lg">📷</div>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        <div className="sm:pb-8 flex-1">
                            <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black text-white tracking-tighter leading-none mb-2 sm:mb-4">{activeCustomer.name}</h2>
                            <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
                                <span className="bg-indigo-500/20 text-indigo-400 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-black text-xs sm:text-sm tracking-widest uppercase border border-indigo-500/30">Verified Member</span>
                                <span className="text-white/40 font-bold text-sm sm:text-xl">@{activeCustomer.username}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4 sm:gap-8 mb-10 sm:mb-16">
                        <div className="col-span-12 md:col-span-4 space-y-4 sm:space-y-8">
                            {/* Tab Navigation */}
                            <div className="bg-slate-800/40 border border-white/5 p-2 sm:p-3 rounded-3xl sm:rounded-[40px] flex flex-row md:flex-col gap-2">
                                {(['overview', 'orders', 'settings'] as Tab[]).map((t) => (
                                    <button key={t} type="button" onClick={() => setActiveTab(t)}
                                        className={`flex-1 md:flex-none py-3 sm:py-6 rounded-2xl sm:rounded-[32px] text-xs sm:text-sm font-black transition-all uppercase tracking-[0.1em] sm:tracking-[0.2em] flex items-center justify-center md:justify-between px-4 sm:px-10 ${
                                            activeTab === t ? 'bg-indigo-600 text-white shadow-2xl scale-[1.02]' : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}>
                                        {t} {activeTab === t && <span className="hidden md:inline">→</span>}
                                    </button>
                                ))}
                            </div>
                            {/* Stat Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4">
                                <div className="bg-slate-800/40 border border-white/5 rounded-3xl sm:rounded-[35px] p-4 sm:p-8 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">Orders</p>
                                        <p className="text-2xl sm:text-3xl font-black text-indigo-400">{invoices.length}</p>
                                    </div>
                                    <span className="text-3xl sm:text-4xl opacity-20">📦</span>
                                </div>
                                <div className="bg-slate-800/40 border border-white/5 rounded-3xl sm:rounded-[35px] p-4 sm:p-8 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">Spent</p>
                                        <p className="text-xl sm:text-3xl font-black text-purple-400">₱{totalSpent.toLocaleString()}</p>
                                    </div>
                                    <span className="text-3xl sm:text-4xl opacity-20">💳</span>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-12 md:col-span-8 bg-slate-800/20 border border-white/5 rounded-3xl sm:rounded-[50px] p-5 sm:p-8 lg:p-12 min-h-[400px] sm:min-h-[600px] backdrop-blur-sm relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                {activeTab === 'overview' && (
                                    <motion.div key="overview" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6 sm:space-y-12">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                                            <DetailCard label="Registered Email" value={activeCustomer.email} icon="📧" />
                                            <DetailCard label="Contact Number" value={`+63 ${activeCustomer.number}`} icon="📞" />
                                            <DetailCard label="Active Orders" value={invoices.length} icon="🚚" />
                                            <DetailCard label="Account Status" value="Gold Member" icon="👑" />
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'orders' && (
                                    <motion.div key="orders" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4 sm:space-y-6">
                                        <h3 className="text-lg sm:text-2xl font-black text-white uppercase italic tracking-tighter mb-4 sm:mb-8">Purchase History</h3>
                                        {loadingOrders ? (
                                            <p className="text-white/20 animate-pulse font-bold">Loading...</p>
                                        ) : invoices.length === 0 ? (
                                            <p className="text-white/30">No orders found.</p>
                                        ) : (
                                            <div className="grid gap-3 sm:gap-4 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2">
                                                {invoices.map(inv => (
                                                    <div key={inv.invoiceid} className="bg-slate-900/60 p-4 sm:p-8 rounded-2xl sm:rounded-[35px] border border-white/5 flex justify-between items-center group">
                                                        <div>
                                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Invoice #{inv.invoiceid}</p>
                                                            <p className="text-xl sm:text-3xl font-black text-white">₱{Number(inv.total).toLocaleString()}</p>
                                                            <p className="text-xs text-white/40 mt-1">{new Date(inv.date!).toLocaleDateString()}</p>
                                                        </div>
                                                        <span className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${inv.is_paid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                            {inv.is_paid ? 'SUCCESS' : 'PENDING'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === 'settings' && (
                                    <motion.div key="settings" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-10 max-w-2xl">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-4 sm:pb-6">
                                            <h3 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tighter italic">Edit Credentials</h3>
                                            {!isEditing && <button type="button" onClick={() => setIsEditing(true)} className="bg-white text-slate-900 px-5 sm:px-8 py-2 sm:py-3 rounded-2xl font-black text-xs uppercase tracking-widest">Edit Mode</button>}
                                        </div>
                                        <div className="space-y-5 sm:space-y-8">
                                            {['name', 'email', 'number'].map((key) => (
                                                <div key={key}>
                                                    <label className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] block mb-2 sm:mb-4">{key}</label>
                                                    {isEditing ? (
                                                        <input className="w-full bg-slate-900/50 border border-white/10 rounded-2xl sm:rounded-[25px] px-5 sm:px-8 py-4 sm:py-6 font-black text-white text-base sm:text-xl focus:border-indigo-500 outline-none transition-all"
                                                            value={editData[key as keyof typeof editData]}
                                                            onChange={e => setEditData(p => ({...p, [key]: e.target.value}))} />
                                                    ) : (
                                                        <p className="font-black text-white text-xl sm:text-3xl opacity-90 break-all">{editData[key as keyof typeof editData] || '—'}</p>
                                                    )}
                                                </div>
                                            ))}
                                            {isEditing && (
                                                <div className="flex gap-3 sm:gap-4 pt-6 sm:pt-10">
                                                    <button type="button" onClick={handleSaveProfile} disabled={isSaving} className="flex-1 bg-indigo-600 text-white py-4 sm:py-6 rounded-2xl sm:rounded-[30px] font-black text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] hover:bg-indigo-500 active:scale-95 transition-all">
                                                        {isSaving ? 'Processing...' : 'Apply Changes'}
                                                    </button>
                                                    <button type="button" onClick={() => setIsEditing(false)} className="px-6 sm:px-12 bg-slate-800 text-white/50 py-4 sm:py-6 rounded-2xl sm:rounded-[30px] font-black text-sm uppercase">Cancel</button>
                                                </div>
                                            )}
                                            {saveSuccess && <p className="text-emerald-400 font-black text-sm uppercase tracking-widest mt-4 sm:mt-6 animate-pulse">✓ Changes Synced Successfully</p>}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const DetailCard = ({ label, value, icon }: any) => (
    <div className="bg-slate-900/40 p-4 sm:p-6 lg:p-10 rounded-2xl sm:rounded-[30px] lg:rounded-[40px] border border-white/5 flex items-center gap-4 sm:gap-6 lg:gap-8 group hover:bg-slate-900/60 transition-all min-w-0">
        <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl sm:rounded-[20px] lg:rounded-[25px] bg-slate-800 flex-shrink-0 flex items-center justify-center text-xl sm:text-2xl lg:text-3xl shadow-inner group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-1 sm:mb-2 truncate">{label}</p>
            <p className="text-sm sm:text-lg lg:text-2xl font-black text-white group-hover:text-indigo-400 transition-colors break-all leading-tight">
                {value || '—'}
            </p>
        </div>
    </div>
);

export default ProfilePage;
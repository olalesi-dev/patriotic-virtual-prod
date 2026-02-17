"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Mail, Phone, MapPin, MoreHorizontal, UserPlus, X, MessageSquare, Clock, Search, Filter, Trash2, ArrowUpDown, Edit } from 'lucide-react';

// --- Types ---
interface Contact {
    id: number;
    name: string;
    role: string;
    email: string;
    phone: string;
    location: string;
    avatar: string;
    color: string;
    bio?: string;
    availability?: string;
    tags?: string[];
}

// --- Mock Data ---
const CONTACTS_DATA: Contact[] = [
    {
        id: 1,
        name: 'Dr. Emily Stones',
        role: 'Cardiologist',
        email: 'emily.stones@example.com',
        phone: '+1 (555) 123-4567',
        location: 'New York, NY',
        avatar: 'ES',
        color: 'bg-emerald-100 text-emerald-700',
        bio: 'Specialist in interventional cardiology with over 15 years of experience.',
        availability: 'Mon-Thu, 9am - 4pm',
        tags: ['Heart', 'Surgery']
    },
    {
        id: 2,
        name: 'Dr. Mark Ranson',
        role: 'Neurologist',
        email: 'mark.ranson@example.com',
        phone: '+1 (555) 987-6543',
        location: 'Boston, MA',
        avatar: 'MR',
        color: 'bg-blue-100 text-blue-700',
        bio: 'Focuses on neurodegenerative diseases and migraine management.',
        availability: 'Tue-Fri, 10am - 6pm',
        tags: ['Brain', 'Research']
    },
    {
        id: 3,
        name: 'Nurse Sarah Jenkins',
        role: 'Head Nurse',
        email: 'sarah.jenkins@example.com',
        phone: '+1 (555) 456-7890',
        location: 'Chicago, IL',
        avatar: 'SJ',
        color: 'bg-purple-100 text-purple-700',
        bio: 'Coordination of patient care services and nursing staff management.',
        availability: 'Mon-Fri, 7am - 3pm',
        tags: ['Care', 'Management']
    },
    {
        id: 4,
        name: 'Lab Tech Mike',
        role: 'Laboratory',
        email: 'mike.lab@example.com',
        phone: '+1 (555) 222-3333',
        location: 'San Francisco, CA',
        avatar: 'ML',
        color: 'bg-amber-100 text-amber-700',
        bio: 'Expert in clinical pathology and diagnostic testing.',
        availability: 'On Call',
        tags: ['Lab', 'Diagnostics']
    },
    {
        id: 5,
        name: 'Dr. John Ray',
        role: 'Radiology',
        email: 'john.ray@example.com',
        phone: '+1 (555) 777-8888',
        location: 'Houston, TX',
        avatar: 'JR',
        color: 'bg-slate-100 text-slate-700',
        bio: 'Specialized in diagnostic imaging and X-ray interpretation.',
        availability: 'Mon-Fri, 8am - 5pm',
        tags: ['X-Ray', 'MRI', 'CT']
    },
];

export default function ContactsPage() {
    // --- State ---
    const [contacts, setContacts] = useState<Contact[]>(CONTACTS_DATA);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from local storage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('emr_contacts');
            if (saved) {
                try {
                    setContacts(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to parse contacts", e);
                }
            }
            setIsLoaded(true);
        }
    }, []);

    // Save to local storage whenever contacts change
    useEffect(() => {
        if (isLoaded && typeof window !== 'undefined') {
            localStorage.setItem('emr_contacts', JSON.stringify(contacts));
        }
    }, [contacts, isLoaded]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null); // For Profile
    const [messageTarget, setMessageTarget] = useState<Contact | null>(null); // For Message

    // Filter & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'role'>('name');
    const [roleFilter, setRoleFilter] = useState<string>('All');

    // Menu State
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

    // --- Derived Data ---
    const roles = useMemo(() => ['All', ...Array.from(new Set(contacts.map(c => c.role)))], [contacts]);

    const filteredContacts = useMemo(() => {
        let result = contacts.filter(c =>
            (roleFilter === 'All' || c.role === roleFilter) &&
            (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.role.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        return result.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'role') return a.role.localeCompare(b.role);
            return 0;
        });
    }, [contacts, searchQuery, roleFilter, sortBy]);

    // --- Handlers ---
    const handleSaveContact = (contactData: any) => {
        if (editingContact) {
            // Edit existing contact
            setContacts(contacts.map(c => c.id === editingContact.id ? { ...c, ...contactData } : c));
            setEditingContact(null);
        } else {
            // Add new contact
            const newContact = {
                ...contactData,
                id: contacts.length > 0 ? Math.max(...contacts.map(c => c.id)) + 1 : 1, // Simple ID generation
                avatar: getInitials(contactData.name),
                color: getRandomColor()
            };
            setContacts([...contacts, newContact]);
        }
        setIsAddModalOpen(false);
    };

    const handleEditContact = (contact: Contact) => {
        setEditingContact(contact);
        setIsAddModalOpen(true);
        setActiveMenuId(null);
    };

    const handleSendMessage = (message: string) => {
        alert(`Message sent to ${messageTarget?.name}:\n\n"${message}"`);
        setMessageTarget(null);
    };

    const handleDeleteContact = (id: number) => {
        if (confirm("Are you sure you want to delete this contact?")) {
            setContacts(contacts.filter(c => c.id !== id));
            setActiveMenuId(null);
        }
    };

    const toggleMenu = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const getRandomColor = () => {
        const colors = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-teal-100 text-teal-700', 'bg-indigo-100 text-indigo-700'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Professional Contacts</h2>
                    <p className="text-slate-500 text-sm">Manage your network of healthcare professionals.</p>
                </div>
                <button
                    onClick={() => { setEditingContact(null); setIsAddModalOpen(true); }}
                    className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-600 transition-colors shadow-sm whitespace-nowrap"
                >
                    <UserPlus className="w-4 h-4" /> Add Contact
                </button>
            </div>

            {/* FILTERS & SEARCH */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, role, or email..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="appearance-none pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand focus:border-brand outline-none cursor-pointer"
                        >
                            {roles.map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'name' | 'role')}
                            className="appearance-none pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand focus:border-brand outline-none cursor-pointer"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="role">Sort by Role</option>
                        </select>
                        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* CONTACTS GRID */}
            {filteredContacts.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <UserPlus className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p>No contacts found matching your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredContacts.map(contact => (
                        <div key={contact.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
                            {/* Avatar & Actions */}
                            <div className="flex justify-between items-start mb-4 relative z-0">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${contact.color}`}>
                                    {contact.avatar}
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={(e) => toggleMenu(contact.id, e)}
                                        className={`p-1 rounded transition-colors ${activeMenuId === contact.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>

                                    {/* DROPDOWN MENU */}
                                    {activeMenuId === contact.id && (
                                        <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-75 overflow-hidden">
                                            <button onClick={(e) => { e.stopPropagation(); handleEditContact(contact); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors border-b border-slate-50">
                                                <Edit className="w-4 h-4" /> Edit
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <h3 className="font-bold text-lg text-slate-900 mb-1">{contact.name}</h3>
                            <p className="text-brand font-medium text-sm mb-4 bg-indigo-50 inline-block px-2 py-0.5 rounded-md self-start">{contact.role}</p>

                            <div className="space-y-2 text-sm text-slate-600 flex-1">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <a href={`mailto:${contact.email}`} className="hover:text-brand hover:underline truncate">{contact.email}</a>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span>{contact.phone}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    <span>{contact.location}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
                                <button
                                    onClick={() => setMessageTarget(contact)}
                                    className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-brand-50 hover:text-brand hover:border-brand-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-4 h-4" /> Message
                                </button>
                                <button
                                    onClick={() => setSelectedContact(contact)}
                                    className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    Profile
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODALS */}
            {isAddModalOpen && <AddContactModal onClose={() => setIsAddModalOpen(false)} onSave={handleSaveContact} initialData={editingContact} />}
            {selectedContact && <ProfileModal contact={selectedContact} onClose={() => setSelectedContact(null)} onMessage={() => { setMessageTarget(selectedContact); setSelectedContact(null); }} />}
            {messageTarget && <MessageModal contact={messageTarget} onClose={() => setMessageTarget(null)} onSend={handleSendMessage} />}
        </div>
    );
}

// --- Sub-Components ---

function AddContactModal({ onClose, onSave, initialData }: any) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        role: initialData?.role || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        location: initialData?.location || '',
        bio: initialData?.bio || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">{initialData ? 'Edit Contact' : 'Add New Contact'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                            <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none" placeholder="e.g. Dr. John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Role / Specialty</label>
                            <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none" placeholder="e.g. Cardiologist" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                        <input required type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none" placeholder="email@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                            <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                            <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none" placeholder="City, State" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Bio / Notes</label>
                        <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none h-20 resize-none" placeholder="Short bio..." value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })}></textarea>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-brand text-white font-bold text-sm rounded-lg hover:bg-brand-600 shadow-md">{initialData ? 'Save Changes' : 'Save Contact'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ProfileModal({ contact, onClose, onMessage }: any) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
                {/* Header with background */}
                <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-full text-white backdrop-blur-md transition-colors"><X className="w-4 h-4" /></button>
                </div>

                {/* Avatar */}
                <div className="px-6 relative">
                    <div className={`w-20 h-20 rounded-full border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold -mt-10 ${contact.color} bg-white`}>
                        {contact.avatar}
                    </div>
                </div>

                <div className="p-6 pt-2">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{contact.name}</h3>
                            <p className="text-brand font-medium text-sm">{contact.role}</p>
                        </div>
                        <button onClick={onMessage} className="bg-brand text-white p-2 rounded-full shadow-lg hover:scale-105 transition-transform">
                            <MessageSquare className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 leading-relaxed">
                            {contact.bio || "No bio available."}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-slate-700">
                                <Mail className="w-4 h-4 text-slate-400" /> {contact.email}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-700">
                                <Phone className="w-4 h-4 text-slate-400" /> {contact.phone}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-700">
                                <MapPin className="w-4 h-4 text-slate-400" /> {contact.location}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-700">
                                <Clock className="w-4 h-4 text-slate-400" /> {contact.availability || "Standard Hours"}
                            </div>
                        </div>

                        {contact.tags && (
                            <div className="flex gap-2 pt-2">
                                {contact.tags.map((tag: string) => (
                                    <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function MessageModal({ contact, onClose, onSend }: any) {
    const [msg, setMsg] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${contact.color}`}>
                            {contact.avatar}
                        </div>
                        <h3 className="font-bold text-slate-800">Message to {contact.name}</h3>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <textarea
                        className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none resize-none"
                        placeholder="Type your message here..."
                        autoFocus
                        value={msg}
                        onChange={e => setMsg(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancel</button>
                        <button onClick={() => onSend(msg)} className="px-6 py-2 bg-brand text-white font-bold text-sm rounded-lg hover:bg-brand-600 shadow-md flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> Send Message
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

const fs = require('fs');

const p1 = 'emr-portal/src/app/(provider)/admin/users/PageClient.tsx';
let t1 = fs.readFileSync(p1, 'utf8');

// 1. Add Lucide imports
t1 = t1.replace(
    /import \{\s*Users, Search, Shield, User,\s*/,
    'import {\n    Users, Search, Shield, User,\n    ArrowUpDown, ArrowUp, ArrowDown,\n'
);

// 2. Add Sort State
const sortStateStr = 
`    const [filterRole, setFilterRole] = useState<string | null>(null);

    const [sortCol, setSortCol] = useState<'name' | 'role' | 'created'>('created');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');`;
t1 = t1.replace(/const \[filterRole, setFilterRole\] = useState<string \| null>\(null\);/, sortStateStr);

// 3. Add Sort Algorithm
const filteredUsersSrc = 
`    const filteredUsers = users.filter(user => {
        const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
        const role = user.role?.toLowerCase() || '';
        const matchesRole = !filterRole ||
            (filterRole === 'disabled' ? user.disabled :
                filterRole === 'admin' ? ['admin', 'systems admin'].includes(role) :
                    filterRole === 'provider' ? ['doctor', 'provider'].includes(role) :
                        role === filterRole);
        return matchesSearch && matchesRole;
    });`;
const sortedStr = 
`    const filteredUsersRaw = users.filter(user => {
        const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
        const role = user.role?.toLowerCase() || '';
        const matchesRole = !filterRole ||
            (filterRole === 'disabled' ? user.disabled :
                filterRole === 'admin' ? ['admin', 'systems admin'].includes(role) :
                    filterRole === 'provider' ? ['doctor', 'provider'].includes(role) :
                        role === filterRole);
        return matchesSearch && matchesRole;
    });

    const filteredUsers = [...filteredUsersRaw].sort((a, b) => {
        let valA = '';
        let valB = '';
        if (sortCol === 'name') {
            valA = (a.displayName || a.email || '').toLowerCase();
            valB = (b.displayName || b.email || '').toLowerCase();
        } else if (sortCol === 'role') {
            valA = (a.role || '').toLowerCase();
            valB = (b.role || '').toLowerCase();
        } else if (sortCol === 'created') {
            valA = a.creationTime || '0';
            valB = b.creationTime || '0';
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });`;
t1 = t1.replace(filteredUsersSrc, sortedStr);

// 4. Update the thead row!
const theadOrig = 
`                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Created</th>`;

const theadNew = 
`                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => { setSortDir(sortCol === 'name' && sortDir === 'asc' ? 'desc' : 'asc'); setSortCol('name'); }}>
                                        <div className="flex items-center gap-2">User {sortCol === 'name' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUpDown className="w-3 h-3 opacity-30"/>}</div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => { setSortDir(sortCol === 'role' && sortDir === 'asc' ? 'desc' : 'asc'); setSortCol('role'); }}>
                                        <div className="flex items-center gap-2">Role {sortCol === 'role' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUpDown className="w-3 h-3 opacity-30"/>}</div>
                                    </th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => { setSortDir(sortCol === 'created' && sortDir === 'asc' ? 'desc' : 'asc'); setSortCol('created'); }}>
                                        <div className="flex items-center gap-2">Created {sortCol === 'created' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUpDown className="w-3 h-3 opacity-30"/>}</div>
                                    </th>`;
t1 = t1.replace(theadOrig, theadNew);

// 5. Update Roles Option to include Staff in create & edit mapping
t1 = t1.replace(/<option value="admin">Systems Administrator<\/option>/g, '<option value="admin">Systems Administrator</option>\n                                    <option value="staff">Staff</option>');

// 6. Update getRoleBadge
const getRoleBadgeOrig = 
`            case 'provider':
                return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">Provider</span>;
            default:`;
const getRoleBadgeNew = 
`            case 'provider':
                return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">Provider</span>;
            case 'staff':
                return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Staff</span>;
            default:`;
t1 = t1.replace(getRoleBadgeOrig, getRoleBadgeNew);

fs.writeFileSync(p1, t1);
console.log("Done updating PageClient.tsx");

"use client";

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
    type VisibilityState
} from '@tanstack/react-table';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Filter,
    Plus,
    Save,
    Search,
    Settings2,
    Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthUser } from '@/hooks/useAuthUser';
import { apiFetchJson } from '@/lib/api-client';
import NewPatientRegistration from '@/components/patient/NewPatientRegistration';
import type { PatientRegistryFacetOption, PatientRegistryResponse, PatientRegistryRow } from '@/lib/patient-registry-types';

const VIEW_STORAGE_KEY = 'provider_patients_registry_view_v2';

const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
    select: true,
    patient: true,
    contact: true,
    serviceLine: true,
    tags: true,
    status: true,
    teams: true,
    lastActivityAt: true
};

const DEFAULT_PAGE_SIZE = 25;

function formatDate(value: string | null): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(parsed);
}

function formatRelative(value: string | null): string {
    if (!value) return 'No recent activity';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'No recent activity';

    const diffMs = Date.now() - parsed.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < minute) return 'just now';
    if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
    if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
    return formatDate(value);
}

function parseSavedView() {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as {
            query?: string;
            statuses?: string[];
            teamIds?: string[];
            tags?: string[];
            pageSize?: number;
            sorting?: SortingState;
            columnVisibility?: VisibilityState;
        };
    } catch {
        return null;
    }
}

export default function PatientsClient() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const patientIdParam = searchParams.get('id');
    const { user: activeUser, isReady } = useAuthUser();

    const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
    const [isNewPatientOpen, setIsNewPatientOpen] = React.useState(false);
    const [searchInput, setSearchInput] = React.useState('');
    const deferredSearch = React.useDeferredValue(searchInput);
    const [statusFilters, setStatusFilters] = React.useState<string[]>([]);
    const [teamFilters, setTeamFilters] = React.useState<string[]>([]);
    const [tagFilters, setTagFilters] = React.useState<string[]>([]);
    const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'patient', desc: false }]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(DEFAULT_COLUMN_VISIBILITY);
    const [showColumnPanel, setShowColumnPanel] = React.useState(false);
    const [cursorStack, setCursorStack] = React.useState<Array<string | null>>([null]);
    const [pageIndex, setPageIndex] = React.useState(0);
    const [viewLoaded, setViewLoaded] = React.useState(false);

    const currentCursor = cursorStack[pageIndex] ?? null;
    const activeSort = sorting[0];
    const sortField = activeSort?.id === 'lastActivityAt'
        ? 'lastActivityAt'
        : activeSort?.id === 'status'
            ? 'statusLabel'
            : 'name';
    const sortDir = activeSort?.desc ? 'desc' : 'asc';

    React.useEffect(() => {
        const saved = parseSavedView();
        if (saved) {
            setSearchInput(saved.query ?? '');
            setStatusFilters(saved.statuses ?? []);
            setTeamFilters(saved.teamIds ?? []);
            setTagFilters(saved.tags ?? []);
            setPageSize(saved.pageSize ?? DEFAULT_PAGE_SIZE);
            setSorting(saved.sorting?.length ? saved.sorting : [{ id: 'patient', desc: false }]);
            setColumnVisibility(saved.columnVisibility ?? DEFAULT_COLUMN_VISIBILITY);
        }
        setViewLoaded(true);
    }, []);

    React.useEffect(() => {
        if (!viewLoaded) return;
        React.startTransition(() => {
            setCursorStack([null]);
            setPageIndex(0);
            setRowSelection({});
        });
    }, [deferredSearch, pageSize, sortField, sortDir, statusFilters, teamFilters, tagFilters, viewLoaded]);

    const patientQueryKey = React.useMemo(() => [
        'patients',
        activeUser?.uid ?? 'anonymous',
        deferredSearch.trim(),
        statusFilters,
        teamFilters,
        tagFilters,
        pageSize,
        sortField,
        sortDir,
        currentCursor
    ] as const, [
        activeUser?.uid,
        currentCursor,
        deferredSearch,
        pageSize,
        sortDir,
        sortField,
        statusFilters,
        tagFilters,
        teamFilters
    ]);

    const fetchPatients = React.useCallback(async (cursor: string | null) => {
        if (!activeUser) {
            throw new Error('Please sign in to view patients.');
        }

        const params = new URLSearchParams();
        if (deferredSearch.trim()) params.set('q', deferredSearch.trim());
        statusFilters.forEach((status) => params.append('status', status));
        teamFilters.forEach((teamId) => params.append('teamId', teamId));
        tagFilters.forEach((tag) => params.append('tag', tag));
        params.set('pageSize', String(pageSize));
        params.set('sortField', sortField);
        params.set('sortDir', sortDir);
        if (cursor) params.set('cursor', cursor);

        const payload = await apiFetchJson<PatientRegistryResponse>(`/api/patients/list?${params.toString()}`, {
            method: 'GET',
            user: activeUser,
            cache: 'no-store'
        });

        if (!payload.success) {
            throw new Error(payload.error || 'Failed to load patients.');
        }

        return payload;
    }, [activeUser, deferredSearch, pageSize, sortDir, sortField, statusFilters, tagFilters, teamFilters]);

    const patientsQuery = useQuery({
        queryKey: patientQueryKey,
        enabled: viewLoaded && isReady && Boolean(activeUser),
        queryFn: () => fetchPatients(currentCursor),
        placeholderData: keepPreviousData
    });

    React.useEffect(() => {
        const nextCursor = patientsQuery.data?.nextCursor;
        if (!nextCursor || !activeUser) return;

        const nextQueryKey = [
            'patients',
            activeUser.uid,
            deferredSearch.trim(),
            statusFilters,
            teamFilters,
            tagFilters,
            pageSize,
            sortField,
            sortDir,
            nextCursor
        ] as const;

        void queryClient.prefetchQuery({
            queryKey: nextQueryKey,
            queryFn: () => fetchPatients(nextCursor)
        });
    }, [
        activeUser,
        deferredSearch,
        fetchPatients,
        pageSize,
        patientsQuery.data?.nextCursor,
        queryClient,
        sortDir,
        sortField,
        statusFilters,
        tagFilters,
        teamFilters
    ]);

    const rows = React.useMemo(
        () => patientsQuery.data?.patients ?? [],
        [patientsQuery.data?.patients]
    );
    const facets = patientsQuery.data?.facets ?? {
        statuses: [],
        teams: [],
        tags: []
    };
    const nextCursor = patientsQuery.data?.nextCursor ?? null;
    const totalCount = patientsQuery.data?.totalCount ?? 0;
    const loading = !isReady || patientsQuery.isLoading;
    const error = patientsQuery.error instanceof Error
        ? patientsQuery.error.message
        : (activeUser || !isReady ? null : 'Please sign in to view patients.');

    React.useEffect(() => {
        if (!patientIdParam) return;
        router.replace(`/patients/${patientIdParam}`);
    }, [patientIdParam, router]);

    const saveView = React.useCallback(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify({
            query: searchInput,
            statuses: statusFilters,
            teamIds: teamFilters,
            tags: tagFilters,
            pageSize,
            sorting,
            columnVisibility
        }));
        toast.success('Patient table view saved.');
    }, [columnVisibility, pageSize, searchInput, sorting, statusFilters, tagFilters, teamFilters]);

    const resetFilters = React.useCallback(() => {
        setSearchInput('');
        setStatusFilters([]);
        setTeamFilters([]);
        setTagFilters([]);
        setSorting([{ id: 'patient', desc: false }]);
        setPageSize(DEFAULT_PAGE_SIZE);
        setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
        setCursorStack([null]);
        setPageIndex(0);
        setRowSelection({});
    }, []);

    const handleOpenPatient = React.useCallback((patient: PatientRegistryRow) => {
        router.push(`/patients/${patient.id}`);
    }, [router]);

    const handleNewPatientComplete = React.useCallback(() => {
        setIsNewPatientOpen(false);
        if (activeUser) {
            setCursorStack([null]);
            setPageIndex(0);
            void queryClient.invalidateQueries({
                queryKey: ['patients', activeUser.uid]
            });
        }
    }, [activeUser, queryClient]);

    const columns = React.useMemo<ColumnDef<PatientRegistryRow>[]>(() => [
        {
            id: 'select',
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                    aria-label="Select all patients on this page"
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                    aria-label={`Select ${row.original.name}`}
                    onClick={(event) => event.stopPropagation()}
                />
            ),
            enableSorting: false
        },
        {
            id: 'patient',
            accessorFn: (row) => row.name,
            header: 'Patient',
            cell: ({ row }) => {
                const patient = row.original;
                return (
                    <div className="space-y-1">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                handleOpenPatient(patient);
                            }}
                            className="text-left text-sm font-bold text-brand hover:underline"
                        >
                            {patient.name}
                        </button>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>MRN: {patient.mrn}</span>
                            <span>DOB: {patient.dob ?? '—'}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            id: 'contact',
            header: 'Contact',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="space-y-1 text-sm text-slate-600">
                    <div>{row.original.email ?? 'No email'}</div>
                    <div className="text-xs text-slate-500">{row.original.phone ?? 'No phone'}</div>
                </div>
            )
        },
        {
            accessorKey: 'serviceLine',
            header: 'Service Line'
        },
        {
            id: 'tags',
            header: 'Tags',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-2">
                    {row.original.tags.length > 0 ? row.original.tags.map((tag) => (
                        <span key={tag.label} className={`rounded-full px-2 py-0.5 text-xs font-bold ${tag.color}`}>
                            {tag.label}
                        </span>
                    )) : <span className="text-xs text-slate-400">None</span>}
                </div>
            )
        },
        {
            id: 'status',
            accessorFn: (row) => row.statusLabel,
            header: 'Status',
            cell: ({ row }) => (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${row.original.statusColor}`}>
                    {row.original.statusLabel}
                </span>
            )
        },
        {
            id: 'teams',
            accessorFn: (row) => row.teams.map((team) => team.name).join(', '),
            header: 'Assigned Team',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-2">
                    {row.original.teams.length > 0 ? row.original.teams.map((team) => (
                        <span key={team.id} className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
                            {team.name}
                        </span>
                    )) : <span className="text-xs text-slate-400">Unassigned</span>}
                </div>
            )
        },
        {
            id: 'lastActivityAt',
            accessorFn: (row) => row.lastActivityAt ?? '',
            header: 'Last Activity',
            cell: ({ row }) => (
                <div className="space-y-1 text-sm text-slate-600">
                    <div>{formatRelative(row.original.lastActivityAt)}</div>
                    <div className="text-xs text-slate-500">{formatDate(row.original.lastActivityAt)}</div>
                </div>
            )
        }
    ], [handleOpenPatient]);

    const table = useReactTable({
        data: rows,
        columns,
        state: {
            sorting,
            rowSelection,
            columnVisibility
        },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
        manualSorting: true
    });

    return (
        <div className="relative flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-8 py-6">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-slate-900">Patients</h1>
                                <p className="text-sm text-slate-500">
                                    Only patients linked to your appointments, messages, or teams are listed here.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1">{totalCount} provider-scoped patients</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">{Object.keys(rowSelection).length} selected</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowColumnPanel((current) => !current)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                            <Settings2 className="h-4 w-4" />
                            Show
                        </button>
                        <button
                            type="button"
                            onClick={saveView}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                            <Save className="h-4 w-4" />
                            Save View
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsNewPatientOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
                        >
                            <Plus className="h-4 w-4" />
                            New patient
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.5fr),repeat(3,minmax(0,1fr)),auto]">
                    <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search name, MRN, DOB, phone, email, or patient ID..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
                        />
                    </label>

                    <FacetFilter
                        label="Status"
                        options={facets.statuses}
                        selected={statusFilters}
                        onToggle={(value) => toggleFacet(value, statusFilters, setStatusFilters)}
                    />
                    <FacetFilter
                        label="Team"
                        options={facets.teams}
                        selected={teamFilters}
                        onToggle={(value) => toggleFacet(value, teamFilters, setTeamFilters)}
                    />
                    <FacetFilter
                        label="Tags"
                        options={facets.tags}
                        selected={tagFilters}
                        onToggle={(value) => toggleFacet(value, tagFilters, setTagFilters)}
                    />

                    <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                        <Filter className="h-4 w-4" />
                        Reset
                    </button>
                </div>

                {showColumnPanel && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Visible Columns</div>
                        <div className="flex flex-wrap gap-3">
                            {table.getAllLeafColumns()
                                .filter((column) => column.id !== 'select')
                                .map((column) => (
                                    <label key={column.id} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                                        <input
                                            type="checkbox"
                                            checked={column.getIsVisible()}
                                            onChange={column.getToggleVisibilityHandler()}
                                            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                                        />
                                        <span>{column.columnDef.header as string}</span>
                                    </label>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto bg-slate-50">
                {error ? (
                    <div className="m-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                        {error}
                    </div>
                ) : null}

                <table className="min-w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className="border-b border-slate-200 px-6 py-4">
                                        {header.isPlaceholder ? null : (
                                            header.column.getCanSort() ? (
                                                <button
                                                    type="button"
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className="inline-flex items-center gap-2 font-black"
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
                                                </button>
                                            ) : (
                                                flexRender(header.column.columnDef.header, header.getContext())
                                            )
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                        {loading ? (
                            <tr>
                                <td colSpan={table.getVisibleLeafColumns().length} className="px-6 py-20 text-center">
                                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand" />
                                    <p className="mt-4 text-sm font-medium text-slate-500">Loading provider patient registry...</p>
                                </td>
                            </tr>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={table.getVisibleLeafColumns().length} className="px-6 py-20 text-center">
                                    <div className="space-y-3">
                                        <p className="text-base font-bold text-slate-800">No patients match the current filters.</p>
                                        <p className="text-sm text-slate-500">Adjust the filters or reset the saved view.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    onClick={() => handleOpenPatient(row.original)}
                                    className="cursor-pointer transition hover:bg-slate-50"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-6 py-4 align-top">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-200 bg-white px-8 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span>Page {pageIndex + 1}</span>
                    <span>Showing {rows.length} of {totalCount}</span>
                    <label className="inline-flex items-center gap-2">
                        <span>Rows</span>
                        <select
                            value={pageSize}
                            onChange={(event) => setPageSize(Number(event.target.value))}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
                        >
                            {[10, 25, 50].map((size) => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                        disabled={pageIndex === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (!nextCursor) return;
                            setCursorStack((current) => {
                                const next = current.slice(0, pageIndex + 1);
                                next.push(nextCursor);
                                return next;
                            });
                            setPageIndex((current) => current + 1);
                        }}
                        disabled={!nextCursor}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {isNewPatientOpen && (
                <NewPatientRegistration
                    onClose={() => setIsNewPatientOpen(false)}
                    onComplete={handleNewPatientComplete}
                />
            )}
        </div>
    );
}

function toggleFacet(
    value: string,
    selected: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
) {
    setter((current) => current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value]);
}

function FacetFilter({
    label,
    options,
    selected,
    onToggle
}: {
    label: string;
    options: PatientRegistryFacetOption[];
    selected: string[];
    onToggle: (value: string) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className={`inline-flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition ${selected.length > 0
                    ? 'border-brand bg-brand-50 text-brand'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
            >
                <span>{label}{selected.length > 0 ? ` (${selected.length})` : ''}</span>
                <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full z-20 mt-2 max-h-72 w-full min-w-[240px] overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    {options.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-slate-400">No options available</div>
                    ) : options.map((option) => (
                        <label key={option.value} className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 hover:bg-slate-50">
                            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option.value)}
                                    onChange={() => onToggle(option.value)}
                                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                                />
                                {option.label}
                            </span>
                            <span className="text-xs font-bold text-slate-400">{option.count}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

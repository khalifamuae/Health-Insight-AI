import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useTranslation } from "react-i18next";

interface UserProfile {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    subscriptionPlan: string;
    isAdmin: boolean;
    createdAt: string;
}

interface UsersResponse {
    users: UserProfile[];
    total: number;
    page: number;
    totalPages: number;
}

export default function AdminUsers() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const { t } = useTranslation();

    const { data, isLoading } = useQuery<UsersResponse>({
        queryKey: ["/api/admin/users", page, search],
        queryFn: async () => {
            const qs = new URLSearchParams({
                page: page.toString(),
                limit: "10",
                ...(search ? { search } : {})
            });
            const res = await fetch(`/api/admin/users?${qs.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch users");
            return res.json();
        },
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">{t("adminUsers")}</h1>
                        <p className="text-neutral-400 mt-1 text-sm">{t("adminUsersDesc")}</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                    <form onSubmit={handleSearch} className="flex gap-3 max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                            <Input
                                placeholder="Search by name, email, or phone..."
                                className="pl-9 bg-neutral-950 border-neutral-800 text-white w-full"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        </div>
                        <Button type="submit" variant="secondary" className="bg-gold-500 text-black hover:bg-gold-600">
                            Search
                        </Button>
                        {search && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setSearch("");
                                    setSearchInput("");
                                    setPage(1);
                                }}
                                className="text-neutral-400 hover:text-white"
                            >
                                Clear
                            </Button>
                        )}
                    </form>
                </div>

                {/* Data Table */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-neutral-950">
                                <TableRow className="border-neutral-800 hover:bg-transparent">
                                    <TableHead className="text-neutral-400 font-medium">User</TableHead>
                                    <TableHead className="text-neutral-400 font-medium hidden md:table-cell">Contact</TableHead>
                                    <TableHead className="text-neutral-400 font-medium">Plan</TableHead>
                                    <TableHead className="text-neutral-400 font-medium hidden lg:table-cell">Joined</TableHead>
                                    <TableHead className="text-neutral-400 font-medium text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i} className="border-neutral-800">
                                            <TableCell colSpan={5} className="h-16">
                                                <div className="animate-pulse flex space-x-4">
                                                    <div className="rounded-full bg-neutral-800 h-10 w-10"></div>
                                                    <div className="flex-1 space-y-2 py-1">
                                                        <div className="h-4 bg-neutral-800 rounded w-3/4"></div>
                                                        <div className="h-4 bg-neutral-800 rounded w-1/2"></div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : data?.users.length === 0 ? (
                                    <TableRow className="border-neutral-800 hover:bg-transparent">
                                        <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.users.map((user) => (
                                        <TableRow key={user.id} className="border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0">
                                                        <User className="h-5 w-5 text-neutral-400" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white flex items-center gap-2">
                                                            {user.firstName} {user.lastName}
                                                            {user.isAdmin && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                                    ADMIN
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-neutral-500 sm:hidden mt-0.5">{user.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <div className="text-sm text-neutral-300">{user.email}</div>
                                                <div className="text-xs text-neutral-500">{user.phone || 'No phone'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${user.subscriptionPlan === 'free' ? 'bg-neutral-800/50 text-neutral-400 border-neutral-700' :
                                                    user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'premium' ? 'bg-gold-500/10 text-gold-400 border-gold-500/30' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                    }`}>
                                                    {user.subscriptionPlan.toUpperCase()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-neutral-400 text-sm">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white hover:bg-neutral-800">
                                                    View details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {data && data.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800 bg-neutral-950">
                            <div className="text-sm text-neutral-400">
                                Showing <span className="font-medium text-white">{(page - 1) * 10 + 1}</span> to <span className="font-medium text-white">{Math.min(page * 10, data.total)}</span> of <span className="font-medium text-white">{data.total}</span> users
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-sm text-neutral-400 font-medium px-2">
                                    {page} / {data.totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                                    disabled={page === data.totalPages}
                                    className="bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

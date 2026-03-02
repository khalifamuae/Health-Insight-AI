import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, Link as LinkIcon, DollarSign, Wallet } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface Referral {
    id: string;
    referrerId: string;
    referredUserId: string;
    status: string;
    createdAt: string;
}

interface Withdrawal {
    id: string;
    userId: string;
    userEmail: string | null;
    amount: string;
    status: string;
    paymentMethod: string;
    paymentDetails: React.ReactNode;
    processedAt: string | null;
    createdAt: string;
}

export default function AdminAffiliates() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("withdrawals");
    const [page, setPage] = useState(1);
    const { t } = useTranslation();

    const { data: withdrawalsData, isLoading: isLoadingWithdrawals } = useQuery<{ data: Withdrawal[], totalPages: number }>({
        queryKey: ["/api/admin/affiliates/withdrawals", page],
        queryFn: async () => {
            const res = await fetch(`/api/admin/affiliates/withdrawals?page=${page}&limit=10`);
            if (!res.ok) throw new Error("Failed to fetch withdrawals");
            return res.json();
        },
        enabled: activeTab === "withdrawals"
    });

    const { data: referralsData, isLoading: isLoadingReferrals } = useQuery<{ data: Referral[], totalPages: number }>({
        queryKey: ["/api/admin/affiliates/referrals", page],
        queryFn: async () => {
            const res = await fetch(`/api/admin/affiliates/referrals?page=${page}&limit=10`);
            if (!res.ok) throw new Error("Failed to fetch referrals");
            return res.json();
        },
        enabled: activeTab === "referrals"
    });

    const updateWithdrawalMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const res = await fetch(`/api/admin/affiliates/withdrawals/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates/withdrawals"] });
            toast({ title: "Withdrawal updated successfully", variant: "default" });
        },
        onError: () => {
            toast({ title: "Failed to update withdrawal", variant: "destructive" });
        }
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
            case 'active':
                return <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" /> {status}</span>;
            case 'rejected':
                return <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-fit"><XCircle className="h-3 w-3" /> {status}</span>;
            case 'pending':
            case 'processing':
                return <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit"><Clock className="h-3 w-3" /> {status}</span>;
            default:
                return <span className="px-2 py-1 rounded text-xs font-medium bg-neutral-800 text-neutral-400 w-fit">{status}</span>;
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{t("adminAffiliates")}</h1>
                    <p className="text-neutral-400 mt-1 text-sm">{t("adminAffiliatesDesc")}</p>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="w-full">
                    <TabsList className="bg-neutral-900 border border-neutral-800 p-1 w-full max-w-md">
                        <TabsTrigger value="withdrawals" className="flex-1 data-[state=active]:bg-neutral-800 data-[state=active]:text-white">
                            <Wallet className="h-4 w-4 mr-2" />
                            Withdrawal Requests
                        </TabsTrigger>
                        <TabsTrigger value="referrals" className="flex-1 data-[state=active]:bg-neutral-800 data-[state=active]:text-white">
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Referral Network
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="withdrawals" className="mt-6">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-neutral-950">
                                        <TableRow className="border-neutral-800 hover:bg-transparent">
                                            <TableHead className="text-neutral-400 font-medium">User</TableHead>
                                            <TableHead className="text-neutral-400 font-medium">Amount</TableHead>
                                            <TableHead className="text-neutral-400 font-medium">Method & Details</TableHead>
                                            <TableHead className="text-neutral-400 font-medium">Status</TableHead>
                                            <TableHead className="text-neutral-400 font-medium">Date requested</TableHead>
                                            <TableHead className="text-neutral-400 font-medium text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingWithdrawals ? (
                                            <TableRow className="border-neutral-800 hover:bg-transparent">
                                                <TableCell colSpan={6} className="h-32 text-center text-neutral-500">Loading withdrawals...</TableCell>
                                            </TableRow>
                                        ) : withdrawalsData?.data.length === 0 ? (
                                            <TableRow className="border-neutral-800 hover:bg-transparent">
                                                <TableCell colSpan={6} className="h-32 text-center text-neutral-500">No withdrawal requests found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            withdrawalsData?.data.map((req) => (
                                                <TableRow key={req.id} className="border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                                                    <TableCell className="font-medium text-white">
                                                        {req.userEmail || req.userId.substring(0, 8) + '...'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center font-bold text-gold-400 text-lg">
                                                            <DollarSign className="h-4 w-4 mr-0.5" />
                                                            {parseFloat(req.amount).toFixed(2)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm text-neutral-300 font-medium capitalize">{req.paymentMethod}</div>
                                                        <div className="text-xs text-neutral-500 border border-neutral-800 bg-neutral-950 p-1.5 rounded mt-1 max-w-[200px] truncate" title={String(req.paymentDetails)}>
                                                            {JSON.stringify(req.paymentDetails).replace(/"/g, '')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                                                    <TableCell className="text-sm text-neutral-400">
                                                        {format(new Date(req.createdAt), "MMM d, yyyy")}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {req.status === 'pending' || req.status === 'processing' ? (
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => updateWithdrawalMutation.mutate({ id: req.id, status: 'completed' })}
                                                                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                                                                >
                                                                    Approve & Paid
                                                                </Button>
                                                                <Button
                                                                    size="sm" variant="ghost"
                                                                    onClick={() => updateWithdrawalMutation.mutate({ id: req.id, status: 'rejected' })}
                                                                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-neutral-500">
                                                                {req.processedAt ? `Processed ${format(new Date(req.processedAt), "MMM d")}` : '-'}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="referrals" className="mt-6">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-neutral-950">
                                        <TableRow className="border-neutral-800 hover:bg-transparent">
                                            <TableHead className="text-neutral-400 font-medium">Referrer (Brought user)</TableHead>
                                            <TableHead className="text-neutral-400 font-medium">Referee (New user)</TableHead>
                                            <TableHead className="text-neutral-400 font-medium">Status</TableHead>
                                            <TableHead className="text-neutral-400 font-medium text-right">Date Connected</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingReferrals ? (
                                            <TableRow className="border-neutral-800 hover:bg-transparent">
                                                <TableCell colSpan={4} className="h-32 text-center text-neutral-500">Loading referrals network...</TableCell>
                                            </TableRow>
                                        ) : referralsData?.data.length === 0 ? (
                                            <TableRow className="border-neutral-800 hover:bg-transparent">
                                                <TableCell colSpan={4} className="h-32 text-center text-neutral-500">No referral activity found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            referralsData?.data.map((ref) => (
                                                <TableRow key={ref.id} className="border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                                                    <TableCell className="font-medium text-white">
                                                        UID: <span className="text-gold-400 text-xs font-mono">{ref.referrerId}</span>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-neutral-300">
                                                        UID: <span className="text-blue-400 text-xs font-mono">{ref.referredUserId}</span>
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(ref.status)}</TableCell>
                                                    <TableCell className="text-right text-sm text-neutral-400">
                                                        {format(new Date(ref.createdAt), "MMM d, yyyy")}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}

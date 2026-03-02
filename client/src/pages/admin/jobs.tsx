import { useState } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Settings, Server, RefreshCw, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

// Types
interface JobLog {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    userId: string;
    result: any;
    createdAt: string;
    updatedAt: string;
}

export default function AdminJobs() {
    const [page, setPage] = useState(1);
    const { t } = useTranslation();

    // For this placeholder we will safely handle 0 items
    const { data, isLoading } = useQuery<{ data: JobLog[], totalPages: number }>({
        queryKey: ["/api/admin/jobs", page],
        queryFn: async () => {
            // Return a simulated response since we haven't built the backend endpoints yet
            return { data: [], totalPages: 1 };
        }
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'processing': return <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />;
            default: return <Clock className="h-4 w-4 text-neutral-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Success</span>;
            case 'failed':
                return <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">Failed</span>;
            case 'processing':
                return <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Processing</span>;
            default:
                return <span className="px-2 py-1 rounded text-xs font-medium bg-neutral-800 text-neutral-400 capitalize">{status}</span>;
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6 max-w-6xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{t("adminJobsLogs")}</h1>
                    <p className="text-neutral-400 mt-1 text-sm bg-black">{t("adminJobsDesc")}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-neutral-400">Active Workers</CardTitle>
                            <Server className="h-4 w-4 text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">4</div>
                            <p className="text-xs text-neutral-500 mt-1">Healthy</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-neutral-400">Total Background Jobs</CardTitle>
                            <Activity className="h-4 w-4 text-neutral-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">1,208</div>
                            <p className="text-xs text-neutral-500 mt-1">+140 from last week</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-neutral-400">Failed Jobs</CardTitle>
                            <XCircle className="h-4 w-4 text-red-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">0</div>
                            <p className="text-xs text-green-500 mt-1">100% Success Rate</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="bg-neutral-900 flex flex-col border border-neutral-800 rounded-lg overflow-hidden">
                    {/* Title bar */}
                    <div className="p-4 border-b border-neutral-800 flex items-center gap-3">
                        <Settings className="w-5 h-5 text-neutral-400" />
                        <h2 className="text-lg font-medium text-white">Recent Job Executions</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-neutral-950">
                                <TableRow className="border-neutral-800 hover:bg-transparent">
                                    <TableHead className="text-neutral-400 font-medium">Job Type</TableHead>
                                    <TableHead className="text-neutral-400 font-medium">Target User</TableHead>
                                    <TableHead className="text-neutral-400 font-medium">Status</TableHead>
                                    <TableHead className="text-neutral-400 font-medium text-right">Date Executed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow className="border-neutral-800 hover:bg-transparent">
                                        <TableCell colSpan={4} className="h-32 text-center text-neutral-500">
                                            Loading task runner logs...
                                        </TableCell>
                                    </TableRow>
                                ) : (data?.data.length || 0) === 0 ? (
                                    <TableRow className="border-neutral-800 hover:bg-transparent">
                                        <TableCell colSpan={4} className="h-32 text-center text-neutral-500">
                                            No background jobs recorded in the system.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.data.map((job) => (
                                        <TableRow key={job.id} className="border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {getStatusIcon(job.status)}
                                                    <span className="font-medium text-white capitalize">{job.type.replace(/_/g, ' ')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-neutral-400 text-xs font-mono">{job.userId}</span>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(job.status)}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-neutral-400">
                                                {format(new Date(job.updatedAt), "MMM d, yyyy HH:mm")}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
}

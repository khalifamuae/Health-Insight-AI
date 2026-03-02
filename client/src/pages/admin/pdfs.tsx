import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface PdfLog {
    id: string;
    fileName: string;
    status: string;
    errorMessage: string | null;
    testsExtracted: number | null;
    createdAt: string;
    userEmail: string | null;
}

interface PdfsResponse {
    pdfs: PdfLog[];
    total: number;
    page: number;
    totalPages: number;
}

export default function AdminPdfs() {
    const [page, setPage] = useState(1);
    const { t } = useTranslation();

    const { data, isLoading } = useQuery<PdfsResponse>({
        queryKey: ["/api/admin/pdfs", page],
        queryFn: async () => {
            const res = await fetch(`/api/admin/pdfs?page=${page}&limit=15`);
            if (!res.ok) throw new Error("Failed to fetch PDF logs");
            return res.json();
        }
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'processing':
            case 'pending': return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
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
            case 'pending':
                return <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Processing</span>;
            default:
                return <span className="px-2 py-1 rounded text-xs font-medium bg-neutral-800 text-neutral-400">{status}</span>;
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{t("adminPdfLogs")}</h1>
                    <p className="text-neutral-400 mt-1 text-sm">{t("adminPdfsDesc")}</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-neutral-950">
                                <TableRow className="border-neutral-800 hover:bg-transparent">
                                    <TableHead className="text-neutral-400 font-medium">Document</TableHead>
                                    <TableHead className="text-neutral-400 font-medium">User</TableHead>
                                    <TableHead className="text-neutral-400 font-medium">Status</TableHead>
                                    <TableHead className="text-neutral-400 font-medium hidden md:table-cell">Extracted</TableHead>
                                    <TableHead className="text-neutral-400 font-medium text-right">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow className="border-neutral-800 hover:bg-transparent">
                                        <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                                            Loading logs...
                                        </TableCell>
                                    </TableRow>
                                ) : data?.pdfs.length === 0 ? (
                                    <TableRow className="border-neutral-800 hover:bg-transparent">
                                        <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                                            No PDF uploads found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.pdfs.map((log) => (
                                        <TableRow key={log.id} className="border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1">
                                                        {getStatusIcon(log.status)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white max-w-[200px] sm:max-w-xs truncate" title={log.fileName}>
                                                            {log.fileName}
                                                        </div>
                                                        {log.status === 'failed' && log.errorMessage && (
                                                            <div className="text-xs text-red-400 mt-1 max-w-xs truncate" title={log.errorMessage}>
                                                                {log.errorMessage}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-neutral-300 truncate max-w-[150px]" title={log.userEmail || "Unknown"}>
                                                    {log.userEmail || <span className="text-neutral-600 font-style-italic">Unknown user</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(log.status)}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {log.status === 'completed' ? (
                                                    <div className="text-sm text-neutral-300">
                                                        <span className="font-bold text-white">{log.testsExtracted || 0}</span> tests
                                                    </div>
                                                ) : (
                                                    <span className="text-neutral-600">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-neutral-400 whitespace-nowrap">
                                                {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
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
                                Page <span className="font-medium text-white">{page}</span> of <span className="font-medium text-white">{data.totalPages}</span>
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

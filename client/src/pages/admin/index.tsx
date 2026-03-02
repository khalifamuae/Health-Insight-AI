import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Users, FileText, Share2, BookOpen, Activity, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

interface AdminStats {
    totalUsers: number;
    premiumUsers: number;
    totalPdfs: number;
    failedPdfs: number;
    pendingWithdrawals: number;
    totalKnowledgeBase: number;
}

export default function AdminDashboard() {
    const { data: stats, isLoading } = useQuery<AdminStats>({
        queryKey: ["/api/admin/stats"],
    });
    const { t } = useTranslation();

    return (
        <AdminLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{t("adminDashboard")}</h1>
                    <p className="text-neutral-400 mt-2 text-sm">{t("adminDashDesc")}</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <KpiCard
                        title="Total Users"
                        value={stats?.totalUsers}
                        icon={Users}
                        loading={isLoading}
                        description="Registered accounts"
                        trend={null}
                    />
                    <KpiCard
                        title="Premium Subscribers"
                        value={stats?.premiumUsers}
                        icon={Activity}
                        loading={isLoading}
                        description="Active Pro & Premium"
                        className="border-gold-500/30 bg-gold-500/5"
                        iconColor="text-gold-500"
                    />
                    <KpiCard
                        title="PDFs Analyzed"
                        value={stats?.totalPdfs}
                        icon={FileText}
                        loading={isLoading}
                        description="Total lab reports processed"
                    />
                    <KpiCard
                        title="Failed PDF Extractions"
                        value={stats?.failedPdfs}
                        icon={AlertTriangle}
                        loading={isLoading}
                        description="Requires review or retry"
                        iconColor={stats && stats.failedPdfs > 0 ? "text-red-500" : "text-neutral-500"}
                    />
                    <KpiCard
                        title="Pending Withdrawals"
                        value={stats?.pendingWithdrawals}
                        icon={Share2}
                        loading={isLoading}
                        description="Affiliate payout requests"
                        iconColor={stats && stats.pendingWithdrawals > 0 ? "text-amber-500" : "text-neutral-500"}
                    />
                    <KpiCard
                        title="Knowledge Base Entries"
                        value={stats?.totalKnowledgeBase}
                        icon={BookOpen}
                        loading={isLoading}
                        description="Scientific topics stored for AI"
                    />
                </div>
            </div>
        </AdminLayout>
    );
}

function KpiCard({
    title,
    value,
    icon: Icon,
    loading,
    description,
    trend,
    className = "",
    iconColor = "text-neutral-400"
}: {
    title: string;
    value?: number;
    icon: any;
    loading: boolean;
    description?: string;
    trend?: { value: number; isPositive: boolean } | null;
    className?: string;
    iconColor?: string;
}) {
    return (
        <Card className={`border-neutral-800 bg-neutral-900 shadow-sm ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-300">
                    {title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${iconColor}`} />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-8 w-20 bg-neutral-800" />
                ) : (
                    <div className="text-3xl font-bold text-white">
                        {value?.toLocaleString() || 0}
                    </div>
                )}

                <div className="flex items-center mt-2.5">
                    {description && (
                        <p className="text-xs text-neutral-500">{description}</p>
                    )}
                    {trend && (
                        <p className={`text-xs ml-auto font-medium ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {trend.isPositive ? '+' : '-'}{trend.value}%
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Activity, FileText, Share2, BookOpen, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const [location] = useLocation();
    const { logout } = useAuth();
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === "ar";

    const navigation = [
        { name: t("adminDashboard"), href: "/admin", icon: LayoutDashboard },
        { name: t("adminUsers"), href: "/admin/users", icon: Users },
        { name: t("adminLabTests"), href: "/admin/tests", icon: Activity },
        { name: t("adminPdfLogs"), href: "/admin/pdfs", icon: FileText },
        { name: t("adminKnowledgeBase"), href: "/admin/knowledge", icon: BookOpen },
        { name: t("adminAffiliates"), href: "/admin/affiliates", icon: Share2 },
        { name: t("adminJobsLogs"), href: "/admin/jobs", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-black flex font-sans">
            {/* Sidebar */}
            <div className="w-64 bg-black border-r border-neutral-800 flex flex-col hidden md:flex">
                <div className="p-6 border-b border-neutral-800">
                    <Link href="/">
                        <img src="/assets/biotrack-logo.svg" alt="BioTrack AI" className="h-8 cursor-pointer invert" />
                    </Link>
                    <p className="text-neutral-400 text-xs mt-2 font-medium uppercase tracking-wider">{t("adminPanel")}</p>
                </div>

                <nav className="flex-1 py-4">
                    <ul className="space-y-1 px-3">
                        {navigation.map((item) => {
                            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
                            const Icon = item.icon;

                            return (
                                <li key={item.name}>
                                    <Link href={item.href}>
                                        <div
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 cursor-pointer
                        ${isActive
                                                    ? "bg-white text-black shadow-sm"
                                                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                                                }
                      `}
                                        >
                                            <Icon className="h-5 w-5" />
                                            {item.name}
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="p-4 border-t border-neutral-800">
                    <button
                        onClick={() => logout()}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-red-400 hover:bg-red-500/10 w-full transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        {t("logout")}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-black">
                <header className="bg-black border-b border-neutral-800 h-16 flex items-center justify-between px-6 md:px-8">
                    <div className="md:hidden">
                        <Link href="/">
                            <img src="/assets/biotrack-logo.svg" alt="BioTrack AI" className="h-6 cursor-pointer invert" />
                        </Link>
                    </div>

                    <div className="flex-1 flex justify-end">
                        <div className="px-3 py-1 bg-white text-black rounded-full text-xs font-bold shadow-sm">
                            {t("adminMode")}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto bg-black p-6 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit, BookOpen, Trash2, Plus } from "lucide-react";
import { knowledgeDomainEnum } from "@shared/schema";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface KnowledgeEntry {
    id: string;
    topic: string;
    domain: string;
    contentEn: string;
    contentAr: string;
    sourceUrl: string | null;
    confidenceScore: number | null;
    createdAt: string;
}

export default function AdminKnowledgeBase() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [editingEntry, setEditingEntry] = useState<Partial<KnowledgeEntry> | null>(null);
    const [isNew, setIsNew] = useState(false);
    const { t } = useTranslation();

    // Domains from schema
    const domains = knowledgeDomainEnum.enumValues;

    const { data: entries, isLoading } = useQuery<KnowledgeEntry[]>({
        queryKey: ["/api/admin/knowledge"],
    });

    const saveMutation = useMutation({
        mutationFn: async (entry: Partial<KnowledgeEntry>) => {
            const url = isNew ? "/api/admin/knowledge" : `/api/admin/knowledge/${entry.id}`;
            const method = isNew ? "POST" : "PUT";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entry),
            });
            if (!res.ok) throw new Error(`Failed to ${isNew ? 'create' : 'update'} knowledge entry`);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge"] });
            toast({ title: `Entry ${isNew ? 'created' : 'updated'} successfully`, variant: "default" });
            setEditingEntry(null);
            setIsNew(false);
        },
        onError: () => {
            toast({ title: `Failed to ${isNew ? 'create' : 'update'} entry`, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete entry");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge"] });
            toast({ title: "Entry deleted successfully", variant: "default" });
        },
        onError: () => {
            toast({ title: "Failed to delete entry", variant: "destructive" });
        }
    });

    const filteredEntries = entries?.filter(entry =>
        entry.topic.toLowerCase().includes(search.toLowerCase()) ||
        entry.contentEn.toLowerCase().includes(search.toLowerCase()) ||
        entry.domain.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const handleOpenNew = () => {
        setIsNew(true);
        setEditingEntry({
            topic: "",
            domain: domains[0],
            contentEn: "",
            contentAr: "",
            sourceUrl: "",
            confidenceScore: 5
        });
    };

    const handleOpenEdit = (entry: KnowledgeEntry) => {
        setIsNew(false);
        setEditingEntry(entry);
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">{t("adminKnowledgeBase")}</h1>
                        <p className="text-neutral-400 mt-1 text-sm">{t("adminKnowledgeDesc")}</p>
                    </div>
                    <Dialog open={!!editingEntry} onOpenChange={(open) => {
                        if (!open) { setEditingEntry(null); setIsNew(false); }
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={handleOpenNew} className="bg-gold-500 text-black hover:bg-gold-600 shadow-sm border border-gold-400">
                                <Plus className="h-4 w-4 mr-2" /> Add Knowledge
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-h-[90vh] overflow-y-auto max-w-3xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl text-gold-500">{isNew ? 'New Knowledge Entry' : 'Edit Knowledge Entry'}</DialogTitle>
                            </DialogHeader>
                            {editingEntry && (
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Topic Title</Label>
                                            <Input
                                                value={editingEntry.topic || ''}
                                                onChange={(e) => setEditingEntry({ ...editingEntry, topic: e.target.value })}
                                                className="bg-neutral-950 border-neutral-800 text-white"
                                                placeholder="e.g. Benefits of Vitamin D, High Cholesterol Diet..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Domain</Label>
                                            <Select
                                                value={editingEntry.domain}
                                                onValueChange={(val) => setEditingEntry({ ...editingEntry, domain: val })}
                                            >
                                                <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white capitalize">
                                                    <SelectValue placeholder="Select domain" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                                    {domains.map(d => (
                                                        <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>English Content (Context for AI)</Label>
                                        <Textarea
                                            value={editingEntry.contentEn || ''}
                                            onChange={(e) => setEditingEntry({ ...editingEntry, contentEn: e.target.value })}
                                            className="bg-neutral-950 border-neutral-800 text-white min-h-[150px]"
                                            placeholder="Detailed medical or scientific fact..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Arabic Content</Label>
                                        <Textarea
                                            value={editingEntry.contentAr || ''}
                                            onChange={(e) => setEditingEntry({ ...editingEntry, contentAr: e.target.value })}
                                            className="bg-neutral-950 border-neutral-800 text-white min-h-[150px]"
                                            dir="rtl"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Source URL (Optional)</Label>
                                            <Input
                                                value={editingEntry.sourceUrl || ''}
                                                onChange={(e) => setEditingEntry({ ...editingEntry, sourceUrl: e.target.value })}
                                                className="bg-neutral-950 border-neutral-800 text-white"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Confidence Score (1-10)</Label>
                                            <Input
                                                type="number"
                                                min="1" max="10"
                                                value={editingEntry.confidenceScore || 5}
                                                onChange={(e) => setEditingEntry({ ...editingEntry, confidenceScore: parseInt(e.target.value) })}
                                                className="bg-neutral-950 border-neutral-800 text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => { setEditingEntry(null); setIsNew(false) }} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => saveMutation.mutate(editingEntry!)}
                                    disabled={saveMutation.isPending || !editingEntry?.topic || !editingEntry?.contentEn}
                                    className="bg-gold-500 text-black hover:bg-gold-600"
                                >
                                    {saveMutation.isPending ? "Saving..." : "Save Knowledge"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input
                            placeholder="Search knowledge by topic or domain..."
                            className="pl-9 bg-neutral-950 border-neutral-800 text-white w-full"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-neutral-950">
                                <TableRow className="border-neutral-800 hover:bg-transparent">
                                    <TableHead className="text-neutral-400 font-medium">Topic / Domain</TableHead>
                                    <TableHead className="text-neutral-400 font-medium hidden md:table-cell w-1/3">Synopsis</TableHead>
                                    <TableHead className="text-neutral-400 font-medium hidden lg:table-cell text-center">Score</TableHead>
                                    <TableHead className="text-neutral-400 font-medium text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow className="border-neutral-800 hover:bg-transparent">
                                        <TableCell colSpan={4} className="h-32 text-center text-neutral-500">
                                            Loading knowledge base...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredEntries.length === 0 ? (
                                    <TableRow className="border-neutral-800 hover:bg-transparent">
                                        <TableCell colSpan={4} className="h-32 text-center text-neutral-500">
                                            No topics found matching "{search}".
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEntries.map((entry) => (
                                        <TableRow key={entry.id} className="border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0 border border-neutral-700">
                                                        <BookOpen className="h-4 w-4 text-neutral-400" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-white">{entry.topic}</div>
                                                        <div className="text-xs font-medium text-neutral-500 capitalize">{entry.domain}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <div className="text-sm text-neutral-400 line-clamp-2" title={entry.contentEn}>
                                                    {entry.contentEn}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-center">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${(entry.confidenceScore || 0) < 5 ? 'text-red-400' :
                                                    (entry.confidenceScore || 0) < 8 ? 'text-amber-400' : 'text-green-400 text-shadow-glow'
                                                    }`}>
                                                    {entry.confidenceScore}/10
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenEdit(entry)}
                                                        className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            if (confirm(`Are you sure you want to delete "${entry.topic}"?`)) {
                                                                deleteMutation.mutate(entry.id);
                                                            }
                                                        }}
                                                        className="h-8 w-8 text-red-500/70 hover:text-red-400 hover:bg-red-500/10"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
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

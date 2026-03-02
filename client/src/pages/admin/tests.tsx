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
import { Search, Edit, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TestDefinition {
    id: string;
    nameEn: string;
    nameAr: string;
    shortName: string | null;
    category: string;
    level: number;
    unit: string | null;
    normalRangeMin: number | null;
    normalRangeMax: number | null;
    normalRangeText: string | null;
    recheckMonths: number | null;
    descriptionEn: string | null;
    descriptionAr: string | null;
}

export default function AdminTests() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [editingTest, setEditingTest] = useState<TestDefinition | null>(null);
    const { t } = useTranslation();

    const { data: tests, isLoading } = useQuery<TestDefinition[]>({
        queryKey: ["/api/admin/tests"],
    });

    const updateMutation = useMutation({
        mutationFn: async (test: TestDefinition) => {
            const res = await fetch(`/api/admin/tests/${test.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(test),
            });
            if (!res.ok) throw new Error("Failed to update test");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/tests"] });
            toast({ title: "Test updated successfully", variant: "default" });
            setEditingTest(null);
        },
        onError: () => {
            toast({ title: "Failed to update test", variant: "destructive" });
        }
    });

    const filteredTests = tests?.filter(test =>
        test.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        test.nameAr.includes(search) ||
        test.id.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">{t("adminLabTests")}</h1>
                        <p className="text-neutral-400 mt-1 text-sm">{t("adminTestsDesc")}</p>
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input
                            placeholder="Search tests by name (English or Arabic)..."
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
                                    <TableHead className="text-neutral-400 font-medium w-[250px]">Test Name</TableHead>
                                    <TableHead className="text-neutral-400 font-medium">Category</TableHead>
                                    <TableHead className="text-neutral-400 font-medium hidden md:table-cell">Normal Range</TableHead>
                                    <TableHead className="text-neutral-400 font-medium hidden lg:table-cell">Importance</TableHead>
                                    <TableHead className="text-neutral-400 font-medium text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow className="border-neutral-800 hover:bg-transparent">
                                        <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                                            Loading tests...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTests.length === 0 ? (
                                    <TableRow className="border-neutral-800 hover:bg-transparent">
                                        <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                                            No tests found matching "{search}".
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTests.map((test) => (
                                        <TableRow key={test.id} className="border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0">
                                                        <Activity className="h-4 w-4 text-gold-500" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white">{test.nameEn}</div>
                                                        <div className="text-xs text-neutral-500" dir="rtl">{test.nameAr}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-800/80 text-neutral-300 border border-neutral-700 capitalize">
                                                    {test.category.replace('_', ' ')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm text-neutral-300">
                                                {test.normalRangeText || (
                                                    test.normalRangeMin !== null && test.normalRangeMax !== null
                                                        ? `${test.normalRangeMin} - ${test.normalRangeMax} ${test.unit || ''}`
                                                        : 'Not setup'
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <div className="flex items-center gap-1 text-sm text-neutral-400">
                                                    {test.level} / 7
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog open={editingTest?.id === test.id} onOpenChange={(open) => !open && setEditingTest(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setEditingTest(test)}
                                                            className="text-neutral-400 hover:text-white hover:bg-neutral-800"
                                                        >
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-h-[90vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-xl text-gold-500">Edit Test: {test.nameEn}</DialogTitle>
                                                        </DialogHeader>
                                                        {editingTest && (
                                                            <div className="space-y-4 py-4">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label>English Name</Label>
                                                                        <Input
                                                                            value={editingTest.nameEn || ''}
                                                                            onChange={(e) => setEditingTest({ ...editingTest, nameEn: e.target.value })}
                                                                            className="bg-neutral-950 border-neutral-800 text-white"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>Arabic Name</Label>
                                                                        <Input
                                                                            value={editingTest.nameAr || ''}
                                                                            onChange={(e) => setEditingTest({ ...editingTest, nameAr: e.target.value })}
                                                                            className="bg-neutral-950 border-neutral-800 text-white"
                                                                            dir="rtl"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label>Min Range</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={editingTest.normalRangeMin === null ? '' : editingTest.normalRangeMin}
                                                                            onChange={(e) => setEditingTest({ ...editingTest, normalRangeMin: e.target.value ? parseFloat(e.target.value) : null })}
                                                                            className="bg-neutral-950 border-neutral-800 text-white"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>Max Range</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={editingTest.normalRangeMax === null ? '' : editingTest.normalRangeMax}
                                                                            onChange={(e) => setEditingTest({ ...editingTest, normalRangeMax: e.target.value ? parseFloat(e.target.value) : null })}
                                                                            className="bg-neutral-950 border-neutral-800 text-white"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>Unit</Label>
                                                                        <Input
                                                                            value={editingTest.unit || ''}
                                                                            onChange={(e) => setEditingTest({ ...editingTest, unit: e.target.value })}
                                                                            className="bg-neutral-950 border-neutral-800 text-white"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Custom Range Text (Overrides Min/Max)</Label>
                                                                    <Input
                                                                        value={editingTest.normalRangeText || ''}
                                                                        onChange={(e) => setEditingTest({ ...editingTest, normalRangeText: e.target.value })}
                                                                        className="bg-neutral-950 border-neutral-800 text-white"
                                                                        placeholder="e.g. Negative, Not detected..."
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>English Description</Label>
                                                                    <Textarea
                                                                        value={editingTest.descriptionEn || ''}
                                                                        onChange={(e) => setEditingTest({ ...editingTest, descriptionEn: e.target.value })}
                                                                        className="bg-neutral-950 border-neutral-800 text-white min-h-[100px]"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Arabic Description</Label>
                                                                    <Textarea
                                                                        value={editingTest.descriptionAr || ''}
                                                                        onChange={(e) => setEditingTest({ ...editingTest, descriptionAr: e.target.value })}
                                                                        className="bg-neutral-950 border-neutral-800 text-white min-h-[100px]"
                                                                        dir="rtl"
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label>Recheck Months</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={editingTest.recheckMonths === null ? '' : editingTest.recheckMonths}
                                                                            onChange={(e) => setEditingTest({ ...editingTest, recheckMonths: e.target.value ? parseInt(e.target.value) : null })}
                                                                            className="bg-neutral-950 border-neutral-800 text-white"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>Importance Level (1-7)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="1"
                                                                            max="7"
                                                                            value={editingTest.level || 1}
                                                                            onChange={(e) => setEditingTest({ ...editingTest, level: parseInt(e.target.value) })}
                                                                            className="bg-neutral-950 border-neutral-800 text-white"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => setEditingTest(null)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                onClick={() => editingTest && updateMutation.mutate(editingTest)}
                                                                disabled={updateMutation.isPending}
                                                                className="bg-gold-500 text-black hover:bg-gold-600"
                                                            >
                                                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
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

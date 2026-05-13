import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { Eye, ChevronDown, Save, Star, Trash2, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { SavedView } from '@/types/entities';

type ViewConfig = {
    search?: string;
    filters?: Record<string, string>;
    sort?: { field: string; dir: 'asc' | 'desc' };
};

export function SavedViewSwitcher({
    databaseType,
    views,
    activeViewId,
    currentConfig,
    onApplyView,
    onClearView,
    allLabel = 'All rows (no filters)',
}: {
    databaseType: string;
    views: SavedView[];
    activeViewId: number | null;
    currentConfig: ViewConfig;
    onApplyView: (config: ViewConfig, viewId: number | null) => void;
    onClearView: () => void;
    /** Label shown for the "no active view" entry. Defaults to "All rows (no filters)". */
    allLabel?: string;
}) {
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const activeView = views.find((v) => v.id === activeViewId) ?? null;

    const saveForm = useForm({
        database_type: databaseType,
        name: '',
        view_type: 'table',
        config: currentConfig,
        is_default: false,
    });

    const submitSave = (e: React.FormEvent) => {
        e.preventDefault();
        saveForm.transform((d) => ({ ...d, config: currentConfig }));
        saveForm.post(route('saved-views.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`View "${saveForm.data.name}" saved`);
                saveForm.reset();
                setSaveDialogOpen(false);
            },
            onError: (errs) => toast.error(Object.values(errs).join(', ')),
        });
    };

    const overwriteActiveView = () => {
        if (!activeView) return;
        router.patch(route('saved-views.update', { savedView: activeView.id }), { config: currentConfig }, {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${activeView.name}" updated`),
        });
    };

    const setAsDefault = (view: SavedView) => {
        router.patch(route('saved-views.update', { savedView: view.id }), { is_default: true }, {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${view.name}" is now the default view`),
        });
    };

    const deleteView = (view: SavedView) => {
        if (!confirm(`Delete view "${view.name}"?`)) return;
        router.delete(route('saved-views.destroy', { savedView: view.id }), {
            preserveScroll: true,
            onSuccess: () => {
                if (activeViewId === view.id) onClearView();
                toast.success('View deleted');
            },
        });
    };

    return (
        <>
            <div className="flex items-center gap-1">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="max-w-[120px] truncate">
                                {activeView ? activeView.name : allLabel}
                            </span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Saved views
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={onClearView}
                            className={cn(!activeView && 'bg-muted/50 font-medium')}
                        >
                            <span className="flex flex-1 items-center gap-2">
                                {!activeView && <Check className="h-3.5 w-3.5 text-primary" />}
                                <span className={cn(!activeView ? 'ml-0' : 'ml-5')}>{allLabel}</span>
                            </span>
                        </DropdownMenuItem>
                        {views.length > 0 && <DropdownMenuSeparator />}
                        {views.map((v) => {
                            const isActive = v.id === activeViewId;
                            return (
                                <DropdownMenuItem
                                    key={v.id}
                                    onClick={() => onApplyView(v.config as ViewConfig, v.id)}
                                    className={cn(isActive && 'bg-muted/50 font-medium')}
                                >
                                    <span className="flex flex-1 items-center gap-2">
                                        {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                                        <span className={cn(isActive ? 'ml-0' : 'ml-5', 'flex-1 truncate')}>{v.name}</span>
                                        {v.is_default && (
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        )}
                                    </span>
                                </DropdownMenuItem>
                            );
                        })}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
                            <Plus className="h-3.5 w-3.5 mr-2" />
                            Save current as new view…
                        </DropdownMenuItem>
                        {activeView && (
                            <>
                                <DropdownMenuItem onClick={overwriteActiveView}>
                                    <Save className="h-3.5 w-3.5 mr-2" />
                                    Update "{activeView.name}" with current filters
                                </DropdownMenuItem>
                                {!activeView.is_default && (
                                    <DropdownMenuItem onClick={() => setAsDefault(activeView)}>
                                        <Star className="h-3.5 w-3.5 mr-2" />
                                        Make default
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => deleteView(activeView)} className="text-destructive">
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    Delete "{activeView.name}"
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Save dialog */}
            <Dialog open={saveDialogOpen} onOpenChange={(o) => { if (!o) { saveForm.reset(); setSaveDialogOpen(false); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save view</DialogTitle>
                        <DialogDescription>
                            Captures the current search, filters, and sort. Switch back to it anytime from the view dropdown.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitSave} noValidate className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="view-name" className="text-xs">Name *</Label>
                            <Input
                                id="view-name"
                                value={saveForm.data.name}
                                onChange={(e) => saveForm.setData('name', e.target.value)}
                                placeholder="e.g. Urgent packing pending"
                                required
                            />
                            {saveForm.errors.name && <p className="text-[10px] text-destructive">{saveForm.errors.name}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="is_default"
                                checked={saveForm.data.is_default}
                                onCheckedChange={(c) => saveForm.setData('is_default', !!c)}
                            />
                            <Label htmlFor="is_default" className="cursor-pointer text-xs font-normal">
                                Open this view by default when I load the list
                            </Label>
                        </div>
                        <p className="rounded border bg-muted/30 p-2 text-[10px] text-muted-foreground">
                            Capturing: {summarizeConfig(currentConfig)}
                        </p>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={saveForm.processing || !saveForm.data.name.trim()}>
                                <Save className="h-3.5 w-3.5 mr-1" />
                                {saveForm.processing ? 'Saving…' : 'Save view'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function summarizeConfig(c: ViewConfig): string {
    const bits: string[] = [];
    if (c.search) bits.push(`search="${c.search}"`);
    if (c.filters) {
        for (const [k, v] of Object.entries(c.filters)) {
            if (v) bits.push(`${k}=${v}`);
        }
    }
    if (c.sort) bits.push(`sort by ${c.sort.field} ${c.sort.dir}`);
    return bits.length > 0 ? bits.join(' · ') : 'all rows, no filters';
}

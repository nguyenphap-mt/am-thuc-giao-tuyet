'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { formatCurrency, cn } from '@/lib/utils';
import { IconSearch, IconPlus, IconTrash, IconChefHat, IconReceipt, IconAlertTriangle, IconX, IconCheck, IconArrowUp, IconPencil } from '@tabler/icons-react';

// Shared UOM list — single source of truth
const UOM_OPTIONS = ['kg', 'g', 'lít', 'ml', 'cái', 'gói', 'hộp', 'lon', 'chai', 'bịch'] as const;

interface RecipeIngredient {
    id: string;
    ingredient_id: string;
    ingredient_name: string;
    quantity_per_unit: number;
    uom: string;
}

interface RecipeData {
    menu_item_name: string;
    ingredient_count: number;
    ingredients: RecipeIngredient[];
}

interface FoodCostData {
    food_cost_percentage: number;
    total_food_cost: number;
    selling_price: number;
    profit_margin: number;
    ingredients: Array<{ ingredient_id: string; ingredient_name: string; quantity: number; uom: string; unit_cost: number; line_cost: number }>;
}

interface InventoryItem {
    id: string;
    name: string;
    uom: string;
    cost_price: number;
}

interface RecipeDrawerProps {
    open: boolean;
    onClose: () => void;
    recipeData: RecipeData | undefined;
    foodCostData: FoodCostData | undefined;
    inventoryResults: InventoryItem[];
    ingredientSearch: string;
    setIngredientSearch: (s: string) => void;
    onAddIngredient: (inv: InventoryItem, qty: number, uom: string) => void;
    onRemoveIngredient: (recipeId: string) => void;
    onUpdateIngredient?: (recipeId: string, ingredientId: string, ingredientName: string, qty: number, uom: string) => void;
    onCreateIngredient?: (name: string, uom: string, qty?: number) => Promise<void>;
    addPending: boolean;
    deletePending: boolean;
    createPending?: boolean;
    updatePending?: boolean;
}

export function RecipeDrawer({
    open, onClose, recipeData, foodCostData, inventoryResults,
    ingredientSearch, setIngredientSearch, onAddIngredient, onRemoveIngredient,
    onUpdateIngredient, onCreateIngredient, addPending, deletePending, createPending, updatePending,
}: RecipeDrawerProps) {
    // Selected ingredient (staged, not yet added)
    const [selectedIngredient, setSelectedIngredient] = useState<InventoryItem | null>(null);
    const [addIngredientQty, setAddIngredientQty] = useState('');
    const [addIngredientUom, setAddIngredientUom] = useState('kg');
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddUom, setQuickAddUom] = useState('kg');
    const qtyInputRef = useRef<HTMLInputElement>(null);

    // Inline edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQty, setEditQty] = useState('');
    const [editUom, setEditUom] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    // When an ingredient is selected, auto-focus the qty input
    useEffect(() => {
        if (selectedIngredient && qtyInputRef.current) {
            qtyInputRef.current.focus();
            qtyInputRef.current.select();
        }
    }, [selectedIngredient]);

    // Focus edit input when editing starts
    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    // Reset state when drawer closes
    useEffect(() => {
        if (!open) {
            setSelectedIngredient(null);
            setAddIngredientQty('');
            setAddIngredientUom('kg');
            setShowQuickAdd(false);
            setEditingId(null);
        }
    }, [open]);

    // Compute total food cost
    const totalFoodCost = useMemo(() => {
        if (!foodCostData?.ingredients) return 0;
        return foodCostData.ingredients.reduce((sum, i) => sum + (i.line_cost || 0), 0);
    }, [foodCostData]);

    // Handle selecting an ingredient from search results
    const handleSelectIngredient = (inv: InventoryItem) => {
        setSelectedIngredient(inv);
        setAddIngredientUom(inv.uom);
        setAddIngredientQty('');
        setIngredientSearch('');
    };

    // Handle confirming the add
    const handleConfirmAdd = () => {
        if (!selectedIngredient) return;
        const qty = parseFloat(addIngredientQty);
        if (!qty || qty <= 0) {
            qtyInputRef.current?.focus();
            return;
        }
        onAddIngredient(selectedIngredient, qty, addIngredientUom);
        setSelectedIngredient(null);
        setAddIngredientQty('');
    };

    // Handle cancel selection
    const handleCancelSelection = () => {
        setSelectedIngredient(null);
        setAddIngredientQty('');
    };

    // Handle Enter key on qty input
    const handleQtyKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirmAdd();
        }
    };

    // --- Inline Edit handlers ---
    const startEditing = (ing: RecipeIngredient) => {
        setEditingId(ing.id);
        setEditQty(String(ing.quantity_per_unit));
        setEditUom(ing.uom);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditQty('');
        setEditUom('');
    };

    const confirmEdit = (ing: RecipeIngredient) => {
        const qty = parseFloat(editQty);
        if (!qty || qty <= 0 || !onUpdateIngredient) {
            cancelEditing();
            return;
        }
        // Only call API if something changed
        if (qty !== ing.quantity_per_unit || editUom !== ing.uom) {
            onUpdateIngredient(ing.id, ing.ingredient_id, ing.ingredient_name, qty, editUom);
        }
        setEditingId(null);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent, ing: RecipeIngredient) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmEdit(ing); }
        if (e.key === 'Escape') { e.preventDefault(); cancelEditing(); }
    };

    // Food cost progress bar color
    const getFoodCostColor = (pct: number) => {
        if (pct <= 30) return { bar: 'bg-green-500', bg: 'bg-green-100' };
        if (pct <= 40) return { bar: 'bg-amber-500', bg: 'bg-amber-100' };
        return { bar: 'bg-red-500', bg: 'bg-red-100' };
    };

    return (
        <Sheet open={open} onOpenChange={() => { onClose(); setIngredientSearch(''); }}>
            <SheetContent className="sm:max-w-lg xl:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2"><IconChefHat className="h-5 w-5 text-purple-600" />Công thức</SheetTitle>
                    <SheetDescription>{recipeData?.menu_item_name || 'Đang tải...'}</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    {/* Food Cost Summary with Progress Bar */}
                    {foodCostData && (() => {
                        const pct = foodCostData.food_cost_percentage;
                        const colors = getFoodCostColor(pct);
                        return (
                            <div className={cn('p-3 rounded-lg border', pct <= 30 ? 'bg-green-50 border-green-200' : pct <= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')}>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Food Cost</p>
                                        <p className="text-lg font-bold tabular-nums">{pct}%</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Giá vốn / Giá bán</p>
                                        <p className="text-sm font-medium tabular-nums">{formatCurrency(foodCostData.total_food_cost)} / {formatCurrency(foodCostData.selling_price)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Lợi nhuận</p>
                                        <p className="text-sm font-medium text-green-700 tabular-nums">{formatCurrency(foodCostData.profit_margin)}</p>
                                    </div>
                                </div>
                                {/* M5: Progress bar */}
                                <div className={cn('mt-2 h-1.5 rounded-full overflow-hidden', colors.bg)}>
                                    <div
                                        className={cn('h-full rounded-full transition-all duration-500 ease-out', colors.bar)}
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })()}

                    {/* Add Ingredient Section */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Thêm nguyên liệu</Label>

                        {/* State: No ingredient selected — show search */}
                        {!selectedIngredient ? (
                            <>
                                <div className="relative">
                                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Tìm nguyên liệu kho..."
                                        value={ingredientSearch}
                                        onChange={e => setIngredientSearch(e.target.value)}
                                        className="pl-9 h-9 text-sm"
                                        aria-label="Tìm kiếm nguyên liệu"
                                    />
                                </div>
                                {/* M1: threshold reduced to 1 char */}
                                {ingredientSearch.length >= 1 && inventoryResults.length > 0 && (
                                    <div className="border rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm">
                                        {inventoryResults.map(inv => (
                                            <button key={inv.id} onClick={() => handleSelectIngredient(inv)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-purple-50 text-left transition-colors cursor-pointer" disabled={addPending}>
                                                <IconReceipt className="h-4 w-4 text-orange-500 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm truncate block">{inv.name}</span>
                                                    <span className="text-xs text-gray-400">{inv.uom} • {formatCurrency(inv.cost_price)}/{inv.uom}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {/* No results — Quick-Add form */}
                                {ingredientSearch.length >= 1 && inventoryResults.length === 0 && (
                                    <div className="border rounded-lg bg-gray-50/80 p-3 space-y-2">
                                        <p className="text-xs text-gray-500 text-center">Không tìm thấy nguyên liệu &quot;{ingredientSearch}&quot;</p>
                                        {onCreateIngredient && !showQuickAdd && (
                                            <button
                                                onClick={() => { setShowQuickAdd(true); setQuickAddUom('kg'); }}
                                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-dashed border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-medium transition-colors cursor-pointer"
                                            >
                                                <IconPlus className="h-4 w-4" />
                                                Tạo nguyên liệu &quot;{ingredientSearch}&quot;
                                            </button>
                                        )}
                                        {onCreateIngredient && showQuickAdd && (
                                            <div className="space-y-2 p-3 border rounded-lg bg-white">
                                                <p className="text-xs font-medium text-gray-700">Tạo nhanh nguyên liệu mới</p>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={ingredientSearch}
                                                        readOnly
                                                        className="flex-1 h-8 text-sm bg-gray-50"
                                                    />
                                                    <Select value={quickAddUom} onValueChange={setQuickAddUom}>
                                                        <SelectTrigger className="w-20 h-8 text-sm"><SelectValue /></SelectTrigger>
                                                        <SelectContent>{UOM_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                                <p className="text-[11px] text-amber-600 flex items-center gap-1">
                                                    <IconAlertTriangle className="h-3 w-3" />
                                                    Giá nhập = 0đ (người mua hàng sẽ cập nhật sau)
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm" variant="outline" className="flex-1 h-8 text-xs"
                                                        onClick={() => setShowQuickAdd(false)}
                                                    >
                                                        Hủy
                                                    </Button>
                                                    <Button
                                                        size="sm" className="flex-1 h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                                                        onClick={async () => {
                                                            await onCreateIngredient(ingredientSearch.trim(), quickAddUom);
                                                            setShowQuickAdd(false);
                                                        }}
                                                        disabled={createPending}
                                                    >
                                                        {createPending ? 'Đang tạo...' : 'Tạo & thêm vào công thức'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* State: Ingredient SELECTED — compact layout */
                            <div className="border-2 border-purple-200 rounded-lg p-3 bg-purple-50/50 space-y-2.5">
                                {/* P4+P5: Selected ingredient header with better X button */}
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded bg-purple-100 shrink-0">
                                        <IconReceipt className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{selectedIngredient.name}</p>
                                        <p className="text-xs text-gray-500">{formatCurrency(selectedIngredient.cost_price)}/{selectedIngredient.uom}</p>
                                    </div>
                                    {/* P4: Larger touch target + clearer hover */}
                                    <button onClick={handleCancelSelection} className="p-2 -m-1 rounded-lg hover:bg-red-50 transition-colors group/cancel" title="Bỏ chọn" aria-label="Bỏ chọn nguyên liệu">
                                        <IconX className="h-4 w-4 text-gray-400 group-hover/cancel:text-red-500 transition-colors" />
                                    </button>
                                </div>

                                {/* P1+P2+P5+P6: Merged input + UOM + CTA in single row */}
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        ref={qtyInputRef}
                                        type="number"
                                        min={0.01}
                                        step={0.1}
                                        value={addIngredientQty}
                                        onChange={e => setAddIngredientQty(e.target.value)}
                                        onKeyDown={handleQtyKeyDown}
                                        className="w-20 h-9 text-sm text-center shrink-0"
                                        placeholder="0.7"
                                        autoFocus
                                        aria-label="Số lượng nguyên liệu"
                                    />
                                    <Select value={addIngredientUom} onValueChange={setAddIngredientUom}>
                                        <SelectTrigger className="w-16 h-9 text-sm shrink-0"><SelectValue /></SelectTrigger>
                                        <SelectContent>{UOM_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Button
                                        size="sm" className="flex-1 h-9 text-sm bg-purple-600 hover:bg-purple-700 text-white gap-1"
                                        onClick={handleConfirmAdd}
                                        disabled={addPending || !addIngredientQty || parseFloat(addIngredientQty) <= 0}
                                    >
                                        <IconCheck className="h-4 w-4" />
                                        {addPending ? 'Đang thêm...' : 'Thêm'}
                                    </Button>
                                </div>

                                {/* P3: Live cost preview + keyboard hint */}
                                <div className="flex items-center justify-between">
                                    {addIngredientQty && parseFloat(addIngredientQty) > 0 && selectedIngredient.cost_price > 0 ? (
                                        <p className="text-xs text-gray-500 tabular-nums">
                                            {addIngredientQty} {addIngredientUom} × {formatCurrency(selectedIngredient.cost_price)} = <span className="font-semibold text-gray-700">{formatCurrency(parseFloat(addIngredientQty) * selectedIngredient.cost_price)}</span>
                                        </p>
                                    ) : (
                                        <span />
                                    )}
                                    <p className="text-[10px] text-gray-400">Enter ↵</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Current Ingredients */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Nguyên liệu ({recipeData?.ingredient_count || 0})</Label>
                        </div>
                        {!recipeData ? (
                            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                        ) : recipeData.ingredients.length === 0 ? (
                            /* M3: Improved empty state with arrow */
                            <div className="text-center py-8 border rounded-lg bg-gray-50/80">
                                <div className="animate-bounce mb-2">
                                    <IconArrowUp className="mx-auto h-5 w-5 text-purple-400" />
                                </div>
                                <IconChefHat className="mx-auto h-10 w-10 text-gray-300" />
                                <p className="mt-2 text-gray-500 text-sm font-medium">Chưa có nguyên liệu</p>
                                <p className="text-xs text-gray-400 mt-1">Tìm và thêm nguyên liệu từ ô tìm kiếm phía trên</p>
                            </div>
                        ) : (
                            <div className="divide-y rounded-lg border">
                                {recipeData.ingredients.map(ing => {
                                    const costIng = foodCostData?.ingredients?.find(fi => fi.ingredient_id === ing.ingredient_id);
                                    const isEditing = editingId === ing.id;

                                    return (
                                        <div key={ing.id} className="flex items-start gap-3 p-3 group">
                                            <div className="p-1.5 rounded bg-orange-50 mt-0.5 shrink-0"><IconReceipt className="h-4 w-4 text-orange-600" /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{ing.ingredient_name}</p>

                                                {isEditing ? (
                                                    /* H1: Inline edit mode */
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Input
                                                            ref={editInputRef}
                                                            type="number"
                                                            min={0.01}
                                                            step={0.1}
                                                            value={editQty}
                                                            onChange={e => setEditQty(e.target.value)}
                                                            onKeyDown={e => handleEditKeyDown(e, ing)}
                                                            className="w-20 h-7 text-xs text-center"
                                                            aria-label="Sửa số lượng"
                                                        />
                                                        <Select value={editUom} onValueChange={setEditUom}>
                                                            <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>{UOM_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                        <button
                                                            onClick={() => confirmEdit(ing)}
                                                            className="p-1 rounded hover:bg-green-100 transition-colors"
                                                            aria-label="Xác nhận sửa"
                                                            disabled={updatePending}
                                                        >
                                                            <IconCheck className="h-3.5 w-3.5 text-green-600" />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                                                            aria-label="Hủy sửa"
                                                        >
                                                            <IconX className="h-3.5 w-3.5 text-gray-400" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    /* H1: Click to edit + H2: cost formula */
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <button
                                                            onClick={() => onUpdateIngredient && startEditing(ing)}
                                                            className={cn(
                                                                'text-xs tabular-nums inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors',
                                                                onUpdateIngredient ? 'hover:bg-purple-50 cursor-pointer group/edit' : ''
                                                            )}
                                                            title={onUpdateIngredient ? 'Bấm để sửa số lượng' : undefined}
                                                            disabled={!onUpdateIngredient}
                                                        >
                                                            <span className="text-gray-600 font-medium">{ing.quantity_per_unit} {ing.uom}</span>
                                                            {onUpdateIngredient && (
                                                                <IconPencil className="h-3 w-3 text-gray-300 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                                                            )}
                                                        </button>
                                                        {/* H2: Line cost formula */}
                                                        {costIng && costIng.line_cost > 0 && (
                                                            <span className="text-[11px] text-gray-400 tabular-nums">
                                                                × {formatCurrency(costIng.unit_cost)}/{ing.uom} = <span className="text-gray-600 font-medium">{formatCurrency(costIng.line_cost)}</span>
                                                            </span>
                                                        )}
                                                        {costIng && costIng.line_cost === 0 && (
                                                            <span className="text-[11px] text-amber-500 flex items-center gap-0.5" title="Chưa có giá nhập — người mua hàng cần cập nhật trong Kho hàng">
                                                                <IconAlertTriangle className="h-3 w-3" />chưa có giá
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {/* M4: Delete always visible on mobile */}
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-8 w-8 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity mt-0.5"
                                                onClick={() => onRemoveIngredient(ing.id)}
                                                disabled={deletePending}
                                                aria-label={`Xóa ${ing.ingredient_name}`}
                                            >
                                                <IconTrash className="h-3.5 w-3.5 text-red-500" />
                                            </Button>
                                        </div>
                                    );
                                })}

                                {/* M2: Total food cost summary */}
                                {foodCostData && recipeData.ingredients.length > 0 && (
                                    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50/80">
                                        <span className="text-xs font-medium text-gray-500">Tổng giá vốn</span>
                                        <span className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(totalFoodCost)}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

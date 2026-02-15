'use client';

import { PermissionGate } from '@/components/shared/PermissionGate';
import { useState, useMemo, useCallback } from 'react';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { motion } from 'framer-motion';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { formatCurrency, cn } from '@/lib/utils';
import {
    IconPlus, IconCheck, IconToolsKitchen, IconCategory, IconChartBar,
    IconPackage, IconDownload, IconPercentage, IconTrash, IconBuildingStore,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
    useMenuItems, useMenuCategories, useMenuStats,
    useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, useToggleMenuItemActive,
    useCreateCategory, useUpdateCategory, useDeleteCategory,
    useSetMenus, useCreateSetMenu, useUpdateSetMenu, useDeleteSetMenu,
    useItemRecipes, useAddRecipeIngredient, useDeleteRecipeIngredient, useUpdateRecipeIngredient, useFoodCost,
    useInventorySearch, useCreateInventoryItem,
    useMenuEngineering, useTopSellers, useCategoryBreakdown,
    type MenuItem, type SetMenu,
} from '@/hooks/use-menu';

// === Decomposed Components ===
import {
    MenuItemsList, ServiceItemsList, SetMenusList, CategoriesList, MenuAnalytics,
    RecipeDrawer, MenuItemModal, CategoryModal, SetMenuModal, DeleteConfirmDialog,
    type ItemFormData,
} from './components';

const MENU_TABS = ['items', 'services', 'set-menus', 'categories', 'analytics'] as const;

export default function MenuPage() {
    // === Core state ===
    const { activeTab, handleTabChange: setActiveTab } = useTabPersistence(MENU_TABS, 'items');
    const [search, setSearch] = useState('');
    const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
    const [exportOpen, setExportOpen] = useState(false);

    // === Modal state ===
    const [showItemModal, setShowItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteType, setDeleteType] = useState<'item' | 'set-menu' | 'category'>('item');
    const [recipeItemId, setRecipeItemId] = useState<string | null>(null);
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [showSetMenuModal, setShowSetMenuModal] = useState(false);
    const [editingSetMenu, setEditingSetMenu] = useState<SetMenu | null>(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [categoryInitialData, setCategoryInitialData] = useState({ name: '', code: '', description: '', item_type: 'FOOD' });
    const [setMenuItemSearch, setSetMenuItemSearch] = useState('');

    // === Queries ===
    const { data: items = [], isLoading } = useMenuItems(search, filterCategoryId || undefined, 'FOOD');
    const { data: categories = [] } = useMenuCategories();
    const [serviceSearch, setServiceSearch] = useState('');
    const { data: serviceItems = [], isLoading: serviceItemsLoading } = useMenuItems(serviceSearch, undefined, 'SERVICE');
    const { data: serviceCategories = [] } = useMenuCategories();
    const { data: stats } = useMenuStats();
    const { data: setMenus = [], isLoading: setMenusLoading } = useSetMenus();
    const { data: recipeData } = useItemRecipes(recipeItemId || undefined);
    const { data: foodCostData } = useFoodCost(recipeItemId || undefined);
    const { data: inventoryResults = [] } = useInventorySearch(ingredientSearch || undefined);
    const { data: setMenuSearchItems = [] } = useMenuItems(setMenuItemSearch);
    const { data: engineeringData } = useMenuEngineering();
    const { data: topSellers = [] } = useTopSellers(10);
    const { data: categoryBreakdown = [] } = useCategoryBreakdown();

    // === Mutations ===
    const createItem = useCreateMenuItem();
    const updateItem = useUpdateMenuItem();
    const deleteItem = useDeleteMenuItem();
    const toggleActive = useToggleMenuItemActive();
    const createCategory = useCreateCategory();
    const updateCategory = useUpdateCategory();
    const deleteCategory = useDeleteCategory();
    const createSetMenu = useCreateSetMenu();
    const updateSetMenu = useUpdateSetMenu();
    const deleteSetMenu = useDeleteSetMenu();
    const addRecipeIngredient = useAddRecipeIngredient();
    const updateRecipeIngredient = useUpdateRecipeIngredient();
    const deleteRecipeIngredient = useDeleteRecipeIngredient();
    const createInventoryItem = useCreateInventoryItem();
    const queryClient = useQueryClient();
    const { isExporting, exportData } = useReportExport();

    // === Handlers ===
    const handleSaveItem = useCallback(async (formData: ItemFormData) => {
        const payload = {
            name: formData.name.trim(), description: formData.description.trim() || undefined,
            category_id: formData.category_id || undefined, uom: formData.uom,
            cost_price: parseFloat(formData.cost_price) || 0, selling_price: parseFloat(formData.selling_price) || 0,
            is_active: formData.is_active, image_url: formData.image_url.trim() || undefined,
        };
        try {
            if (editingItem) { await updateItem.mutateAsync({ id: editingItem.id, ...payload }); toast.success('Cập nhật thành công'); }
            else { await createItem.mutateAsync(payload); toast.success('Thêm món thành công'); }
            setShowItemModal(false);
        } catch { toast.error('Có lỗi xảy ra'); }
    }, [editingItem, createItem, updateItem]);

    const handleDelete = useCallback(async () => {
        if (!deleteId) return;
        try {
            if (deleteType === 'item') { await deleteItem.mutateAsync(deleteId); toast.success('Đã xóa món ăn'); }
            else if (deleteType === 'set-menu') { await deleteSetMenu.mutateAsync(deleteId); toast.success('Đã xóa combo'); }
            else if (deleteType === 'category') { await deleteCategory.mutateAsync(deleteId); toast.success('Đã xóa danh mục'); }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Không thể xóa';
            toast.error(msg.includes('referenced') ? 'Danh mục đang có món, không thể xóa' : msg);
        }
        setDeleteId(null);
    }, [deleteId, deleteType, deleteItem, deleteSetMenu, deleteCategory]);

    const handleToggleActive = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try { await toggleActive.mutateAsync(id); } catch { toast.error('Không thể thay đổi trạng thái'); }
    }, [toggleActive]);


    const handleSaveCategory = useCallback(async (form: { name: string; code: string; description: string; item_type: string }) => {
        try {
            if (editingCategoryId) { await updateCategory.mutateAsync({ id: editingCategoryId, ...form }); toast.success('Cập nhật danh mục thành công'); }
            else { await createCategory.mutateAsync(form); toast.success('Thêm danh mục thành công'); }
            setShowCategoryModal(false);
        } catch { toast.error('Có lỗi xảy ra'); }
    }, [editingCategoryId, createCategory, updateCategory]);

    const handleSaveSetMenu = useCallback(async (data: { name: string; description?: string; selling_price: number; items: Array<{ menu_item_id: string; quantity: number }> }) => {
        const payload = { ...data, items: data.items as any };
        try {
            if (editingSetMenu) { await updateSetMenu.mutateAsync({ id: editingSetMenu.id, ...payload }); toast.success('Cập nhật combo thành công'); }
            else { await createSetMenu.mutateAsync(payload); toast.success('Tạo combo thành công'); }
            setShowSetMenuModal(false);
        } catch { toast.error('Có lỗi xảy ra'); }
    }, [editingSetMenu, createSetMenu, updateSetMenu]);

    const handleAddIngredient = useCallback(async (inv: { id: string; name: string; uom: string }, qty: number, uom: string) => {
        if (!recipeItemId) return;
        try {
            await addRecipeIngredient.mutateAsync({ itemId: recipeItemId, ingredient_id: inv.id, ingredient_name: inv.name, quantity_per_unit: qty, uom });
            toast.success(`Đã thêm ${inv.name}`);
            setIngredientSearch('');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Không thể thêm';
            toast.error(msg.includes('already') ? 'Nguyên liệu đã có trong công thức' : msg);
        }
    }, [recipeItemId, addRecipeIngredient]);

    const handleRemoveIngredient = useCallback(async (recipeId: string) => {
        if (!recipeItemId) return;
        try { await deleteRecipeIngredient.mutateAsync({ itemId: recipeItemId, recipeId }); toast.success('Đã xóa nguyên liệu'); }
        catch { toast.error('Không thể xóa'); }
    }, [recipeItemId, deleteRecipeIngredient]);

    const handleUpdateIngredient = useCallback(async (recipeId: string, ingredientId: string, ingredientName: string, qty: number, uom: string) => {
        if (!recipeItemId) return;
        try {
            await updateRecipeIngredient.mutateAsync({ itemId: recipeItemId, recipeId, ingredient_id: ingredientId, ingredient_name: ingredientName, quantity_per_unit: qty, uom });
            toast.success('Đã cập nhật số lượng');
        } catch { toast.error('Không thể cập nhật'); }
    }, [recipeItemId, updateRecipeIngredient]);

    const handleCreateIngredient = useCallback(async (name: string, uom: string, qty?: number) => {
        if (!recipeItemId) return;
        try {
            const sku = `NL-${Date.now().toString(36).toUpperCase()}`;
            const newItem = await createInventoryItem.mutateAsync({ name, sku, uom, cost_price: 0 });
            await addRecipeIngredient.mutateAsync({
                itemId: recipeItemId,
                ingredient_id: newItem.id, ingredient_name: newItem.name,
                quantity_per_unit: qty || 1, uom: newItem.uom,
            });
            setIngredientSearch('');
            toast.success(`Đã tạo "${name}" và thêm vào công thức`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Không thể tạo nguyên liệu';
            toast.error(msg);
        }
    }, [recipeItemId, createInventoryItem, addRecipeIngredient]);

    // === Primary add ===
    const handlePrimaryAdd = () => {
        if (activeTab === 'items' || activeTab === 'services') { setEditingItem(null); setShowItemModal(true); }
        else if (activeTab === 'set-menus') { setEditingSetMenu(null); setShowSetMenuModal(true); }
        else if (activeTab === 'categories') { setEditingCategoryId(null); setCategoryInitialData({ name: '', code: '', description: '', item_type: 'FOOD' }); setShowCategoryModal(true); }
    };
    const primaryAddLabel = activeTab === 'items' ? 'Thêm món' : activeTab === 'services' ? 'Thêm DV' : activeTab === 'set-menus' ? 'Thêm combo' : 'Thêm danh mục';

    // === Export config ===
    const categoryMap = useMemo(() => { const m = new Map<string, string>(); categories.forEach(c => m.set(c.id, c.name)); return m; }, [categories]);

    const colDef = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({ key, header, format: 'text', ...opts });

    const menuExportConfig = useMemo((): ExportConfig => {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const kpiCards: KpiCard[] = [
            { label: 'TỔNG MÓN', value: stats?.total_items ?? items.length, format: 'number', trend: 0, trendLabel: '', bgColor: 'E3F2FD', valueColor: '1565C0', icon: '🍽️' },
            { label: 'ĐANG BÁN', value: stats?.active_items ?? 0, format: 'number', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '✅' },
            { label: 'DANH MỤC', value: stats?.total_categories ?? categories.length, format: 'number', trend: 0, trendLabel: '', bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '📁' },
            { label: 'FOOD COST TB', value: stats?.avg_food_cost_pct ?? 0, format: 'number', trend: 0, trendLabel: '', bgColor: 'FFF3E0', valueColor: 'E65100', icon: '📊' },
        ];
        const dataRows = items.map(i => {
            const costPct = i.selling_price > 0 ? Math.round((i.cost_price / i.selling_price) * 100) : 0;
            return { name: i.name, category: i.category_name || categoryMap.get(i.category_id || '') || '', uom: i.uom || 'Món', cost_price: i.cost_price || 0, selling_price: i.selling_price || 0, food_cost_pct: costPct, status: i.is_active ? 'Đang bán' : 'Ngừng' };
        });
        const sheets: ReportSheet[] = [{
            name: 'Thực đơn', title: 'Báo cáo Thực đơn', subtitle: `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`, kpiCards, columns: [
                colDef('name', 'Tên món', { width: 28 }), colDef('category', 'Danh mục', { width: 16 }), colDef('uom', 'ĐVT', { width: 10, alignment: 'center' }),
                colDef('cost_price', 'Giá vốn', { format: 'currency', width: 16, summaryFn: 'avg' }), colDef('selling_price', 'Giá bán', { format: 'currency', width: 16, summaryFn: 'avg' }),
                colDef('food_cost_pct', 'Food Cost %', { format: 'number', width: 14, alignment: 'center' }), colDef('status', 'Trạng thái', { format: 'status', width: 14 }),
            ], data: dataRows, summaryRow: true
        }];
        return {
            title: 'Báo cáo Thực đơn', columns: [
                { key: 'name', header: 'Tên món' }, { key: 'category', header: 'Danh mục' }, { key: 'uom', header: 'ĐVT' },
                { key: 'cost_price', header: 'Giá vốn', format: (v) => formatCurrency(v as number) }, { key: 'selling_price', header: 'Giá bán', format: (v) => formatCurrency(v as number) },
                { key: 'food_cost_pct', header: 'Food Cost %' }, { key: 'status', header: 'Trạng thái' },
            ], data: dataRows, filename: `bao-cao-thuc-don_${today}`, sheets,
        };
    }, [items, categories, categoryMap, stats]);

    const handleMenuExport = async (format: ExportFormat, filename: string) => {
        await exportData(format, { ...menuExportConfig, filename });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Thực đơn</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý món ăn, combo & công thức</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="gap-1.5 border-gray-300 hover:border-[#c2185b] hover:text-[#c2185b] transition-colors">
                        <IconDownload className="h-4 w-4" /><span className="hidden sm:inline">Xuất báo cáo</span>
                    </Button>
                    <PermissionGate module="menu" action="create">
                        <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" onClick={handlePrimaryAdd}>
                            <IconPlus className="mr-2 h-4 w-4" />{primaryAddLabel}
                        </Button>
                    </PermissionGate>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                {[
                    { label: 'Tổng món', value: stats?.total_items ?? '-', icon: IconToolsKitchen, bg: 'bg-blue-50', ic: 'text-blue-600' },
                    { label: 'Đang bán', value: stats?.active_items ?? '-', icon: IconCheck, bg: 'bg-green-50', ic: 'text-green-600' },
                    { label: 'Dịch vụ', value: serviceItems.length || '-', icon: IconBuildingStore, bg: 'bg-orange-50', ic: 'text-orange-600' },
                    { label: 'Danh mục', value: stats?.total_categories ?? '-', icon: IconCategory, bg: 'bg-purple-50', ic: 'text-purple-600' },
                    { label: 'Food Cost TB', value: stats?.avg_food_cost_pct ? `${stats.avg_food_cost_pct}%` : '-', icon: IconPercentage, bg: 'bg-amber-50', ic: 'text-amber-600' },
                ].map((s, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className={`p-1.5 md:p-2 rounded-lg ${s.bg}`}><s.icon className={`h-4 w-4 md:h-5 md:w-5 ${s.ic}`} /></div>
                                <div><p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p><p className="text-base md:text-lg font-bold tabular-nums">{s.value}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            {/* Tabs */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
                        <TabsTrigger value="items" className="gap-2"><IconToolsKitchen className="h-4 w-4" /><span className="hidden sm:inline">Thực đơn</span></TabsTrigger>
                        <TabsTrigger value="services" className="gap-2"><IconBuildingStore className="h-4 w-4" /><span className="hidden sm:inline">Dịch vụ</span></TabsTrigger>
                        <TabsTrigger value="set-menus" className="gap-2"><IconPackage className="h-4 w-4" /><span className="hidden sm:inline">Combo</span></TabsTrigger>
                        <TabsTrigger value="categories" className="gap-2"><IconCategory className="h-4 w-4" /><span className="hidden sm:inline">Danh mục</span></TabsTrigger>
                        <TabsTrigger value="analytics" className="gap-2"><IconChartBar className="h-4 w-4" /><span className="hidden sm:inline">Phân tích</span></TabsTrigger>
                    </TabsList>

                    <TabsContent value="items" className="mt-4">
                        <MenuItemsList
                            items={items} categories={categories} isLoading={isLoading}
                            filterCategoryId={filterCategoryId} setFilterCategoryId={setFilterCategoryId}
                            search={search} setSearch={setSearch}
                            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['menu-items'] })}
                            onEdit={(item) => { setEditingItem(item); setShowItemModal(true); }}
                            onDelete={(id) => { setDeleteId(id); setDeleteType('item'); }}
                            onToggleActive={handleToggleActive}
                            onOpenRecipe={(id) => setRecipeItemId(id)}
                            onAdd={() => { setEditingItem(null); setShowItemModal(true); }}
                        />
                    </TabsContent>

                    <TabsContent value="services" className="mt-4">
                        <ServiceItemsList
                            items={serviceItems}
                            categories={serviceCategories.filter(c => c.item_type === 'SERVICE')}
                            isLoading={serviceItemsLoading}
                            search={serviceSearch}
                            setSearch={setServiceSearch}
                            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['menu-items'] })}
                            onEdit={(item) => { setEditingItem(item); setShowItemModal(true); }}
                            onDelete={(id) => { setDeleteId(id); setDeleteType('item'); }}
                            onAdd={() => { setEditingItem(null); setShowItemModal(true); }}
                        />
                    </TabsContent>

                    <TabsContent value="set-menus" className="mt-4">
                        <SetMenusList
                            setMenus={setMenus} isLoading={setMenusLoading}
                            onEdit={(sm) => { setEditingSetMenu(sm); setShowSetMenuModal(true); }}
                            onDelete={(id) => { setDeleteId(id); setDeleteType('set-menu'); }}
                            onAdd={() => { setEditingSetMenu(null); setShowSetMenuModal(true); }}
                        />
                    </TabsContent>

                    <TabsContent value="categories" className="mt-4">
                        <CategoriesList
                            categories={categories} items={items}
                            onEdit={(cat) => { setEditingCategoryId(cat.id); setCategoryInitialData({ name: cat.name, code: cat.code || '', description: cat.description || '', item_type: cat.item_type || 'FOOD' }); setShowCategoryModal(true); }}
                            onDelete={(id) => { setDeleteId(id); setDeleteType('category'); }}
                        />
                    </TabsContent>

                    <TabsContent value="analytics" className="mt-4">
                        <MenuAnalytics engineeringData={engineeringData} topSellers={topSellers} categoryBreakdown={categoryBreakdown} />
                    </TabsContent>
                </Tabs>
            </motion.div>

            {/* ===== MODALS ===== */}
            <MenuItemModal
                open={showItemModal} onClose={() => setShowItemModal(false)}
                editing={editingItem}
                categories={activeTab === 'services'
                    ? categories.filter(c => (c.item_type || 'FOOD') === 'SERVICE')
                    : categories.filter(c => (c.item_type || 'FOOD') !== 'SERVICE')
                }
                onSave={handleSaveItem} isPending={createItem.isPending || updateItem.isPending}
                isService={activeTab === 'services'}
            />
            <CategoryModal
                open={showCategoryModal} onClose={() => setShowCategoryModal(false)}
                editingId={editingCategoryId} onSave={handleSaveCategory}
                initialData={categoryInitialData} isPending={createCategory.isPending || updateCategory.isPending}
            />
            <SetMenuModal
                open={showSetMenuModal} onClose={() => setShowSetMenuModal(false)}
                editing={editingSetMenu} onSave={handleSaveSetMenu}
                isPending={createSetMenu.isPending || updateSetMenu.isPending}
                searchItems={setMenuSearchItems} searchQuery={setMenuItemSearch} setSearchQuery={setSetMenuItemSearch}
            />
            <DeleteConfirmDialog
                open={!!deleteId} onClose={() => setDeleteId(null)}
                onConfirm={handleDelete} type={deleteType}
            />
            <RecipeDrawer
                open={!!recipeItemId} onClose={() => { setRecipeItemId(null); setIngredientSearch(''); }}
                recipeData={recipeData} foodCostData={foodCostData}
                inventoryResults={inventoryResults} ingredientSearch={ingredientSearch} setIngredientSearch={setIngredientSearch}
                onAddIngredient={handleAddIngredient} onRemoveIngredient={handleRemoveIngredient}
                onUpdateIngredient={handleUpdateIngredient}
                onCreateIngredient={handleCreateIngredient}
                addPending={addRecipeIngredient.isPending} deletePending={deleteRecipeIngredient.isPending}
                updatePending={updateRecipeIngredient.isPending}
                createPending={createInventoryItem.isPending}
            />
            <ExportDialog
                open={exportOpen} onOpenChange={setExportOpen}
                onExport={handleMenuExport} defaultFilename={menuExportConfig.filename}
                title="Xuất báo cáo Thực đơn" isExporting={isExporting}
            />
        </div>
    );
}

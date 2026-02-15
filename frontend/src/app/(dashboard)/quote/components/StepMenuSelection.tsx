'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    IconSearch, IconClipboardList, IconToolsKitchen2,
    IconChevronDown, IconLoader2,
} from '@tabler/icons-react';
import { formatCurrency } from '@/lib/utils';
import { WizardState } from './quote-wizard-types';
import { useSmartMatch } from '@/hooks/use-menu';

interface Props {
    state: WizardState;
}

export function StepMenuSelection({ state }: Props) {
    const {
        menuSearchTerm, setMenuSearchTerm,
        selectedCategory, setSelectedCategory,
        showBulkPasteDialog, setShowBulkPasteDialog,
        bulkPasteText, setBulkPasteText,
        collapsedCategories, setCollapsedCategories,
        selectedItems, selectedItemsData,
        toggleMenuItem, handleBulkPaste,
        foodCategories, groupedMenuItems,
        menuLoading, categoriesLoading,
        menuTotal, menuTotalWithTables, tableCount,
    } = state;

    const smartMatchMutation = useSmartMatch();

    return (
        <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Tìm món..."
                        value={menuSearchTerm}
                        onChange={(e) => setMenuSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant={selectedCategory === null ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(null)}
                    >
                        Tất cả
                    </Button>
                    {!categoriesLoading && foodCategories.map((cat) => (
                        <Button
                            key={cat.id}
                            variant={selectedCategory === cat.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(cat.id)}
                        >
                            {cat.name}
                        </Button>
                    ))}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkPasteDialog(true)}
                        className="ml-auto"
                    >
                        <IconClipboardList className="h-4 w-4 mr-1" />
                        Dán DS
                    </Button>
                </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {menuLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        groupedMenuItems.map((group) => {
                            const isCollapsed = collapsedCategories.has(group.category.id);
                            const selectedInCategory = group.items.filter(i => selectedItems.includes(i.id)).length;

                            return (
                                <div key={group.category.id} className="border rounded-lg overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCollapsedCategories(prev => {
                                                const next = new Set(prev);
                                                if (next.has(group.category.id)) next.delete(group.category.id);
                                                else next.add(group.category.id);
                                                return next;
                                            });
                                        }}
                                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                        aria-expanded={!isCollapsed}
                                        aria-label={`${isCollapsed ? 'Mở rộng' : 'Thu gọn'} ${group.category.name}`}
                                    >
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <IconToolsKitchen2 className="h-4 w-4 text-purple-600" />
                                            {group.category.name} ({group.items.length})
                                            {selectedInCategory > 0 && (
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                                    {selectedInCategory} đã chọn
                                                </span>
                                            )}
                                        </h4>
                                        <IconChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
                                    </button>
                                    {!isCollapsed && (
                                        <div className="px-4 pb-4 space-y-2">
                                            {group.items.map((item) => (
                                                <label
                                                    key={item.id}
                                                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedItems.includes(item.id)
                                                        ? 'bg-purple-50 border-2 border-purple-500'
                                                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Checkbox
                                                            checked={selectedItems.includes(item.id)}
                                                            onCheckedChange={() => toggleMenuItem(item)}
                                                        />
                                                        <span className="text-sm min-w-0 truncate">{item.name}</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                        {formatCurrency(Number(item.selling_price))}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Selected Items Summary */}
                <div className="lg:col-span-1">
                    <div className="sticky top-[140px] border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Món đã chọn</h4>
                        {selectedItemsData.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Chưa chọn món nào</p>
                        ) : (
                            <div className="space-y-2">
                                {selectedItemsData.map((item, idx) => (
                                    <div key={item.id} className="flex justify-between text-sm gap-2">
                                        <span className="min-w-0 truncate">{idx + 1}. {item.name}</span>
                                        <span className="text-gray-600 dark:text-gray-400 shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(Number(item.selling_price))}</span>
                                    </div>
                                ))}
                                <div className="border-t pt-2 mt-3">
                                    <div className="flex justify-between font-medium">
                                        <span>Tổng/bàn:</span>
                                        <span className="text-purple-600" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(menuTotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        <span>x {tableCount} bàn:</span>
                                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(menuTotalWithTables)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bulk Paste Dialog */}
            <Dialog open={showBulkPasteDialog} onOpenChange={setShowBulkPasteDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <IconClipboardList className="h-5 w-5" />
                            Dán danh sách món ăn
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Dán danh sách món ăn (mỗi dòng một món). Hệ thống sẽ tự động tìm kiếm và chọn các món phù hợp.
                        </p>
                        <Textarea
                            name="bulk-paste"
                            placeholder={`Ví dụ:\n1. Tôm chiên rế SG Xưa + nem nướng\n2. Gà ta hấp đồng quê + xôi\n3. Nai né thiên lý\n4. Lẩu riêu cua bắp bò + bún`}
                            value={bulkPasteText}
                            onChange={(e) => setBulkPasteText(e.target.value)}
                            className="min-h-[150px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulkPasteDialog(false)}>Hủy</Button>
                        <Button onClick={handleBulkPaste} disabled={!bulkPasteText.trim() || smartMatchMutation.isPending}>
                            {smartMatchMutation.isPending ? (
                                <><IconLoader2 className="h-4 w-4 animate-spin mr-2" />Đang tìm…</>
                            ) : 'Tìm và chọn món'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

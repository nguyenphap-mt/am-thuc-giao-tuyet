'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
    IconTool,
} from '@tabler/icons-react';
import {
    useEquipmentStats,
    useEquipmentCheckouts,
    useEquipmentCheckout,
    useEquipmentCheckin,
    useEquipmentItems,
    useDefaultWarehouse,
    type EquipmentCheckout as EquipmentCheckoutType,
} from '@/hooks/use-inventory';
import { EquipmentKpiCards } from './EquipmentKpiCards';
import { CheckoutListCard } from './CheckoutListCard';
import { CheckoutModal } from './CheckoutModal';
import { CheckinModal } from './CheckinModal';


/**
 * EquipmentTab — Orchestrator component for CCDC management.
 * Split into sub-components for maintainability (fix FE-01).
 */
export function EquipmentTab() {
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchInput, setSearchInput] = useState('');
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [selectedCheckout, setSelectedCheckout] = useState<EquipmentCheckoutType | null>(null);

    // Data hooks
    const { data: eqStats, isLoading: statsLoading } = useEquipmentStats();
    const { data: checkoutsData, isLoading: checkoutsLoading } = useEquipmentCheckouts(undefined, statusFilter || undefined);
    const { data: defaultWarehouse } = useDefaultWarehouse();
    // Server-side equipment filter (fix FE-02)
    const { data: equipmentItemsData } = useEquipmentItems();

    // Mutations
    const checkoutMutation = useEquipmentCheckout();
    const checkinMutation = useEquipmentCheckin();

    const equipmentItems = useMemo(() =>
        equipmentItemsData?.items || [],
        [equipmentItemsData]
    );

    const handleCheckout = (data: {
        items: Array<{ item_id: string; quantity: number }>;
        expected_return_date?: string;
        notes?: string;
    }) => {
        if (!defaultWarehouse?.id) {
            toast.error('Không tìm thấy kho mặc định');
            return;
        }
        checkoutMutation.mutate({
            warehouse_id: defaultWarehouse.id,
            items: data.items,
            expected_return_date: data.expected_return_date,
            notes: data.notes,
        }, {
            onSuccess: () => {
                setShowCheckoutModal(false);
            },
        });
    };

    const handleCheckin = (data: { checkoutId: string; data: { returns: Array<{ item_id: string; returned_qty: number; damaged_qty?: number; damage_notes?: string }> } }) => {
        checkinMutation.mutate(data, {
            onSuccess: () => {
                setShowCheckinModal(false);
                setSelectedCheckout(null);
            },
        });
    };

    const openCheckinModal = (checkout: EquipmentCheckoutType) => {
        setSelectedCheckout(checkout);
        setShowCheckinModal(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <IconTool className="h-5 w-5 text-accent-primary" />
                    <h2 className="text-lg font-semibold text-gray-900">Quản lý Dụng cụ (CCDC)</h2>
                </div>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <EquipmentKpiCards stats={eqStats} isLoading={statsLoading} />
            </motion.div>

            <CheckoutListCard
                checkoutsData={checkoutsData}
                isLoading={checkoutsLoading}
                statusFilter={statusFilter}
                searchInput={searchInput}
                onStatusFilterChange={setStatusFilter}
                onSearchChange={setSearchInput}
                onCheckout={() => setShowCheckoutModal(true)}
                onCheckin={openCheckinModal}
            />

            <CheckoutModal
                open={showCheckoutModal}
                onOpenChange={setShowCheckoutModal}
                equipmentItems={equipmentItems}
                onSubmit={handleCheckout}
                isPending={checkoutMutation.isPending}
            />

            <CheckinModal
                open={showCheckinModal}
                onOpenChange={setShowCheckinModal}
                checkout={selectedCheckout}
                onSubmit={handleCheckin}
                isPending={checkinMutation.isPending}
            />
        </div>
    );
}

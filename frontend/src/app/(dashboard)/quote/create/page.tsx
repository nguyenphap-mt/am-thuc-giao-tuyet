'use client';

import { useRouter } from 'next/navigation';
import { useCreateQuote } from '@/hooks/use-quotes';
import { QuoteWizard, useQuoteWizardState } from '../components';

/**
 * Create Quote Page — thin wrapper around shared QuoteWizard.
 * Before refactoring: 1,698 LOC. After: ~30 LOC.
 */
export default function QuoteCreatePage() {
    const router = useRouter();
    const createMutation = useCreateQuote();
    const state = useQuoteWizardState();

    const handleSubmit = () => {
        createMutation.mutate(
            state.buildPayload('NEW') as any,
            { onSuccess: () => router.push('/quote') }
        );
    };

    const handleSaveDraft = () => {
        createMutation.mutate(
            state.buildPayload('DRAFT') as any,
            { onSuccess: () => router.push('/quote') }
        );
    };

    return (
        <QuoteWizard
            mode="create"
            state={state}
            isPending={createMutation.isPending}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
        />
    );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconArrowRight, IconCheck } from '@tabler/icons-react';
import { WIZARD_STEPS, STEP_DESCRIPTIONS, WizardMode, WizardState } from './quote-wizard-types';
import { StepCustomerInfo } from './StepCustomerInfo';
import { StepMenuSelection } from './StepMenuSelection';
import { StepServices } from './StepServices';
import { StepReview } from './StepReview';
import { StepSubmit } from './StepSubmit';

interface QuoteWizardProps {
    mode: WizardMode;
    state: WizardState;
    isPending: boolean;
    onSubmit: () => void;
    onSaveDraft: () => void;
}

/**
 * Shared QuoteWizard component used by both Create and Edit pages.
 * Reduces ~3,500 LOC to ~100 LOC per page + ~200 LOC shared component.
 */
export function QuoteWizard({ mode, state, isPending, onSubmit, onSaveDraft }: QuoteWizardProps) {
    const { currentStep, setCurrentStep, handleNext, handleBack } = state;
    const totalSteps = 5;
    const title = mode === 'create' ? 'Tạo báo giá mới' : 'Chỉnh sửa báo giá';

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: return <StepCustomerInfo state={state} />;
            case 2: return <StepMenuSelection state={state} />;
            case 3: return <StepServices state={state} />;
            case 4: return <StepReview state={state} onGoToStep={setCurrentStep} />;
            case 5: return <StepSubmit state={state} mode={mode} isPending={isPending} onSubmit={onSubmit} onSaveDraft={onSaveDraft} />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Sticky Header */}
            <div className="sticky top-16 z-10 bg-white dark:bg-gray-950 -mx-6 px-6 py-3 border-b border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Quay lại" className="shrink-0">
                            <IconArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Bước {currentStep} / {totalSteps}: {WIZARD_STEPS[currentStep - 1].title}
                            </p>
                        </div>
                    </div>
                    {currentStep < 5 && (
                        <div className="flex items-center gap-3 shrink-0">
                            <Button type="button" variant="outline" onClick={handleBack}
                                aria-label={currentStep === 1 ? 'Hủy tạo báo giá' : 'Quay lại bước trước'}>
                                <IconArrowLeft className="mr-2 h-4 w-4" />
                                {currentStep === 1 ? 'Hủy' : 'Quay lại'}
                            </Button>
                            <Button type="button"
                                className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 transition-all duration-200 hover:shadow-lg"
                                onClick={handleNext} aria-label="Tiếp tục bước tiếp theo">
                                Tiếp tục
                                <IconArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-between overflow-x-auto pb-2">
                {WIZARD_STEPS.map((step, idx) => (
                    <div key={step.id} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-colors
                                ${step.id < currentStep ? 'bg-green-500 text-white' :
                                    step.id === currentStep ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white' :
                                        'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                {step.id < currentStep ? <IconCheck className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                            </div>
                            <span className={`mt-1 text-xs whitespace-nowrap ${step.id === currentStep ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                {step.title}
                            </span>
                        </div>
                        {idx < WIZARD_STEPS.length - 1 && (
                            <div className={`w-12 h-0.5 mx-2 ${step.id < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Form Card */}
            <Card className="shadow-lg">
                <CardHeader className="border-b bg-gray-50 dark:bg-gray-800/50">
                    <CardTitle className="flex items-center gap-2">
                        {(() => {
                            const StepIcon = WIZARD_STEPS[currentStep - 1].icon;
                            return <StepIcon className="h-5 w-5 text-purple-600" />;
                        })()}
                        {WIZARD_STEPS[currentStep - 1].title}
                    </CardTitle>
                    <CardDescription>{STEP_DESCRIPTIONS[currentStep]}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {renderStepContent()}
                </CardContent>
            </Card>
        </div>
    );
}

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    IconSun, IconMoon, IconDeviceDesktop, IconCheck, IconPalette,
    IconTypography, IconLayoutDashboard, IconRefresh, IconEye,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
    useAppearance,
    ACCENT_COLORS,
    FONT_SIZES,
    DENSITIES,
    type FontSize,
    type Density,
} from '@/hooks/use-appearance';
import { useState, useCallback, useRef } from 'react';

// P4: WAI-ARIA arrow key navigation for radiogroups
function useRadioGroupKeyboard<T extends { value: string }>(
    options: readonly T[],
    currentValue: string,
    setValue: (v: string) => void,
) {
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const currentIndex = options.findIndex((o) => o.value === currentValue);
            let nextIndex = currentIndex;

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                nextIndex = (currentIndex + 1) % options.length;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                nextIndex = (currentIndex - 1 + options.length) % options.length;
            } else if (e.key === 'Home') {
                nextIndex = 0;
            } else if (e.key === 'End') {
                nextIndex = options.length - 1;
            } else {
                return; // Don't prevent default for other keys
            }

            e.preventDefault();
            setValue(options[nextIndex].value);
            itemRefs.current[nextIndex]?.focus();
        },
        [options, currentValue, setValue],
    );

    return { handleKeyDown, itemRefs };
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

// Reduced-motion-safe variants
const reducedContainerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
};

const reducedItemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.1 } },
};

export function AppearanceTab() {
    const {
        theme, setTheme, resolvedTheme, mounted,
        accentColor, setAccentColor,
        fontSize, setFontSize,
        density, setDensity,
        resetAll,
    } = useAppearance();

    const prefersReducedMotion = useReducedMotion();
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const activeContainerVariants = prefersReducedMotion ? reducedContainerVariants : containerVariants;
    const activeItemVariants = prefersReducedMotion ? reducedItemVariants : itemVariants;

    const themeOptions = [
        { value: 'light', icon: IconSun, label: 'Sáng', desc: 'Nền trắng, rõ ràng' },
        { value: 'dark', icon: IconMoon, label: 'Tối', desc: 'Dễ nhìn ban đêm' },
        { value: 'system', icon: IconDeviceDesktop, label: 'Hệ thống', desc: 'Theo thiết bị' },
    ];

    // P4: Arrow key navigation for all radiogroups
    const themeKb = useRadioGroupKeyboard(themeOptions, theme, setTheme);
    const accentKb = useRadioGroupKeyboard(ACCENT_COLORS, accentColor, (v: string) => setAccentColor(v));
    const fontKb = useRadioGroupKeyboard(FONT_SIZES, fontSize, (v: string) => setFontSize(v as FontSize));
    const densityKb = useRadioGroupKeyboard(DENSITIES, density, (v: string) => setDensity(v as Density));

    const handleReset = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = () => {
        resetAll();
        setShowResetConfirm(false);
        toast.success('Đã đặt lại giao diện về mặc định');
    };

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <>
            <motion.div variants={activeContainerVariants} initial="hidden" animate="show" className="space-y-4">

                {/* Section 1: Theme Mode */}
                <motion.div variants={activeItemVariants}>
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}1a` }}>
                                    <IconSun className="h-4 w-4" style={{ color: accentColor }} aria-hidden="true" />
                                </div>
                                Chế độ hiển thị
                            </CardTitle>
                            <CardDescription className="text-sm">Chọn chế độ sáng, tối hoặc theo hệ thống</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Chế độ hiển thị" onKeyDown={themeKb.handleKeyDown}>
                                {themeOptions.map((option, idx) => {
                                    const isActive = theme === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            ref={(el) => { themeKb.itemRefs.current[idx] = el; }}
                                            role="radio"
                                            aria-checked={isActive}
                                            aria-label={`${option.label}: ${option.desc}`}
                                            tabIndex={isActive ? 0 : -1}
                                            onClick={() => setTheme(option.value)}
                                            className={`relative p-4 rounded-xl border-2 transition-[border-color,background-color,box-shadow] duration-200 ease-out flex flex-col items-center gap-2 cursor-pointer group
                                                ${isActive
                                                    ? 'border-transparent shadow-md'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-600 hover:shadow-sm'
                                                }`}
                                            style={isActive ? {
                                                borderColor: accentColor,
                                                backgroundColor: `${accentColor}0d`,
                                            } : undefined}
                                        >
                                            {/* Theme preview mini-card */}
                                            <div className={`w-full h-16 rounded-lg border overflow-hidden mb-1 transition-colors ${option.value === 'dark'
                                                ? 'bg-gray-900 border-gray-700'
                                                : option.value === 'light'
                                                    ? 'bg-white border-gray-200 dark:border-gray-700'
                                                    : 'bg-gradient-to-r from-white to-gray-900 border-gray-300 dark:border-gray-600'
                                                }`}>
                                                <div className="p-2 space-y-1">
                                                    <div className={`h-1.5 w-8 rounded-full ${option.value === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`} />
                                                    <div className={`h-1 w-12 rounded-full ${option.value === 'dark' ? 'bg-gray-700' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                                    <div className={`h-1 w-6 rounded-full ${option.value === 'dark' ? 'bg-gray-700' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                                </div>
                                            </div>

                                            <span className={`text-sm font-semibold transition-colors ${isActive ? '' : 'text-gray-700 dark:text-gray-300'}`}
                                                style={isActive ? { color: accentColor } : undefined}>
                                                {option.label}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{option.desc}</span>

                                            {/* Selected check */}
                                            {isActive && (
                                                <motion.div
                                                    initial={prefersReducedMotion ? false : { scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 25 }}
                                                    className="absolute -top-1.5 -right-1.5"
                                                >
                                                    <div className="h-5 w-5 rounded-full flex items-center justify-center shadow-sm"
                                                        style={{ backgroundColor: accentColor }}>
                                                        <IconCheck className="h-3 w-3 text-white" aria-hidden="true" />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Section 2: Accent Color */}
                <motion.div variants={activeItemVariants}>
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}1a` }}>
                                    <IconPalette className="h-4 w-4" style={{ color: accentColor }} aria-hidden="true" />
                                </div>
                                Màu chủ đạo
                            </CardTitle>
                            <CardDescription className="text-sm">Chọn màu sắc chính cho ứng dụng</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Màu chủ đạo" onKeyDown={accentKb.handleKeyDown}>
                                {ACCENT_COLORS.map((color, idx) => {
                                    const isActive = accentColor === color.value;
                                    return (
                                        <button
                                            key={color.value}
                                            ref={(el) => { accentKb.itemRefs.current[idx] = el; }}
                                            role="radio"
                                            aria-checked={isActive}
                                            aria-label={color.label}
                                            tabIndex={isActive ? 0 : -1}
                                            onClick={() => setAccentColor(color.value)}
                                            className="group flex flex-col items-center gap-1.5 cursor-pointer"
                                        >
                                            <div className={`relative h-10 w-10 rounded-full transition-[transform,box-shadow,ring] duration-200 ease-out
                                                ${isActive
                                                    ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-110'
                                                    : 'hover:scale-110 shadow-md'
                                                }`}
                                                style={{
                                                    backgroundColor: color.value,
                                                    outlineColor: isActive ? color.value : undefined,
                                                }}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        initial={prefersReducedMotion ? false : { scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute inset-0 flex items-center justify-center"
                                                    >
                                                        <IconCheck className="h-4 w-4 text-white drop-shadow-sm" aria-hidden="true" />
                                                    </motion.div>
                                                )}
                                            </div>
                                            <span className={`text-[10px] font-medium transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'}`}
                                                style={isActive ? { color: color.value } : undefined}>
                                                {color.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Section 3: Font Size */}
                <motion.div variants={activeItemVariants}>
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}1a` }}>
                                    <IconTypography className="h-4 w-4" style={{ color: accentColor }} aria-hidden="true" />
                                </div>
                                Cỡ chữ hiển thị
                            </CardTitle>
                            <CardDescription className="text-sm">Điều chỉnh kích thước chữ phù hợp</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Cỡ chữ hiển thị" onKeyDown={fontKb.handleKeyDown}>
                                {FONT_SIZES.map((option, idx) => {
                                    const isActive = fontSize === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            ref={(el) => { fontKb.itemRefs.current[idx] = el; }}
                                            role="radio"
                                            aria-checked={isActive}
                                            aria-label={`${option.label} (${option.bodyPx}px)`}
                                            tabIndex={isActive ? 0 : -1}
                                            onClick={() => setFontSize(option.value)}
                                            className={`relative p-4 rounded-xl border-2 transition-[border-color,background-color,box-shadow] duration-200 ease-out cursor-pointer
                                                ${isActive
                                                    ? 'border-transparent shadow-md'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-600'
                                                }`}
                                            style={isActive ? {
                                                borderColor: accentColor,
                                                backgroundColor: `${accentColor}0d`,
                                            } : undefined}
                                        >
                                            <div className="text-center">
                                                <span style={{ fontSize: `${option.bodyPx}px` }}
                                                    className={`font-semibold block mb-1 ${isActive ? '' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    Aa
                                                </span>
                                                <span className={`text-xs block ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}`}
                                                    style={isActive ? { color: accentColor } : undefined}>
                                                    {option.label}
                                                </span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                                                    {option.bodyPx}px
                                                </span>
                                            </div>

                                            {isActive && (
                                                <motion.div
                                                    initial={prefersReducedMotion ? false : { scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 25 }}
                                                    className="absolute -top-1.5 -right-1.5"
                                                >
                                                    <div className="h-5 w-5 rounded-full flex items-center justify-center shadow-sm"
                                                        style={{ backgroundColor: accentColor }}>
                                                        <IconCheck className="h-3 w-3 text-white" aria-hidden="true" />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Section 4: UI Density */}
                <motion.div variants={activeItemVariants}>
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}1a` }}>
                                    <IconLayoutDashboard className="h-4 w-4" style={{ color: accentColor }} aria-hidden="true" />
                                </div>
                                Mật độ giao diện
                            </CardTitle>
                            <CardDescription className="text-sm">Điều chỉnh khoảng cách giữa các phần tử</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Mật độ giao diện" onKeyDown={densityKb.handleKeyDown}>
                                {DENSITIES.map((option, idx) => {
                                    const isActive = density === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            ref={(el) => { densityKb.itemRefs.current[idx] = el; }}
                                            role="radio"
                                            aria-checked={isActive}
                                            aria-label={`${option.label}: ${option.description}`}
                                            tabIndex={isActive ? 0 : -1}
                                            onClick={() => setDensity(option.value)}
                                            className={`relative p-4 rounded-xl border-2 transition-[border-color,background-color,box-shadow] duration-200 ease-out cursor-pointer text-left
                                                ${isActive
                                                    ? 'border-transparent shadow-md'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-600'
                                                }`}
                                            style={isActive ? {
                                                borderColor: accentColor,
                                                backgroundColor: `${accentColor}0d`,
                                            } : undefined}
                                        >
                                            {/* Density preview lines */}
                                            <div className="mb-2 space-y-0.5" aria-hidden="true">
                                                {[1, 2, 3].map((line) => (
                                                    <div key={line}
                                                        className={`rounded-sm ${isActive ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                        style={{
                                                            height: `${3 * option.scale}px`,
                                                            marginBottom: `${3 * option.scale}px`,
                                                            width: line === 1 ? '100%' : line === 2 ? '75%' : '50%',
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <span className={`text-xs font-semibold block ${isActive ? '' : 'text-gray-700 dark:text-gray-300'}`}
                                                style={isActive ? { color: accentColor } : undefined}>
                                                {option.label}
                                            </span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                                                {option.description}
                                            </span>

                                            {isActive && (
                                                <motion.div
                                                    initial={prefersReducedMotion ? false : { scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 25 }}
                                                    className="absolute -top-1.5 -right-1.5"
                                                >
                                                    <div className="h-5 w-5 rounded-full flex items-center justify-center shadow-sm"
                                                        style={{ backgroundColor: accentColor }}>
                                                        <IconCheck className="h-3 w-3 text-white" aria-hidden="true" />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Live Preview Card */}
                <motion.div variants={activeItemVariants}>
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}1a` }}>
                                    <IconEye className="h-4 w-4" style={{ color: accentColor }} aria-hidden="true" />
                                </div>
                                Xem trước giao diện
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-white dark:bg-gray-900">
                                {/* Mini preview header */}
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: accentColor }} aria-hidden="true" />
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-gray-100"
                                            style={{ fontSize: FONT_SIZES.find(f => f.value === fontSize)?.bodyPx }}>
                                            Ẩm Thực Giao Tuyết
                                        </div>
                                        <div className="text-gray-500 dark:text-gray-400"
                                            style={{ fontSize: FONT_SIZES.find(f => f.value === fontSize)?.secondaryPx }}>
                                            Hệ thống quản lý dịch vụ
                                        </div>
                                    </div>
                                </div>

                                {/* Mini preview stats */}
                                <div className="grid grid-cols-3 gap-2">
                                    {['Đơn hàng', 'Khách hàng', 'Doanh thu'].map((label, i) => (
                                        <div key={label}
                                            className="rounded-lg border border-gray-100 dark:border-gray-800 p-2 text-center"
                                            style={{ padding: `${8 * (DENSITIES.find(d => d.value === density)?.scale || 1)}px` }}>
                                            <div className="font-bold text-gray-900 dark:text-gray-100 tabular-nums"
                                                style={{
                                                    fontSize: FONT_SIZES.find(f => f.value === fontSize)?.bodyPx,
                                                    color: i === 0 ? accentColor : undefined,
                                                }}>
                                                {[128, 45, '12.5M'][i]}
                                            </div>
                                            <div className="text-gray-500 dark:text-gray-400"
                                                style={{ fontSize: FONT_SIZES.find(f => f.value === fontSize)?.secondaryPx }}>
                                                {label}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Mini preview button */}
                                <div className="flex gap-2">
                                    <div className="h-8 rounded-lg px-3 flex items-center text-white text-xs font-medium"
                                        style={{ backgroundColor: accentColor }}>
                                        Nút hành động
                                    </div>
                                    <div className="h-8 rounded-lg px-3 flex items-center border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                                        Nút phụ
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Reset Button */}
                <motion.div variants={activeItemVariants}>
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 dark:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <IconRefresh className="mr-2 h-4 w-4" aria-hidden="true" />
                            Đặt lại mặc định
                        </Button>
                    </div>
                </motion.div>
            </motion.div>

            {/* P1: Reset Confirmation Dialog — AlertDialog with built-in focus trap + Escape */}
            <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Đặt lại giao diện?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tất cả cài đặt giao diện (chế độ, màu sắc, cỡ chữ, mật độ) sẽ trở về mặc định.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Đặt lại
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

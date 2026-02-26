'use client';

import { useState } from 'react';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
 IconFileSpreadsheet,
 IconFileText,
 IconFileTypeCsv,
 IconDownload,
 IconLoader2,
 IconCheck,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ExportFormat } from '@/hooks/use-report-export';

interface ExportDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onExport: (format: ExportFormat, filename: string) => Promise<void>;
 defaultFilename: string;
 title?: string;
 isExporting?: boolean;
}

const FORMAT_OPTIONS: {
 value: ExportFormat;
 label: string;
 description: string;
 icon: React.ElementType;
 color: string;
 bgColor: string;
 extension: string;
}[] = [
 {
 value: 'excel',
 label: 'Excel (.xlsx)',
 description: 'Bảng tính với định dạng đầy đủ',
 icon: IconFileSpreadsheet,
 color: 'text-emerald-600',
 bgColor: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
 extension: '.xlsx',
 },
 {
 value: 'csv',
 label: 'CSV (.csv)',
 description: 'Dữ liệu thuần, tương thích mọi phần mềm',
 icon: IconFileTypeCsv,
 color: 'text-blue-600',
 bgColor: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
 extension: '.csv',
 },
 {
 value: 'pdf',
 label: 'PDF (.pdf)',
 description: 'Văn bản cố định, phù hợp in ấn',
 icon: IconFileText,
 color: 'text-red-600',
 bgColor: 'bg-red-50 border-red-200 hover:bg-red-100',
 extension: '.pdf',
 },
 ];

export function ExportDialog({
 open,
 onOpenChange,
 onExport,
 defaultFilename,
 title = 'Xuất báo cáo',
 isExporting = false,
}: ExportDialogProps) {
 const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
 const [filename, setFilename] = useState(defaultFilename);
 const [exportDone, setExportDone] = useState(false);

 const handleExport = async () => {
 setExportDone(false);
 await onExport(selectedFormat, filename);
 setExportDone(true);
 // Auto-close after success
 setTimeout(() => {
 onOpenChange(false);
 setExportDone(false);
 }, 1200);
 };

 const selectedOption = FORMAT_OPTIONS.find(f => f.value === selectedFormat)!;

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-[480px]">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-lg">
 <IconDownload className="h-5 w-5 text-[#c2185b]" />
 {title}
 </DialogTitle>
 <DialogDescription>
 Chọn định dạng file và tên file để lưu báo cáo
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2">
 {/* Format Selection */}
 <div className="space-y-2">
 <Label className="text-sm font-medium text-gray-700">
 Định dạng xuất
 </Label>
 <div className="grid grid-cols-3 gap-2">
 {FORMAT_OPTIONS.map(opt => {
 const Icon = opt.icon;
 const isSelected = selectedFormat === opt.value;
 return (
 <button
 key={opt.value}
 type="button"
 onClick={() => setSelectedFormat(opt.value)}
 disabled={isExporting}
 className={`
 relative flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200
 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#c2185b]/30
 ${isSelected
 ? `${opt.bgColor} border-current ring-2 ring-${opt.color.split('-')[1]}-200`
 : 'bg-white border-gray-200 hover:bg-gray-50'
 }
 ${isExporting ? 'opacity-60 cursor-not-allowed' : ''}
 `}
 >
 <Icon className={`h-6 w-6 ${isSelected ? opt.color : 'text-gray-400'}`} />
 <span className={`text-xs font-medium ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
 {opt.label}
 </span>
 {isSelected && (
 <motion.div
 layoutId="format-check"
 className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${opt.color.replace('text-', 'bg-')}`}
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ type: 'spring', stiffness: 500, damping: 30 }}
 >
 <IconCheck className="h-3 w-3 text-white" />
 </motion.div>
 )}
 </button>
 );
 })}
 </div>
 <p className="text-xs text-gray-500 mt-1">
 {selectedOption.description}
 </p>
 </div>

 {/* Filename Input */}
 <div className="space-y-2">
 <Label htmlFor="export-filename" className="text-sm font-medium text-gray-700">
 Tên file
 </Label>
 <div className="flex items-center gap-1">
 <Input
 id="export-filename"
 value={filename}
 onChange={(e) => setFilename(e.target.value)}
 placeholder="Tên file..."
 disabled={isExporting}
 className="flex-1"
 />
 <span className="text-sm text-gray-400 font-mono whitespace-nowrap">
 {selectedOption.extension}
 </span>
 </div>
 </div>

 {/* Info Note */}
 <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
 <span className="text-amber-500 text-xs mt-0.5">💡</span>
 <p className="text-xs text-amber-700 leading-relaxed">
 {selectedFormat === 'pdf'
 ? 'PDF sẽ xuất giao diện báo cáo hiện tại dưới dạng hình ảnh. Để có kết quả tốt nhất, hãy mở rộng toàn bộ dữ liệu trước khi xuất.'
 : 'Hệ thống sẽ mở hộp thoại để bạn chọn nơi lưu file. Nếu trình duyệt không hỗ trợ, file sẽ được tải về thư mục Downloads.'
 }
 </p>
 </div>
 </div>

 <DialogFooter className="gap-2 sm:gap-0">
 <Button
 variant="ghost"
 onClick={() => onOpenChange(false)}
 disabled={isExporting}
 >
 Hủy
 </Button>
 <AnimatePresence mode="wait">
 {exportDone ? (
 <motion.div
 key="done"
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.8, opacity: 0 }}
 >
 <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
 <IconCheck className="h-4 w-4" />
 Hoàn tất!
 </Button>
 </motion.div>
 ) : (
 <motion.div
 key="export"
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.8, opacity: 0 }}
 >
 <Button
 onClick={handleExport}
 disabled={isExporting || !filename.trim()}
 className="gap-1.5"
 style={{
 background: 'linear-gradient(90deg, #c2185b 0%, #7b1fa2 50%, #512da8 100%)',
 }}
 >
 {isExporting ? (
 <>
 <IconLoader2 className="h-4 w-4 animate-spin" />
 Đang xuất...
 </>
 ) : (
 <>
 <IconDownload className="h-4 w-4" />
 Xuất file
 </>
 )}
 </Button>
 </motion.div>
 )}
 </AnimatePresence>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}

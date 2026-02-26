'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    IconChevronDown,
    IconChevronUp,
    IconInfoCircle,
    IconCheck,
    IconX,
} from '@tabler/icons-react';

interface LeaveType {
    code: string;
    name: string;
    days_per_year: number;
    is_paid: boolean;
    requires_approval: boolean;
}

interface LeavePolicyCardProps {
    leaveTypes: LeaveType[];
}

export default function LeavePolicyCard({ leaveTypes }: LeavePolicyCardProps) {
    const [expanded, setExpanded] = useState(false);

    if (!leaveTypes?.length) return null;

    return (
        <Card className="border-blue-100 bg-blue-50/30">
            <CardContent className="p-0">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50/50 transition-colors rounded-lg cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <IconInfoCircle className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                            Quy định nghỉ phép ({leaveTypes.length} loại)
                        </span>
                    </div>
                    {expanded ? (
                        <IconChevronUp className="h-4 w-4 text-blue-500" />
                    ) : (
                        <IconChevronDown className="h-4 w-4 text-blue-500" />
                    )}
                </button>

                {expanded && (
                    <div className="px-4 pb-3 space-y-2">
                        <div className="grid gap-2">
                            {leaveTypes.map((type) => (
                                <div
                                    key={type.code}
                                    className="flex items-center justify-between p-2 rounded-md bg-white border"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{type.name}</span>
                                        {type.is_paid ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] px-1.5">
                                                Có lương
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-gray-50 text-gray-500 text-[10px] px-1.5">
                                                Không lương
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span className="font-medium text-gray-700">
                                            {type.days_per_year} ngày/năm
                                        </span>
                                        <div className="flex items-center gap-0.5">
                                            {type.requires_approval ? (
                                                <>
                                                    <IconCheck className="h-3 w-3 text-amber-500" />
                                                    <span>Cần duyệt</span>
                                                </>
                                            ) : (
                                                <>
                                                    <IconX className="h-3 w-3 text-gray-400" />
                                                    <span>Tự động</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

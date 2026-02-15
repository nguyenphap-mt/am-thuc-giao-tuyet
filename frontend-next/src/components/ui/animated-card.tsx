'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactNode } from 'react';

interface AnimatedCardProps {
    title?: string;
    children: ReactNode;
    delay?: number;
    className?: string;
}

export function AnimatedCard({ title, children, delay = 0, className }: AnimatedCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.4,
                delay,
                ease: [0.25, 0.46, 0.45, 0.94]
            }}
        >
            <Card className={className}>
                {title && (
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            {title}
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent>{children}</CardContent>
            </Card>
        </motion.div>
    );
}

// Container for stagger animations
export function AnimatedContainer({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            className={className}
            initial="hidden"
            animate="show"
            variants={{
                hidden: { opacity: 0 },
                show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                }
            }}
        >
            {children}
        </motion.div>
    );
}

// Individual animated item for use inside container
export function AnimatedItem({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            className={className}
            variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 }
            }}
        >
            {children}
        </motion.div>
    );
}

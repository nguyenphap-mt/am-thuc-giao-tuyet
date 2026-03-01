// Material Design 3 — Design Tokens for Ẩm Thực Giao Tuyết Mobile
// Reference: material.io/design, Android M3 Expressive (May 2025)

// ============ COLOR SYSTEM ============
// Full MD3 tonal palette based on primary #c2185b

export const Colors = {
    // --- Primary ---
    primary: '#c2185b',
    onPrimary: '#ffffff',
    primaryContainer: '#fce4ec',
    onPrimaryContainer: '#3e001d',
    primaryDark: '#7b1fa2',
    primaryDeep: '#512da8',

    // --- Secondary ---
    secondary: '#625b71',
    onSecondary: '#ffffff',
    secondaryContainer: '#e8def8',
    onSecondaryContainer: '#1d192b',

    // --- Tertiary ---
    tertiary: '#7d5260',
    onTertiary: '#ffffff',
    tertiaryContainer: '#ffd8e4',
    onTertiaryContainer: '#31111d',

    // --- Error ---
    error: '#ef4444',
    onError: '#ffffff',
    errorContainer: '#fce4ec',
    onErrorContainer: '#410002',

    // --- Surface ---
    surface: '#ffffff',
    surfaceVariant: '#f3edf7',
    onSurface: '#1c1b1f',
    onSurfaceVariant: '#49454f',
    surfaceDim: '#ded8e1',
    surfaceBright: '#fef7ff',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f7f2fa',
    surfaceContainer: '#f3edf7',
    surfaceContainerHigh: '#ece6f0',
    surfaceContainerHighest: '#e6e0e9',

    // --- Outline ---
    outline: '#79747e',
    outlineVariant: '#cac4d0',

    // --- Inverse ---
    inverseSurface: '#313033',
    inverseOnSurface: '#f4eff4',
    inversePrimary: '#d0bcff',

    // --- Scrim ---
    scrim: 'rgba(0, 0, 0, 0.32)',

    // --- Status (semantic) ---
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#3b82f6',

    // --- Legacy aliases (backward-compat) ---
    bgPrimary: '#ffffff',
    bgSecondary: '#fafafa',
    bgTertiary: '#f5f5f5',
    textPrimary: '#1a1a2e',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    shadow: 'rgba(0, 0, 0, 0.08)',

    // --- Gradient ---
    gradientStart: '#c2185b',
    gradientMid: '#7b1fa2',
    gradientEnd: '#512da8',
};

// ============ TYPOGRAPHY (MD3 Type Scale) ============
// Reference: material.io/design/typography

export const Typography = {
    displayLarge: { fontSize: 57, fontWeight: '400' as const, lineHeight: 64, letterSpacing: -0.25 },
    displayMedium: { fontSize: 45, fontWeight: '400' as const, lineHeight: 52 },
    displaySmall: { fontSize: 36, fontWeight: '400' as const, lineHeight: 44 },
    headlineLarge: { fontSize: 32, fontWeight: '400' as const, lineHeight: 40 },
    headlineMedium: { fontSize: 28, fontWeight: '400' as const, lineHeight: 36 },
    headlineSmall: { fontSize: 24, fontWeight: '400' as const, lineHeight: 32 },
    titleLarge: { fontSize: 22, fontWeight: '500' as const, lineHeight: 28 },
    titleMedium: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24, letterSpacing: 0.15 },
    titleSmall: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0.1 },
    bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0.5 },
    bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0.25 },
    bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, letterSpacing: 0.4 },
    labelLarge: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0.1 },
    labelMedium: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.5 },
    labelSmall: { fontSize: 11, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.5 },
};

// ============ SPACING (4dp grid) ============

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

// ============ FONT SIZE (legacy alias — use Typography) ============

export const FontSize = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    title: 34,
};

// ============ BORDER RADIUS (MD3 Shape) ============

export const BorderRadius = {
    none: 0,
    xs: 4,       // Extra Small
    sm: 8,       // Small
    md: 12,      // Medium
    lg: 16,      // Large
    xl: 28,      // Extra Large (FAB, full buttons)
    full: 9999,  // Full (circular)
};

// ============ ELEVATION (MD3 — dp values) ============

export const Elevation = {
    level0: 0,
    level1: 1,
    level2: 3,
    level3: 6,
    level4: 8,
    level5: 12,
};

// ============ MOTION (MD3 Motion System) ============

export const Motion = {
    // Durations
    durationShort1: 50,
    durationShort2: 100,
    durationShort3: 150,
    durationShort4: 200,
    durationMedium1: 250,
    durationMedium2: 300,
    durationMedium3: 350,
    durationMedium4: 400,
    durationLong1: 450,
    durationLong2: 500,

    // Easing (for Animated.timing)
    easingEmphasized: { x1: 0.2, y1: 0, x2: 0, y2: 1 },
    easingEmphasizedDecelerate: { x1: 0.05, y1: 0.7, x2: 0.1, y2: 1 },
    easingEmphasizedAccelerate: { x1: 0.3, y1: 0, x2: 0.8, y2: 0.15 },
    easingStandard: { x1: 0.2, y1: 0, x2: 0, y2: 1 },
    easingStandardDecelerate: { x1: 0, y1: 0, x2: 0, y2: 1 },
    easingStandardAccelerate: { x1: 0.3, y1: 0, x2: 1, y2: 1 },
};


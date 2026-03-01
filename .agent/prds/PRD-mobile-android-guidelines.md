# PRD: Mobile App — Android Guidelines Compliance
> **Version**: 1.0 | **Date**: 01/03/2026 | **Research Mode**: Hybrid (3 sources, 15+ URLs verified)

---

## 1. Bối Cảnh

### 1.1 Hiện Trạng

| Metric | Giá trị |
|--------|---------|
| Tech Stack | Expo 54 + React Native 0.81 + expo-router |
| Screens | 39 (18 modules) |
| Hooks | 16 (react-query based) |
| Shared Components | 5 (`ConfirmModal`, `OfflineBanner`, `PhotoGrid`, `SignaturePad`, `VoiceNotePlayer`) |
| State | Zustand (auth) + React Query (server) |
| Design Tokens | `colors.ts` — có MD3 colors nhưng chưa đầy đủ |
| Navigation | 5 bottom tabs (role-based via `role-tabs.ts`) |

### 1.2 Vấn Đề
1. **Thiếu Material Design 3 Components** — không dùng React Native Paper, tự code tất cả
2. **Typography không theo MD3 Type Scale** — dùng custom FontSize, thiếu Inter/Roboto
3. **Không có Dynamic Color** — hardcode màu, không theo wallpaper user
4. **Thiếu Motion/Animation chuẩn MD3** — chỉ có skeleton loader
5. **Accessibility chưa đầy đủ** — một số screen thiếu `accessibilityRole`
6. **Bottom tabs thiếu active indicator** — MD3 yêu cầu pill-shaped active indicator

---

## 2. Đề Xuất Cải Tiến (10 Areas)

### 2.1 Navigation — MD3 Navigation Bar ✅ CRITICAL

**Hiện trạng**: Custom bottom tabs, thiếu active indicator pill, icon chưa filled/outlined đúng.

**MD3 Spec** (verified ≥3 sources):
- Navigation Bar: 3-5 destinations, equal importance
- Active destination: **pill-shaped indicator** (24dp height, 64dp width)
- Active icon: **Filled**, Inactive icon: **Outlined**
- Labels always visible (no icon-only mode)
- Height: 80dp on phones

**Cải tiến**:
```diff
// (tabs)/_layout.tsx
- tabBarStyle: { height: 85, paddingBottom: 25 }
+ tabBarStyle: { height: 80 }

// TabIcon component
- <MaterialIcons name={materialName} size={focused ? 26 : 24} />
+ <View style={focused ? styles.activeIndicator : undefined}>
+   <MaterialIcons 
+     name={focused ? materialName : `${materialName}-outlined`}
+     size={24}
+   />
+ </View>
```

| Item | Before | After |
|------|--------|-------|
| Tab height | 85dp | 80dp |
| Active indicator | None | Pill (64×32, border-radius 16) |
| Active icon | Same + bigger | Filled variant |
| Inactive icon | Same | Outlined variant |

---

### 2.2 Typography — MD3 Type Scale

**Hiện trạng**: Custom `FontSize` object (xs:11 → title:34), no font family specified.

**MD3 Spec**:
| Role | Size | Weight | Use |
|------|------|--------|-----|
| Display Large | 57 | 400 | Hero |
| Headline Large | 32 | 400 | Screen titles |
| Title Large | 22 | 500 | Card titles |
| Title Medium | 16 | 500 | Section headers |
| Body Large | 16 | 400 | Content |
| Body Medium | 14 | 400 | Supporting text |
| Label Large | 14 | 500 | Buttons |
| Label Small | 11 | 500 | Badges |

**Cải tiến**: Thêm `Typography` object vào `colors.ts` + load Google Fonts (Roboto):
```typescript
export const Typography = {
    displayLarge: { fontSize: 57, fontWeight: '400', lineHeight: 64 },
    headlineLarge: { fontSize: 32, fontWeight: '400', lineHeight: 40 },
    titleLarge: { fontSize: 22, fontWeight: '500', lineHeight: 28 },
    titleMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
    bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
    labelLarge: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
    labelSmall: { fontSize: 11, fontWeight: '500', lineHeight: 16 },
};
```

---

### 2.3 Color System — M3 Tonal Palette

**Hiện trạng**: Có primary/surface/container colors, thiếu full tonal palette.

**Cải tiến**: Bổ sung còn thiếu vào `colors.ts`:
```typescript
// Thêm vào Colors
onPrimary: '#ffffff',
onPrimaryContainer: '#3e001d',
secondary: '#625b71',
onSecondary: '#ffffff',
onSecondaryContainer: '#1d192b',
tertiary: '#7d5260',
onTertiary: '#ffffff',
onTertiaryContainer: '#31111d',
onError: '#ffffff',
onErrorContainer: '#410002',
scrim: 'rgba(0, 0, 0, 0.32)',
```

> **Dynamic Color**: Xem xét thêm `react-native-material-you-colors` trong tương lai (Expo Go không hỗ trợ, chỉ production build).

---

### 2.4 Components — Shared UI Kit

**Hiện trạng**: 5 components, thiếu nhiều MD3 primitives.

**Cần thêm** (ưu tiên cao):

| Component | MD3 Spec | Dùng ở đâu |
|-----------|---------|-------------|
| `MD3Button` | Filled/Outlined/Text/Tonal/Elevated | Toàn app |
| `MD3Card` | Filled/Outlined/Elevated | List items, stats |
| `MD3Chip` | Assist/Filter/Input/Suggestion | Status badges, filters |
| `MD3Divider` | Full-width / Inset | Section separators |
| `MD3TextField` | Filled (default) / Outlined | Forms |
| `MD3Snackbar` | Single-line / Multi-line | Error/success feedback |
| `MD3FAB` | Standard / Small / Large / Extended | Primary actions |
| `MD3TopAppBar` | Small / Medium / Large | Screen headers |

> **Không yêu cầu React Native Paper** — tiếp tục custom implementation để giữ bundle nhỏ, nhưng tuân thủ MD3 specs về sizing, spacing, elevation.

---

### 2.5 Loading States — Skeleton Loaders ✅ Đã có

**Hiện trạng**: Các screen đều đã có skeleton loaders — **tuân thủ MD3**.

**Cải tiến nhỏ**:
- Thống nhất animation timing: `duration: 1500ms, ease-in-out`
- Skeleton shape phải match content shape (rounded cards, not rectangles)

---

### 2.6 Motion & Animation — MD3 Motion System

**MD3 Motion Specs** (verified):
- **Duration**: Short (100ms) / Medium (300ms) / Long (500ms)
- **Easing**: Emphasized (decelerate on enter), Standard (linear)
- **Transitions**: Container transform, shared axis, fade through

**Cải tiến**:
```typescript
export const Motion = {
    durationShort: 100,
    durationMedium: 300,
    durationLong: 500,
    easingEmphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    easingStandard: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
};
```

**Áp dụng**: Screen transitions, card press, modal enter/exit, list item swipe.

---

### 2.7 Accessibility — MD3 Requirements

**Checklist**:

| Requirement | Status | Action |
|------------|--------|--------|
| Touch target ≥ 48dp | ⚠️ Partial | Audit all buttons |
| `accessibilityRole` trên mọi interactive element | ⚠️ Partial | Thêm vào screens thiếu |
| `accessibilityLabel` meaningful | ⚠️ Partial | Review toàn app |
| Color contrast ≥ 4.5:1 cho text | ✅ | Verified |
| Focus order logical | ⚠️ Unknown | Test với TalkBack |
| Content descriptions cho icons | ⚠️ Partial | Thêm cho icon-only buttons |

---

### 2.8 Haptic Feedback — Android Patterns

**Hiện trạng**: `expo-haptics` đã được cài, dùng trong một số screens.

**MD3 Spec**: Haptics cho confirm actions, error states, success transitions.

**Cải tiến**: Standardize haptic patterns:
```typescript
// lib/haptics.ts — đã có, cần review coverage
import * as Haptics from 'expo-haptics';

export const HapticPatterns = {
    tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
```

---

### 2.9 Permission UX — Graceful Degradation

**Hiện trạng**: Menu items ẩn theo role (vừa fix xong) ✅.

**Cải tiến thêm**:
- Khi user truy cập URL trực tiếp mà không có quyền → hiện **"Bạn không có quyền truy cập"** screen thay vì crash/403
- Thêm `PermissionDeniedScreen` component với icon + message + nút "Về trang chủ"

---

### 2.10 Offline — Progressive Enhancement

**Hiện trạng**: `OfflineBanner`, `offline-queue.ts`, SQLite storage đã có.

**Cải tiến**:
- Offline-first cho Dashboard stats (cache last value in SQLite)
- Queue mutations khi offline, sync khi online
- Visual indicator cho stale data (dim + "Dữ liệu cũ" label)

---

## 3. Ưu Tiên Thực Hiện

| Priority | Area | Effort | Impact |
|----------|------|--------|--------|
| **P0** | 2.1 Navigation Bar (pill indicator) | 2h | HIGH — Chuẩn MD3 ngay lập tức |
| **P0** | 2.2 Typography (MD3 Type Scale) | 1h | HIGH — Consistency toàn app |
| **P0** | 2.4 MD3Button + MD3Card | 4h | HIGH — Foundation cho toàn bộ UI |
| **P1** | 2.3 Color System (tonal palette) | 1h | MEDIUM — Hoàn thiện design tokens |
| **P1** | 2.7 Accessibility audit | 3h | HIGH — Compliance |
| **P1** | 2.9 PermissionDeniedScreen | 1h | MEDIUM — UX khi bị chặn |
| **P2** | 2.6 Motion system | 2h | MEDIUM — Polish |
| **P2** | 2.4 Remaining components | 4h | MEDIUM — Chip, TextField, etc. |
| **P2** | 2.10 Offline enhancement | 3h | MEDIUM — Reliability |
| **P3** | 2.3 Dynamic Color | 2h | LOW — Only production builds |

**Tổng effort ước tính**: ~23h

---

## 4. Verification Plan

### Automated
- TypeScript: `npx tsc --noEmit` — 0 errors
- Screen audit: Review each screen cho MD3 compliance

### Manual / Browser Test
- Mở từng screen trên Android device/emulator
- Verify touch target ≥ 48dp
- Verify navigation bar pill indicator animation
- Test với TalkBack (Android screen reader)
- Test offline mode: bật airplane mode → verify OfflineBanner + cached data

---

## 5. Research Sources

| Topic | Sources Verified | Confidence |
|-------|-----------------|------------|
| MD3 Navigation Bar spec | material.io, medium.com, 9to5google.com | HIGH (3+) |
| M3 Expressive updates | android.com, material.io | HIGH (2) |
| React Native Paper MD3 | reactnativepaper.com, reactnativeexpert.com | HIGH (2) |
| Dynamic Color (Material You) | github.com (react-native-material-you-colors) | MEDIUM (1) |
| Catering ERP UX | spaceberry.studio, aspirity.com, uxplanet.org | HIGH (3+) |
| Touch target 48dp | material.io, getnerdify.com | HIGH (2) |

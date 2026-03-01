---
name: mobile-ui-ux-audit
description: >
  Comprehensive Mobile UI/UX Audit skill cho React Native/Expo apps.
  Kết hợp best practices từ Smart Swap (Solana Mobile Hackathon winner patterns),
  Vercel React Native Skills, và Web Interface Guidelines.
  Sử dụng khi cần audit, review, hoặc cải tiến UI/UX của mobile app.
  Triggers: "audit mobile", "review UX", "mobile quality", "kiểm tra UI".
license: MIT
metadata:
  author: am-thuc-giao-tuyet
  version: '1.0.0'
  sources:
    - Smart Swap (deichworx/smart-swap) - Mobile Optimization patterns
    - Vercel React Native Skills - Performance rules
    - Web Interface Guidelines - Accessibility standards
---

# Mobile UI/UX Audit Skill

Skill chuyên audit UI/UX cho React Native/Expo mobile apps theo **10 categories**
với **60+ rules** trích xuất từ production-ready mobile apps.

## Khi Nào Sử Dụng

- Audit UI/UX trước khi release
- Review mobile screens mới
- Kiểm tra performance, accessibility
- Đánh giá chất lượng UX cho mobile app

## Tổng Quan Categories

| # | Category | Priority | Rules | Trích từ |
|---|----------|----------|-------|----------|
| 1 | Touch & Interaction | 🔴 CRITICAL | 8 | Smart Swap |
| 2 | Layout & Navigation | 🔴 CRITICAL | 7 | Smart Swap + Vercel |
| 3 | Feedback & Delight | 🟠 HIGH | 8 | Smart Swap |
| 4 | List Performance | 🟠 HIGH | 8 | Vercel RN Skills |
| 5 | Animation & Motion | 🟠 HIGH | 6 | Smart Swap + Vercel |
| 6 | Offline & Network | 🟡 MEDIUM | 6 | Smart Swap |
| 7 | Accessibility (a11y) | 🟡 MEDIUM | 8 | Smart Swap + WIG |
| 8 | State & Data | 🟡 MEDIUM | 5 | Vercel RN Skills |
| 9 | Visual & Typography | 🟢 LOW | 6 | WIG + Smart Swap |
| 10 | Battery & Platform | 🟢 LOW | 5 | Smart Swap |

---

## Category 1: Touch & Interaction (🔴 CRITICAL)

> *Nguồn: Smart Swap MOBILE_OPTIMIZATION.md - Touch-Optimized Interface*

### Rules

| ID | Rule | Standard | Detection |
|----|------|----------|-----------|
| `touch-01` | Touch targets ≥ 44×44 pt | Apple HIG / Material Design | Scan for `width < 44` or `height < 44` trên interactive elements |
| `touch-02` | Button padding ≥ 12 pt | Smart Swap dùng 16pt | Check `padding` trên buttons và pressables |
| `touch-03` | List item height ≥ 44 pt | Smart Swap dùng 56pt | Check `minHeight` trên list items |
| `touch-04` | Dùng `Pressable` thay `TouchableOpacity` | Vercel `ui-pressable` | `grep TouchableOpacity` |
| `touch-05` | Không có tap delay | hitSlop hoặc delayPressIn=0 | Check interactive elements |
| `touch-06` | `android_ripple` cho Android feedback | Smart Swap pattern | Check `Pressable` có `android_ripple` |
| `touch-07` | Double-tap confirm cho destructive actions | Smart Swap `DoubleTapButton` | Check delete/destructive actions |
| `touch-08` | Adequate spacing giữa interactive elements (≥ 8pt) | Tránh mis-tap | Check spacing giữa buttons |

### Code Pattern (từ Smart Swap)

```typescript
// ✅ ĐÚNG - Production-ready Pressable
<Pressable
  style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
  onPress={handleAction}
  accessibilityLabel="Action description"
  accessibilityRole="button"
  android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
>
  <Text>{label}</Text>
</Pressable>

// ❌ SAI - Legacy TouchableOpacity
<TouchableOpacity onPress={handleAction}>
  <Text>{label}</Text>
</TouchableOpacity>
```

---

## Category 2: Layout & Navigation (🔴 CRITICAL)

> *Nguồn: Smart Swap Thumb-Friendly Layout + Vercel navigation-native-navigators*

### Rules

| ID | Rule | Standard | Detection |
|----|------|----------|-----------|
| `layout-01` | Primary actions ở bottom screen | Thumb-friendly zone | Check CTA placement |
| `layout-02` | Không cần reach top corners cho critical actions | Reachability | Audit header actions |
| `layout-03` | Bottom sheets cho selectors/modals | Smart Swap token selector | Check modal patterns |
| `layout-04` | SafeAreaView wrap toàn bộ screens | Vercel `ui-safe-area-scroll` | `grep SafeAreaView` |
| `layout-05` | Native Stack Navigator (không JS-based) | Vercel `navigation-native-navigators` | Check navigator types |
| `layout-06` | KeyboardAvoidingView cho form screens | Smart Swap Swap.tsx | Check forms có keyboard handling |
| `layout-07` | ScrollView + `keyboardShouldPersistTaps="handled"` | Tránh dismiss keyboard khi tap | Check ScrollView props |

### Code Pattern (từ Smart Swap)

```typescript
// ✅ Thumb-friendly layout pattern
<SafeAreaView style={styles.container} edges={['top']}>
  <KeyboardAvoidingView
    style={styles.flex}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Content */}
    </ScrollView>

    {/* Primary CTA pinned to bottom */}
    <View style={styles.bottomAction}>
      <PrimaryButton label="Confirm" />
    </View>
  </KeyboardAvoidingView>
</SafeAreaView>
```

---

## Category 3: Feedback & Delight (🟠 HIGH)

> *Nguồn: Smart Swap Haptic Feedback + Confetti + Error Handling*

### Rules

| ID | Rule | Standard | Detection |
|----|------|----------|-----------|
| `feedback-01` | Haptic feedback cho primary actions | `expo-haptics` | Check có import expo-haptics |
| `feedback-02` | Haptic levels phù hợp (Light → Medium → Heavy) | Smart Swap pattern | Verify haptic types |
| `feedback-03` | Success notification feedback | `NotificationFeedbackType.Success` | Check success flows |
| `feedback-04` | Error notification feedback | `NotificationFeedbackType.Error` | Check error flows |
| `feedback-05` | Celebration animation cho milestones | Smart Swap Confetti | Check completion states |
| `feedback-06` | Loading states rõ ràng (không blank screen) | ActivityIndicator hoặc skeleton | Check async states |
| `feedback-07` | Error messages actionable (không generic) | Smart Swap error handling | Check error UI |
| `feedback-08` | Pull-to-refresh cho list screens | RefreshControl | Check list screens |

### Haptic Configuration Guide (từ Smart Swap)

```typescript
import * as Haptics from 'expo-haptics';

// Mapping theo action context
const HAPTIC_MAP = {
  // Light - Subtle interactions
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  toggle: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  select: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Medium - Important actions
  confirm: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  submit: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  swipe: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Heavy - Destructive / Final actions
  delete: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Notifications
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
```

---

## Category 4: List Performance (🟠 HIGH)

> *Nguồn: Vercel React Native Skills - list-performance-* rules*

### Rules

| ID | Rule | Standard | Detection |
|----|------|----------|-----------|
| `list-01` | FlatList/FlashList cho lists > 20 items | Virtualization | Check `.map()` rendering |
| `list-02` | List items wrapped trong `React.memo` | `list-performance-item-memo` | Check renderItem components |
| `list-03` | Stable callbacks với `useCallback` | `list-performance-callbacks` | Check inline functions |
| `list-04` | Không có inline style objects trong items | `list-performance-inline-objects` | Check `style={{ }}` |
| `list-05` | `keyExtractor` sử dụng unique stable key | Performance | Check key logic |
| `list-06` | Pre-computed data với `useMemo` | Smart Swap `historyWithSymbols` | Check data transforms |
| `list-07` | `estimatedItemSize` cho FlashList | FlashList requirement | Check FlashList props |
| `list-08` | `showsVerticalScrollIndicator={false}` khi cần | UI polish | Check ScrollView/FlatList |

### Code Pattern (từ Smart Swap History.tsx)

```typescript
// ✅ Production-ready memoized list
const historyWithSymbols = useMemo(() => {
  return history.map((item) => ({
    ...item,
    inputSymbol: getToken(item.inputMint)?.symbol ?? '?',
    outputSymbol: getToken(item.outputMint)?.symbol ?? '?',
  }));
}, [history, getToken]);

const renderItem = useCallback(({ item }) => (
  <MemoizedListItem {...item} />
), []);

const keyExtractor = useCallback((item) => item.id, []);

<FlatList
  data={historyWithSymbols}
  keyExtractor={keyExtractor}
  renderItem={renderItem}
  showsVerticalScrollIndicator={false}
  refreshControl={
    <RefreshControl refreshing={isLoading} onRefresh={refresh} />
  }
/>
```

---

## Category 5: Animation & Motion (🟠 HIGH)

> *Nguồn: Smart Swap + Vercel animation-* rules*

### Rules

| ID | Rule | Standard | Detection |
|----|------|----------|-----------|
| `anim-01` | Native driver cho animations | `useNativeDriver: true` | Check Animated/Reanimated |
| `anim-02` | Chỉ animate `transform` và `opacity` | GPU compositing | Check animated properties |
| `anim-03` | `useDerivedValue` cho computed animations | Vercel `animation-derived-value` | Check Reanimated hooks |
| `anim-04` | Transitions 100-300ms | Smart Swap standard | Check animation duration |
| `anim-05` | Không continuous JS-thread animations | Battery drain | Check setInterval animations |
| `anim-06` | Loading skeleton thay spinners (cho ERP) | UX best practice | Check loading patterns |

---

## Category 6: Offline & Network (🟡 MEDIUM)

> *Nguồn: Smart Swap Network Optimization + Offline Handling*

### Rules

| ID | Rule | Standard | Detection |
|----|------|----------|-----------|
| `network-01` | Network status detection | `useNetworkStatus` hook | Check `@react-native-community/netinfo` |
| `network-02` | Offline banner/indicator khi mất mạng | Smart Swap pattern | Check offline UI |
| `network-03` | Block destructive actions khi offline | Smart Swap execute guard | Check action guards |
| `network-04` | Request debouncing (search, input) | 300-500ms delay | Check input → API calls |
| `network-05` | Parallel fetching khi có thể | `Promise.all` | Check sequential fetches |
| `network-06` | Data caching strategy | AsyncStorage/Cache | Check caching logic |

### Code Pattern (từ Smart Swap)

```typescript
// ✅ Offline-aware component
const { isConnected } = useNetworkStatus();

// Banner UI
{!isConnected && (
  <View style={styles.offlineBanner}>
    <Text style={styles.offlineIcon}>📶</Text>
    <Text style={styles.offlineText}>Không có kết nối mạng</Text>
  </View>
)}

// Guard destructive actions
const handleSubmit = async () => {
  if (!isConnected) {
    showError('Cần kết nối mạng để thực hiện');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return;
  }
  // ... proceed
};
```

---

## Category 7: Accessibility (🟡 MEDIUM)

> *Nguồn: Smart Swap VoiceOver/TalkBack + Web Interface Guidelines*

### Rules

| ID | Rule | Standard | Detection |
|----|------|----------|-----------|
| `a11y-01` | `accessibilityLabel` trên interactive elements | VoiceOver/TalkBack | Check Pressable/Button |
| `a11y-02` | `accessibilityRole` chính xác (button, link, etc) | Screen readers | Check role assignments |
| `a11y-03` | `accessibilityHint` cho complex actions | Smart Swap pattern | Check non-obvious actions |
| `a11y-04` | `accessibilityState` cho toggle/selection | Dynamic states | Check toggles, checkboxes |
| `a11y-05` | Color contrast AA minimum (4.5:1 text) | WCAG AA | Check text-on-background |
| `a11y-06` | Status colors phân biệt được (success/error) | Không chỉ dựa vào color | Check status indicators |
| `a11y-07` | Relative font sizes (không hardcode px nhỏ) | Dynamic text support | Check fontSize values |
| `a11y-08` | Text inside `<Text>` component (RN specific) | `rendering-text-in-text-component` | Check bare text |

### Code Pattern (từ Smart Swap)

```typescript
// ✅ Full accessibility pattern
<Pressable
  accessibilityLabel={`${item.name}, giá ${item.price}`}
  accessibilityRole="button"
  accessibilityHint="Nhấn để xem chi tiết"
  accessibilityState={{ selected: isSelected, disabled: !isAvailable }}
  onPress={handlePress}
  disabled={!isAvailable}
>
  <Text>{item.name}</Text>
</Pressable>
```

---

## Category 8: State & Data (🟡 MEDIUM)

> *Nguồn: Vercel React Native Skills - react-state-* rules*

### Rules

| ID | Rule | Standard | Detection |
|----|------|----------|-----------|
| `state-01` | Minimize state subscriptions | `react-state-minimize` | Check store selectors |
| `state-02` | Dispatcher pattern cho callbacks | `react-state-dispatcher` | Check prop drilling |
| `state-03` | Fallback UI on first render | `react-state-fallback` | Check initial states |
| `state-04` | No falsy `&&` conditional rendering | `rendering-no-falsy-and` | Check `{count && <View>}` |
| `state-05` | Auto-refresh data patterns (khi cần) | Smart Swap 10s cycle | Check stale data handling |

---

## Category 9: Visual & Typography (🟢 LOW)

> *Nguồn: Web Interface Guidelines + Smart Swap Theme*

### Rules

| ID | Rule | Standard | Detection |
|----|------|----------|-----------|
| `visual-01` | Consistent design tokens (colors, spacing) | Theme system | Check hardcoded values |
| `visual-02` | `tabular-nums` cho number columns/amounts | WIG typography | Check number displays |
| `visual-03` | Ellipsis `…` thay `...` | WIG typography | Check text |
| `visual-04` | Empty states có illustration/message | UX completeness | Check empty data |
| `visual-05` | Consistent icon set (không mix emoji + icon lib) | Visual consistency | Check icon usage |
| `visual-06` | `StyleSheet.create` cho all styles | Vercel `ui-styling` | Check inline styles |

---

## Category 10: Battery & Platform (🟢 LOW)

> *Nguồn: Smart Swap Battery Optimization*

### Rules

| ID | Rule | Standard | Detection |
|----|------|----------|-----------|
| `battery-01` | Không background polling khi app inactive | Battery drain | Check setInterval cleanup |
| `battery-02` | Pause animations khi app backgrounded | AppState listener | Check animation cleanup |
| `battery-03` | Debounced network requests | 300-500ms | Check input handlers |
| `battery-04` | Cleanup useEffect subscriptions | Memory leaks | Check useEffect returns |
| `battery-05` | Platform-specific behavior (iOS vs Android) | `Platform.OS` checks | Check platform adaptation |

---

## Scoring System

### Per-Category Scoring (1-10)

| Score | Meaning |
|-------|---------|
| 9-10 | Excellent - Production-ready, follows all best practices |
| 7-8 | Good - Minor improvements possible |
| 5-6 | Average - Several issues need attention |
| 3-4 | Below Average - Significant UX problems |
| 1-2 | Poor - Major rework needed |

### Weighted Total Score

| Category | Weight |
|----------|--------|
| Touch & Interaction | 0.15 |
| Layout & Navigation | 0.15 |
| Feedback & Delight | 0.12 |
| List Performance | 0.12 |
| Animation & Motion | 0.10 |
| Offline & Network | 0.10 |
| Accessibility | 0.10 |
| State & Data | 0.06 |
| Visual & Typography | 0.05 |
| Battery & Platform | 0.05 |
| **TOTAL** | **1.00** |

### Grade Thresholds

| Grade | Score | Status |
|-------|-------|--------|
| A+ | ≥ 9.0 | 🟢 Ship it |
| A | ≥ 8.0 | 🟢 Ready with minor polish |
| B | ≥ 7.0 | 🟡 Address HIGH issues first |
| C | ≥ 5.0 | 🟠 Significant work needed |
| D | < 5.0 | 🔴 Major rework required |

---

## Quick Detection Commands

```powershell
# Touch targets - Find small interactive elements
Select-String -Path "mobile/**/*.tsx" -Pattern "width:\s*[0-3][0-9][,\s}]|height:\s*[0-3][0-9][,\s}]" -Recurse

# TouchableOpacity usage (should be Pressable)
Select-String -Path "mobile/**/*.tsx" -Pattern "TouchableOpacity" -Recurse

# Missing accessibility labels
Select-String -Path "mobile/**/*.tsx" -Pattern "<Pressable(?!.*accessibilityLabel)" -Recurse

# Inline styles in lists
Select-String -Path "mobile/**/*.tsx" -Pattern "renderItem.*style=\{\{" -Recurse

# Missing SafeAreaView
Select-String -Path "mobile/app/**/*.tsx" -Pattern "export default" -Recurse | Where-Object { $_ -notmatch "SafeAreaView" }

# Haptic feedback usage
Select-String -Path "mobile/**/*.tsx" -Pattern "expo-haptics|Haptics\." -Recurse

# Network status handling
Select-String -Path "mobile/**/*.tsx" -Pattern "NetInfo|useNetworkStatus|isConnected" -Recurse

# Offline handling
Select-String -Path "mobile/**/*.tsx" -Pattern "offline|no.*connection|mất.*mạng" -CaseInsensitive -Recurse
```

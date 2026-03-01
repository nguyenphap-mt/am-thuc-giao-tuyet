---
description: Comprehensive Mobile UI/UX Audit kết hợp Smart Swap patterns, Vercel React Native Skills, và Web Interface Guidelines. Audit toàn diện 10 categories với 60+ rules.
version: 1.0
last_updated: 2026-02-28
trigger_keywords: ["mobile audit", "mobile ux", "audit ui mobile", "kiểm tra mobile", "review mobile ux", "mobile quality"]
skills_used: ["mobile-ui-ux-audit", "react-native-skills"]
---

# /mobile-ux-audit Workflow

> **Trigger**: Khi cần audit UI/UX toàn diện cho React Native/Expo mobile app.
> **Skill**: `mobile-ui-ux-audit` (60+ rules, 10 categories)
> **Output**: Mobile UI/UX Audit Report với scored recommendations.

// turbo-all

---

## Pre-Requisites

| Variable | Description | Default |
| :--- | :--- | :--- |
| `{target_path}` | Đường dẫn tới mobile app code | `mobile/` |
| `{screens_path}` | Đường dẫn tới screens | `mobile/app/` |
| `{components_path}` | Đường dẫn tới components | `mobile/components/` |

---

## Step 1: Load Skill & Context

### 1.1 Load Mobile UI/UX Audit Skill

```
Read SKILL.md từ: .agent/skills/mobile-ui-ux-audit/SKILL.md
```

### 1.2 Load React Native Skills (Supplementary)

```
Read SKILL.md từ: .agent/skills/react-native-skills/SKILL.md
```

### 1.3 Scan Target Files

```powershell
# // turbo - List all screen and component files
Get-ChildItem -Path "{target_path}" -Recurse -Include "*.tsx","*.ts" |
  Where-Object { $_.Name -notmatch "\.test\.|\.spec\.|\.d\.ts$" } |
  Select-Object FullName, Length |
  Sort-Object FullName
```

### 1.4 Analyze Dependencies

```powershell
# // turbo - Check mobile package.json for relevant libs
Get-Content "{target_path}/package.json" |
  Select-String -Pattern "expo-haptics|netinfo|reanimated|gesture-handler|flashlist|safe-area"
```

---

## Step 2: 🔴 CRITICAL - Touch & Interaction Audit

> **Rules**: `touch-01` → `touch-08` (8 rules)
> **Source**: Smart Swap Touch-Optimized Interface

### 2.1 Touch Target Size Check

```powershell
# // turbo - Find potentially small touch targets
Select-String -Path "{target_path}/**/*.tsx" -Pattern "width:\s*[1-3][0-9][,\s}]|height:\s*[1-3][0-9][,\s}]" -Recurse
```

### 2.2 TouchableOpacity Usage (Anti-pattern)

```powershell
# // turbo - Should be Pressable
Select-String -Path "{target_path}/**/*.tsx" -Pattern "TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback" -Recurse
```

### 2.3 Android Ripple Feedback

```powershell
# // turbo - Check Pressable without android_ripple
Select-String -Path "{target_path}/**/*.tsx" -Pattern "<Pressable" -Recurse
Select-String -Path "{target_path}/**/*.tsx" -Pattern "android_ripple" -Recurse
```

### 2.4 Checklist

- [ ] `touch-01` Touch targets ≥ 44×44 pt
- [ ] `touch-02` Button padding ≥ 12 pt
- [ ] `touch-03` List item height ≥ 44 pt
- [ ] `touch-04` Pressable thay TouchableOpacity
- [ ] `touch-05` Không tap delay
- [ ] `touch-06` android_ripple cho Android
- [ ] `touch-07` Double-tap confirm cho destructive actions
- [ ] `touch-08` Spacing ≥ 8pt giữa interactive elements

**Score: ___/10**

---

## Step 3: 🔴 CRITICAL - Layout & Navigation Audit

> **Rules**: `layout-01` → `layout-07` (7 rules)
> **Source**: Smart Swap Thumb-Friendly Layout + Vercel Navigation

### 3.1 SafeAreaView Check

```powershell
# // turbo - Screens without SafeAreaView
Select-String -Path "{screens_path}/**/*.tsx" -Pattern "SafeAreaView|useSafeAreaInsets" -Recurse
```

### 3.2 Keyboard Handling

```powershell
# // turbo - Forms without KeyboardAvoidingView
Select-String -Path "{target_path}/**/*.tsx" -Pattern "KeyboardAvoidingView|keyboardShouldPersistTaps" -Recurse
```

### 3.3 Navigator Type Check

```powershell
# // turbo - Should use Native Stack
Select-String -Path "{target_path}/**/*.tsx" -Pattern "createStackNavigator|createBottomTabNavigator|NativeStack" -Recurse
```

### 3.4 Checklist

- [ ] `layout-01` Primary actions ở bottom screen
- [ ] `layout-02` Critical actions trong thumb-reach zone
- [ ] `layout-03` Bottom sheets cho selectors/modals
- [ ] `layout-04` SafeAreaView trên tất cả screens
- [ ] `layout-05` Native Stack Navigator
- [ ] `layout-06` KeyboardAvoidingView cho forms
- [ ] `layout-07` keyboardShouldPersistTaps="handled"

**Score: ___/10**

---

## Step 4: 🟠 HIGH - Feedback & Delight Audit

> **Rules**: `feedback-01` → `feedback-08` (8 rules)
> **Source**: Smart Swap Haptic Feedback + Confetti

### 4.1 Haptic Usage Check

```powershell
# // turbo - Haptic feedback usage
Select-String -Path "{target_path}/**/*.tsx" -Pattern "expo-haptics|Haptics\." -Recurse
```

### 4.2 Loading States Check

```powershell
# // turbo - Loading pattern usage
Select-String -Path "{target_path}/**/*.tsx" -Pattern "ActivityIndicator|isLoading|loading" -Recurse
```

### 4.3 Error Handling UI

```powershell
# // turbo - Error state handling
Select-String -Path "{target_path}/**/*.tsx" -Pattern "error|Error|errorMessage|showError" -Recurse
```

### 4.4 Pull-to-Refresh

```powershell
# // turbo - RefreshControl usage
Select-String -Path "{target_path}/**/*.tsx" -Pattern "RefreshControl|onRefresh|refreshing" -Recurse
```

### 4.5 Checklist

- [ ] `feedback-01` Haptic feedback cho primary actions
- [ ] `feedback-02` Haptic levels phù hợp context
- [ ] `feedback-03` Success feedback (haptic + visual)
- [ ] `feedback-04` Error feedback (haptic + visual)
- [ ] `feedback-05` Celebration cho milestones
- [ ] `feedback-06` Loading states rõ ràng
- [ ] `feedback-07` Error messages actionable
- [ ] `feedback-08` Pull-to-refresh cho lists

**Score: ___/10**

---

## Step 5: 🟠 HIGH - List Performance Audit

> **Rules**: `list-01` → `list-08` (8 rules)
> **Source**: Vercel React Native Skills

### 5.1 List Rendering Check

```powershell
# // turbo - Find .map() usage (should be FlatList/FlashList)
Select-String -Path "{target_path}/**/*.tsx" -Pattern "\.map\(" -Recurse
```

### 5.2 Memoization Check

```powershell
# // turbo - Check React.memo and useMemo/useCallback
Select-String -Path "{target_path}/**/*.tsx" -Pattern "React\.memo|useMemo|useCallback" -Recurse
```

### 5.3 Inline Styles in Lists

```powershell
# // turbo - Check for inline object styles
Select-String -Path "{target_path}/**/*.tsx" -Pattern "style=\{\{" -Recurse
```

### 5.4 Checklist

- [ ] `list-01` Virtualized lists (FlatList/FlashList) cho > 20 items
- [ ] `list-02` List items wrapped trong React.memo
- [ ] `list-03` useCallback cho renderItem/keyExtractor
- [ ] `list-04` Không inline style objects trong items
- [ ] `list-05` Stable unique keys
- [ ] `list-06` Pre-computed data với useMemo
- [ ] `list-07` estimatedItemSize cho FlashList
- [ ] `list-08` showsVerticalScrollIndicator controlled

**Score: ___/10**

---

## Step 6: 🟠 HIGH - Animation & Motion Audit

> **Rules**: `anim-01` → `anim-06` (6 rules)
> **Source**: Smart Swap + Vercel Animation Rules

### 6.1 Animation Driver Check

```powershell
# // turbo - Animated/Reanimated usage
Select-String -Path "{target_path}/**/*.tsx" -Pattern "useAnimatedStyle|withTiming|withSpring|Animated\." -Recurse
```

### 6.2 Checklist

- [ ] `anim-01` Native driver cho animations
- [ ] `anim-02` Chỉ animate transform/opacity
- [ ] `anim-03` useDerivedValue cho computed
- [ ] `anim-04` Duration 100-300ms
- [ ] `anim-05` Không continuous JS-thread animations
- [ ] `anim-06` Skeleton loaders thay spinners

**Score: ___/10**

---

## Step 7: 🟡 MEDIUM - Offline & Network Audit

> **Rules**: `network-01` → `network-06` (6 rules)
> **Source**: Smart Swap Network Optimization

### 7.1 Network Status Detection

```powershell
# // turbo - NetInfo/network status usage
Select-String -Path "{target_path}/**/*.tsx" -Pattern "NetInfo|netinfo|useNetworkStatus|isConnected|isOnline" -CaseInsensitive -Recurse
```

### 7.2 Offline UI

```powershell
# // turbo - Offline handling UI
Select-String -Path "{target_path}/**/*.tsx" -Pattern "offline|no.*connection|mất.*mạng|không.*kết.*nối" -CaseInsensitive -Recurse
```

### 7.3 Checklist

- [ ] `network-01` Network status detection
- [ ] `network-02` Offline banner/indicator
- [ ] `network-03` Block destructive actions khi offline
- [ ] `network-04` Request debouncing
- [ ] `network-05` Parallel fetching
- [ ] `network-06` Data caching strategy

**Score: ___/10**

---

## Step 8: 🟡 MEDIUM - Accessibility Audit

> **Rules**: `a11y-01` → `a11y-08` (8 rules)
> **Source**: Smart Swap VoiceOver/TalkBack + WIG

### 8.1 Accessibility Labels

```powershell
# // turbo - Check accessibilityLabel coverage
Select-String -Path "{target_path}/**/*.tsx" -Pattern "accessibilityLabel|accessibilityRole|accessibilityHint" -Recurse
```

### 8.2 Missing Labels on Pressables

```powershell
# // turbo - Pressables without accessibilityLabel
Select-String -Path "{target_path}/**/*.tsx" -Pattern "<Pressable[^>]*>" -Recurse |
  Where-Object { $_ -notmatch "accessibilityLabel" }
```

### 8.3 Checklist

- [ ] `a11y-01` accessibilityLabel trên interactive elements
- [ ] `a11y-02` accessibilityRole chính xác
- [ ] `a11y-03` accessibilityHint cho complex actions
- [ ] `a11y-04` accessibilityState cho toggles
- [ ] `a11y-05` Color contrast AA (4.5:1)
- [ ] `a11y-06` Status colors phân biệt được
- [ ] `a11y-07` Relative font sizes
- [ ] `a11y-08` Text inside <Text> component

**Score: ___/10**

---

## Step 9: 🟡 MEDIUM - State & Data + 🟢 LOW Priority

> **Rules**: `state-01` → `state-05`, `visual-01` → `visual-06`, `battery-01` → `battery-05`

### 9.1 State Management

```powershell
# // turbo - State subscription patterns
Select-String -Path "{target_path}/**/*.tsx" -Pattern "useStore|useSelector|useState" -Recurse
```

### 9.2 Visual Consistency

```powershell
# // turbo - Inline colors (should use theme)
Select-String -Path "{target_path}/**/*.tsx" -Pattern "color:\s*['""]#[0-9a-f]|backgroundColor:\s*['""]#[0-9a-f]" -CaseInsensitive -Recurse
```

### 9.3 useEffect Cleanup

```powershell
# // turbo - Check useEffect with subscriptions
Select-String -Path "{target_path}/**/*.tsx" -Pattern "useEffect.*setInterval|useEffect.*addEventListener" -Recurse
```

### 9.4 Checklists

**State & Data (___/10)**:
- [ ] `state-01` Minimize state subscriptions
- [ ] `state-02` Dispatcher pattern cho callbacks
- [ ] `state-03` Fallback UI on first render
- [ ] `state-04` No falsy && rendering
- [ ] `state-05` Auto-refresh patterns

**Visual & Typography (___/10)**:
- [ ] `visual-01` Consistent design tokens
- [ ] `visual-02` tabular-nums cho numbers
- [ ] `visual-03` Proper ellipsis (…)
- [ ] `visual-04` Empty states
- [ ] `visual-05` Consistent icon set
- [ ] `visual-06` StyleSheet.create

**Battery & Platform (___/10)**:
- [ ] `battery-01` No background polling khi inactive
- [ ] `battery-02` Pause animations khi backgrounded
- [ ] `battery-03` Debounced requests
- [ ] `battery-04` useEffect cleanup
- [ ] `battery-05` Platform-specific adaptations

---

## Step 10: Generate Report

### 10.1 Score Summary Table

| # | Category | Weight | Score | Weighted |
|---|----------|--------|-------|----------|
| 1 | Touch & Interaction | 0.15 | _/10 | _ |
| 2 | Layout & Navigation | 0.15 | _/10 | _ |
| 3 | Feedback & Delight | 0.12 | _/10 | _ |
| 4 | List Performance | 0.12 | _/10 | _ |
| 5 | Animation & Motion | 0.10 | _/10 | _ |
| 6 | Offline & Network | 0.10 | _/10 | _ |
| 7 | Accessibility | 0.10 | _/10 | _ |
| 8 | State & Data | 0.06 | _/10 | _ |
| 9 | Visual & Typography | 0.05 | _/10 | _ |
| 10 | Battery & Platform | 0.05 | _/10 | _ |
| | **TOTAL** | **1.00** | | **_/10** |

### 10.2 Grade

| Grade | Score | Status |
|-------|-------|--------|
| A+ | ≥ 9.0 | 🟢 Ship it |
| A | ≥ 8.0 | 🟢 Minor polish |
| B | ≥ 7.0 | 🟡 Address HIGH issues |
| C | ≥ 5.0 | 🟠 Significant work |
| D | < 5.0 | 🔴 Major rework |

### 10.3 Issues by Priority

```markdown
## 🔴 CRITICAL Issues
| File | Line | Rule ID | Description | Fix |
| :--- | :---: | :--- | :--- | :--- |

## 🟠 HIGH Issues
| File | Line | Rule ID | Description | Fix |
| :--- | :---: | :--- | :--- | :--- |

## 🟡 MEDIUM Issues
| File | Line | Rule ID | Description | Fix |
| :--- | :---: | :--- | :--- | :--- |

## 🟢 LOW Issues
| File | Line | Rule ID | Description | Fix |
| :--- | :---: | :--- | :--- | :--- |
```

### 10.4 Save Report

```powershell
# // turbo - Save report
$date = Get-Date -Format "yyyyMMdd"
New-Item -Path ".reports/mobile-ux-audit/$date-audit.md" -ItemType File -Force
```

---

## Output Files

| File | Location | Description |
| :--- | :--- | :--- |
| Audit Report | `.reports/mobile-ux-audit/{date}-audit.md` | Full findings + scores |
| Skill Reference | `.agent/skills/mobile-ui-ux-audit/SKILL.md` | 60+ rules reference |

---

## Pass/Fail Criteria

| Criterion | Threshold | Required? |
| :--- | :---: | :---: |
| Total Score | ≥ 7.0/10 | ✅ |
| No CRITICAL violations | 0 | ✅ |
| Touch targets ≥ 44pt | 100% | ✅ |
| Accessibility labels | ≥ 80% coverage | ✅ |
| No TouchableOpacity | 0 | Recommended |

---

## Quick Reference

### Trigger Command
```
/mobile-ux-audit
/mobile-ux-audit mobile/app/orders
```

### Related Workflows
| Workflow | When to Use |
| :--- | :--- |
| `/react-native-review` | Deep performance analysis |
| `/ui-accessibility-audit` | Full accessibility (web) |
| `/ui-ux-pro-max` | Design + implementation |
| `/qa-review-v2` | Full QA code review |

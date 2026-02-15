---
description: React Native/Expo Performance Review sử dụng Vercel React Native Skills (8 categories)
version: 1.0
last_updated: 2026-02-01
trigger_keywords: ["react native", "expo", "mobile review", "flashlist", "reanimated", "mobile performance"]
skills_used: ["react-native-skills"]
---

# /react-native-review Workflow

> **Trigger**: Khi cần review performance cho React Native/Expo apps.
> **Skill**: `vercel-react-native-skills`
> **Output**: Mobile Performance Report với prioritized recommendations.

// turbo-all

---

## Pre-Requisites

| Variable | Description | Example |
| :--- | :--- | :--- |
| `{target_path}` | Đường dẫn tới code RN | `src/screens/` |
| `{platform}` | iOS, Android, hoặc cả hai | `both` |

---

## Step 1: Load Skill & Context

### 1.1 Load React Native Skills

```
Read SKILL.md từ: .agent/skills/react-native-skills/SKILL.md
Read AGENTS.md từ: .agent/skills/react-native-skills/AGENTS.md (full rules)
```

### 1.2 Identify Target Files

```powershell
# // turbo - List React Native files
Get-ChildItem -Path "{target_path}" -Recurse -Include "*.tsx","*.ts" |
  Where-Object { $_.Name -notmatch "\.test\.|\.spec\." } |
  Select-Object FullName, Length
```

### 1.3 Identify Dependencies

```powershell
# // turbo - Check package.json for RN libs
Get-Content "package.json" | Select-String -Pattern "react-native|expo|reanimated|flashlist|gesture-handler"
```

---

## Step 2: CRITICAL Priority - List Performance

> **Rules**: `list-performance-*` (8 rules)

### 2.1 FlashList Usage Check

**Rule**: `list-performance-virtualize` - Use FlashList for large lists

```powershell
# // turbo - Find FlatList usage (should be FlashList)
Select-String -Path "{target_path}/**/*.tsx" -Pattern "FlatList|ScrollView.*map" -AllMatches
```

**Checklist**:
- [ ] FlashList được sử dụng thay FlatList?
- [ ] `estimatedItemSize` được set?
- [ ] `getItemType` cho heterogeneous lists?

### 2.2 List Item Memoization

**Rule**: `list-performance-item-memo` - Memoize list item components

```powershell
# // turbo - Check list item memoization
Select-String -Path "{target_path}/**/*.tsx" -Pattern "renderItem.*=.*\(" -AllMatches
```

**Checklist**:
- [ ] List items wrapped trong React.memo?
- [ ] Stable callback references (useCallback)?
- [ ] Không có inline style objects?

### 2.3 Heavy Computation in Items

**Rule**: `list-performance-item-expensive` - Move expensive work outside items

**Checklist**:
- [ ] Không có expensive calculations trong render?
- [ ] Pre-computed data trước khi pass vào list?

---

## Step 3: HIGH Priority - Animation & Navigation

### 3.1 Animation Rules

> **Rules**: `animation-gpu-properties`, `animation-derived-value`, `animation-gesture-detector-press`

```powershell
# // turbo - Find non-GPU animations
Select-String -Path "{target_path}/**/*.tsx" -Pattern "useAnimatedStyle|withTiming|withSpring" -AllMatches
```

**Checklist**:
- [ ] Chỉ animate transform & opacity?
- [ ] useDerivedValue cho computed animations?
- [ ] Gesture.Tap thay Pressable trong animated views?

### 3.2 Navigation Rules

> **Rule**: `navigation-native-navigators`

```powershell
# // turbo - Check navigator usage
Select-String -Path "{target_path}/**/*.tsx" -Pattern "createStackNavigator|createBottomTabNavigator" -AllMatches
```

**Checklist**:
- [ ] Native Stack Navigator (react-native-screens)?
- [ ] Native Bottom Tabs?
- [ ] Không dùng JS-based navigators?

---

## Step 4: HIGH Priority - UI Patterns

### 4.1 Image Handling

> **Rules**: `ui-expo-image`, `ui-image-gallery`

```powershell
# // turbo - Find Image component usage
Select-String -Path "{target_path}/**/*.tsx" -Pattern "from 'react-native'.*Image|<Image" -AllMatches
```

**Checklist**:
- [ ] expo-image được sử dụng thay RN Image?
- [ ] Image caching enabled?
- [ ] Placeholder images cho loading?

### 4.2 Pressable & Touch

> **Rules**: `ui-pressable`, `ui-menus`, `ui-native-modals`

**Checklist**:
- [ ] Pressable thay TouchableOpacity?
- [ ] Native context menus (react-native-menu)?
- [ ] Native modals khi possible?

### 4.3 Safe Areas & Scroll

> **Rules**: `ui-safe-area-scroll`, `ui-scrollview-content-inset`

```powershell
# // turbo - Check safe area handling
Select-String -Path "{target_path}/**/*.tsx" -Pattern "SafeAreaView|useSafeAreaInsets" -AllMatches
```

**Checklist**:
- [ ] Safe areas handled trong ScrollViews?
- [ ] contentInset cho headers?

### 4.4 Styling

> **Rule**: `ui-styling`

**Checklist**:
- [ ] StyleSheet.create hoặc Nativewind?
- [ ] Không có inline styles trong lists?
- [ ] onLayout thay measure()?

---

## Step 5: MEDIUM Priority - State & Rendering

### 5.1 State Management

> **Rules**: `react-state-minimize`, `react-state-dispatcher`, `react-state-fallback`

```powershell
# // turbo - Check state subscriptions
Select-String -Path "{target_path}/**/*.tsx" -Pattern "useStore|useSelector|useState" -AllMatches
```

**Checklist**:
- [ ] Minimize state subscriptions?
- [ ] Dispatcher pattern cho callbacks?
- [ ] Fallback on first render?

### 5.2 React Compiler Compatibility

> **Rules**: `react-compiler-destructure-functions`, `react-compiler-reanimated-shared-values`

**Checklist**:
- [ ] Functions destructured cho compiler?
- [ ] Shared values handled correctly với compiler?

### 5.3 Rendering Rules

> **Rules**: `rendering-text-in-text-component`, `rendering-no-falsy-and`

```powershell
# // turbo - Find bare text rendering
Select-String -Path "{target_path}/**/*.tsx" -Pattern "\{.*&&.*\}" -AllMatches
```

**Checklist**:
- [ ] Text wrapped trong Text components?
- [ ] Không dùng falsy && cho conditional rendering?

---

## Step 6: MEDIUM Priority - Monorepo & Config

### 6.1 Monorepo Rules

> **Rules**: `monorepo-native-deps-in-app`, `monorepo-single-dependency-versions`

**Checklist**:
- [ ] Native dependencies trong app package?
- [ ] Single versions across packages?

### 6.2 Configuration

> **Rules**: `fonts-config-plugin`, `imports-design-system-folder`, `js-hoist-intl`

**Checklist**:
- [ ] Config plugins cho custom fonts?
- [ ] Design system imports organized?
- [ ] Intl objects hoisted?

---

## Step 7: Generate Report

### 7.1 Performance Score Calculation

| Category | Weight | Score (1-10) | Weighted |
| :--- | :---: | :---: | :---: |
| List Performance | 0.30 | | |
| Animation | 0.20 | | |
| Navigation | 0.10 | | |
| UI Patterns | 0.15 | | |
| State Management | 0.10 | | |
| Rendering | 0.10 | | |
| Config | 0.05 | | |
| **TOTAL** | 1.00 | | **/10** |

### 7.2 Issues by Priority

```markdown
## 🔴 CRITICAL Priority Issues (List Performance)
| File | Line | Rule | Description | Fix |
| :--- | :---: | :--- | :--- | :--- |

## 🟠 HIGH Priority Issues (Animation/Navigation/UI)
| File | Line | Rule | Description | Fix |
| :--- | :---: | :--- | :--- | :--- |

## 🟡 MEDIUM Priority Issues (State/Rendering)
| File | Line | Rule | Description | Fix |
| :--- | :---: | :--- | :--- | :--- |
```

### 7.3 Save Report

```powershell
# // turbo - Save report
$date = Get-Date -Format "yyyyMMdd"
New-Item -Path ".reports/react-native/$date-review.md" -ItemType File -Force
```

---

## Output Files

| File | Location | Description |
| :--- | :--- | :--- |
| Performance Report | `.reports/react-native/{date}-review.md` | Detailed findings |
| Summary JSON | `.reports/react-native/{date}-summary.json` | CI integration |

---

## Pass/Fail Criteria

| Criterion | Threshold | Required? |
| :--- | :---: | :---: |
| FlashList for lists >50 items | 100% | ✅ |
| No FlatList usage | 0 | ✅ |
| Performance Score | ≥7/10 | ✅ |
| List items memoized | 100% | Recommended |

---

## Quick Reference

### Trigger Command
```
/react-native-review {path}
/react-native-review src/screens
```

### Related Workflows
| Workflow | When to Use |
| :--- | :--- |
| `/react-perf-review` | Web React issues |
| `/ui-accessibility-audit` | Accessibility issues |
| `/frontend-quality-gate` | Full frontend review |

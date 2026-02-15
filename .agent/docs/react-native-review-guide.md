# Hướng Dẫn: /react-native-review

> **Skill**: `react-native-skills` | **Cập nhật**: 01/02/2026

---

## 1. Tổng Quan

Review performance cho React Native/Expo apps với ~40 rules, 8 categories.

**Cú pháp**: `/react-native-review {path}`

---

## 2. Categories

| # | Category | Impact | Key Rules |
| :---: | :--- | :--- | :--- |
| 1 | List Performance | CRITICAL | FlashList, memoize items |
| 2 | Animation | HIGH | GPU-only (transform/opacity) |
| 3 | Navigation | HIGH | Native stack/tabs |
| 4 | UI Patterns | HIGH | expo-image, Pressable |
| 5 | State Management | MEDIUM | Minimize subscriptions |
| 6 | Rendering | MEDIUM | No falsy && |
| 7 | Monorepo | MEDIUM | Single versions |
| 8 | Configuration | LOW | Config plugins |

---

## 3. Must-Fix Items

### 3.1 FlashList (CRITICAL)

```tsx
// ❌ FlatList
<FlatList data={items} renderItem={...} />

// ✅ FlashList
import { FlashList } from '@shopify/flash-list';
<FlashList data={items} renderItem={...} estimatedItemSize={72} />
```

### 3.2 Memoize Items (CRITICAL)

```tsx
const ListItem = React.memo(({ item }) => <View>...</View>);
```

### 3.3 GPU Animations (HIGH)

```tsx
// ✅ Only transform/opacity
useAnimatedStyle(() => ({
  opacity: withTiming(visible ? 1 : 0),
  transform: [{ scale: withSpring(scale) }],
}));
```

### 3.4 expo-image (HIGH)

```tsx
import { Image } from 'expo-image';
<Image source={{ uri }} placeholder={blurhash} />
```

---

## 4. Score

| Score | Status |
| :---: | :--- |
| 9-10 | Excellent |
| 7-8 | Good |
| 5-6 | Needs work |
| <5 | Critical |

---

## 5. Links

- Workflow: `.agent/workflows/react-native-review.md`
- Skill: `.agent/skills/react-native-skills/`
- [FlashList](https://shopify.github.io/flash-list/)
- [expo-image](https://docs.expo.dev/versions/latest/sdk/image/)

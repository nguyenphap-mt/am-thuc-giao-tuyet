# PRD: Per-User Appearance Settings (Cài đặt giao diện theo người dùng)

## Bối cảnh & Vấn đề

### Hiện tại
Cài đặt giao diện (accent color, font size, density, theme) đang lưu vào bảng `tenant_settings` — nghĩa là **chung cho cả tổ chức**:

| Điểm | Chi tiết |
|:--|:--|
| **Bảng lưu** | `tenant_settings` (key-value, theo `tenant_id`) |
| **Backend API** | `GET/PUT /tenants/me/settings` |
| **Frontend hook** | `useMyTenantSettings()` / `useUpdateMyTenantSettings()` |
| **Keys** | `appearance.accent_color`, `appearance.font_size`, `appearance.density`, `appearance.theme` |

### Vấn đề
- **User A** đổi accent → **User B** cũng bị đổi (sau refresh)
- `localStorage` tạo ảo giác per-user nhưng API sync sẽ override
- Không có `user_preferences` table trong DB

### Mục tiêu
Chuyển 4 appearance settings sang lưu **per-user** — mỗi user có bộ cài đặt giao diện riêng.

---

## Proposed Changes

### Phase 1: Database

#### [NEW] Migration `XXX_user_preferences.sql`

```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, preference_key)
);

-- RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preferences_tenant_isolation ON user_preferences
    USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- Users chỉ đọc/ghi preferences của chính mình
CREATE POLICY user_preferences_own ON user_preferences
    FOR ALL USING (user_id = (SELECT current_setting('app.current_user_id')::uuid));

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

> [!NOTE]
> Dùng `UNIQUE(user_id, preference_key)` thay vì composite PK để giữ `id` UUID primary key theo convention.

---

### Phase 2: Backend

#### [NEW] `backend/modules/user/domain/preference_model.py`

```python
class UserPreferenceModel(Base):
    __tablename__ = "user_preferences"
    id = Column(UUID, primary_key=True, default=uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(UUID, nullable=False)
    preference_key = Column(String(100), nullable=False)
    preference_value = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

#### [MODIFY] `backend/modules/user/infrastructure/http_router.py`

Thêm 2 endpoints:

| Method | Path | Mô tả |
|:--|:--|:--|
| `GET` | `/users/me/preferences` | Lấy tất cả preferences của user hiện tại |
| `PUT` | `/users/me/preferences` | Cập nhật preferences (upsert) |

```python
@router.get("/me/preferences")
async def get_my_preferences(current_user=Depends(get_current_user), db=Depends(get_db)):
    # SELECT * FROM user_preferences WHERE user_id = current_user.id
    ...

@router.put("/me/preferences") 
async def update_my_preferences(data: PreferencesUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    # UPSERT per key — ON CONFLICT(user_id, preference_key) DO UPDATE
    ...
```

> [!IMPORTANT]
> **KHÔNG xóa** `appearance.*` keys khỏi tenant_settings API. Giữ backwards-compatible — tenant settings vẫn là **default/fallback** khi user chưa có preference riêng.

---

### Phase 3: Frontend

#### [NEW] `frontend/src/hooks/use-user-preferences.ts`

```typescript
export function useMyPreferences() {
    return useQuery({
        queryKey: ['users', 'me', 'preferences'],
        queryFn: () => api.get<UserPreference[]>('/users/me/preferences'),
    });
}

export function useUpdateMyPreferences() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (prefs: Record<string, string>) =>
            api.put('/users/me/preferences', { preferences: prefs }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['users', 'me', 'preferences'] }),
    });
}
```

#### [MODIFY] `frontend/src/hooks/use-appearance.ts`

Thay đổi chính:

```diff
-import { useMyTenantSettings, useUpdateMyTenantSettings } from './use-tenants';
+import { useMyPreferences, useUpdateMyPreferences } from './use-user-preferences';
+import { useMyTenantSettings } from './use-tenants'; // fallback only

 // In useAppearance():
-const { data: tenantSettings } = useMyTenantSettings();
-const updateSettings = useUpdateMyTenantSettings();
+const { data: userPrefs } = useMyPreferences();
+const { data: tenantSettings } = useMyTenantSettings(); // fallback
+const updatePrefs = useUpdateMyPreferences();

 // Sync logic: User prefs > Tenant settings > Defaults
+// Priority: userPrefs → tenantSettings → DEFAULT_STATE
```

**Fallback logic:** Nếu user chưa có preference → dùng tenant setting → dùng default.

---

### Phase 4: Data Migration (One-time)

> [!WARNING]
> Nếu tenant đã có `appearance.*` settings, cần migrate cho **admin user** (hoặc tất cả users) của tenant đó.

Tùy chọn:
- **Option A (đơn giản):** Không migrate — mỗi user tự set lần đầu, fallback về tenant default
- **Option B (đầy đủ):** Script copy `appearance.*` từ `tenant_settings` → `user_preferences` cho tất cả active users

> **Khuyến nghị: Option A** — đơn giản, không rủi ro, user sẽ tự thiết lập.

---

## Acceptance Criteria

1. ✅ User A đổi accent color → User B **KHÔNG bị ảnh hưởng**
2. ✅ User mới chưa set → fallback về tenant default → rồi UI default
3. ✅ `PUT /users/me/preferences` trả 200 + lưu vào `user_preferences`
4. ✅ `GET /users/me/preferences` trả đúng preferences của user hiện tại
5. ✅ RLS: user chỉ đọc/ghi preferences của chính mình
6. ✅ Backwards-compatible: `tenant_settings` API không bị thay đổi
7. ✅ `localStorage` vẫn dùng cho instant load (trước khi API response)

## Verification Plan

### Automated
- `npx next build` passes
- Backend unit test: CRUD user_preferences
- Integration test: 2 users cùng tenant, đổi accent khác nhau → verify isolation

### Browser
1. Login User A → đổi accent sang **Đỏ** → verify
2. Login User B (cùng tenant) → accent vẫn **Tím** (default)
3. User B đổi sang **Xanh** → verify
4. Refresh User A → vẫn **Đỏ** (không bị ghi đè)

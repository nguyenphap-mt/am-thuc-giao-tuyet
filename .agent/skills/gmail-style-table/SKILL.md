---
name: Gmail-Style Data Table
description: Modern data table pattern with Windows Explorer resizable columns, Gmail-style overlay actions, and row click to open detail. Production-ready from HR Employee List.
---

# Gmail-Style Data Table Skill

> **Source**: HR Employee List (`frontend/src/app/(dashboard)/hr/page.tsx`)
> **Verified**: Feb 2026

## Pattern Overview

| Feature | Description |
|---------|-------------|
| **Resizable Columns** | Windows Explorer-style drag to resize with localStorage persistence |
| **Overlay Actions** | Gmail-style action icons that overlay content on row hover |
| **Row Click → Detail** | Click row opens detail modal, checkbox for multi-select |
| **Responsive** | Columns hide progressively at breakpoints |

---

## 1. Resizable Columns (Windows Explorer Style)

### State Hook

```typescript
// Column widths with localStorage persistence
const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('hr-col-widths');
        if (saved) return JSON.parse(saved);
    }
    return { name: 140, role: 80, phone: 100, email: 140, address: 180, joinedDate: 90, status: 70 };
});

const getWidth = (col: string) => `${colWidths[col]}px`;
```

### Resize Logic

```typescript
const [resizing, setResizing] = useState<{ col: string; startX: number; startW: number } | null>(null);

const startResize = (col: string, clientX: number) => {
    setResizing({ col, startX: clientX, startW: colWidths[col] });
};

useEffect(() => {
    if (!resizing) return;
    
    const handleMove = (e: MouseEvent) => {
        const diff = e.clientX - resizing.startX;
        const newWidth = Math.max(50, resizing.startW + diff); // Min 50px
        setColWidths(prev => {
            const next = { ...prev, [resizing.col]: newWidth };
            localStorage.setItem('hr-col-widths', JSON.stringify(next));
            return next;
        });
    };
    
    const handleUp = () => setResizing(null);
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
    };
}, [resizing]);
```

### Header Column JSX

```tsx
{/* Resizable Column Header */}
<div
    className="relative flex items-center shrink-0 h-full border-r border-gray-300 
               hover:bg-[#cce8ff] transition-colors cursor-default"
    style={{ width: getWidth('name') }}
>
    <span className="flex-1 truncate px-2">Họ và tên</span>
    <div
        className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10"
        onMouseDown={(e) => { e.stopPropagation(); startResize('name', e.clientX); }}
        title="Kéo để thay đổi kích thước"
    />
</div>
```

**Key Classes:**
- Header row: `h-9 bg-[#f5f5f5] select-none`
- Column: `relative border-r border-gray-300 hover:bg-[#cce8ff]`
- Resize handle: `absolute right-0 w-3 cursor-col-resize z-10`

---

## 2. Gmail-Style Overlay Actions

### Row Container

```tsx
<div
    className={`relative flex items-center gap-0 px-4 py-3 cursor-pointer 
                transition-colors group
                ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
    onClick={() => { setSelectedItem(item); setDetailModalOpen(true); }}
>
    {/* ... columns ... */}
    
    {/* Last column fills remaining space */}
    <div className="hidden md:flex flex-1 items-center">
        <Badge>{item.status}</Badge>
    </div>
    
    {/* Overlay Actions */}
    <div className={`absolute right-2 top-1/2 -translate-y-1/2 
                     flex items-center gap-0.5 pl-6 
                     opacity-0 group-hover:opacity-100 transition-opacity 
                     hidden md:flex
                     bg-gradient-to-l ${isSelected ? 'from-blue-50 via-blue-50' : 'from-gray-50 via-gray-50'} to-transparent`}>
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/80 hover:bg-white">
            <IconPhone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/80 hover:bg-white">
            <IconEdit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/80 hover:bg-white text-red-500">
            <IconTrash className="h-4 w-4" />
        </Button>
    </div>
</div>
```

**Key Classes:**
- Row: `relative group` (enables group-hover)
- Actions: `absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100`
- Gradient: `bg-gradient-to-l from-gray-50 via-gray-50 to-transparent`
- Buttons: `bg-white/80 hover:bg-white`

---

## 3. Row Click → Detail Modal

```tsx
// Row onClick opens detail
onClick={() => { setSelectedItem(item); setDetailModalOpen(true); }}

// Checkbox still works independently
<Checkbox 
    onClick={(e) => e.stopPropagation()} 
    onCheckedChange={() => toggleSelect(item.id)} 
/>
```

---

## 4. Responsive Column Visibility

```tsx
{/* Always visible */}
<div className="shrink-0" style={{ width: getWidth('name') }}>...</div>

{/* Hidden on small screens */}
<div className="hidden sm:block shrink-0" style={{ width: getWidth('role') }}>...</div>
<div className="hidden md:block shrink-0" style={{ width: getWidth('phone') }}>...</div>
<div className="hidden lg:block shrink-0" style={{ width: getWidth('email') }}>...</div>
<div className="hidden xl:block shrink-0" style={{ width: getWidth('address') }}>...</div>
```

---

## 5. Toolbar with Bulk Actions

```tsx
<div className="flex items-center gap-2 p-3 border-b bg-gray-50/50">
    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
    <Button variant="ghost" size="icon" onClick={refetch}><IconRefresh /></Button>
    
    {selectedIds.length > 0 && (
        <>
            <Badge variant="secondary">{selectedIds.length} đã chọn</Badge>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <IconTrash className="mr-1" />Xóa
            </Button>
        </>
    )}
    
    <div className="flex-1" />
    
    {/* Filters on right */}
    <Select value={filter} onValueChange={setFilter}>...</Select>
    <Input placeholder="Tìm kiếm..." />
</div>
```

---

## Quick Reference

| Element | Classes |
|---------|---------|
| Header row | `flex h-9 bg-[#f5f5f5] border-b select-none` |
| Header column | `relative shrink-0 border-r hover:bg-[#cce8ff]` |
| Resize handle | `absolute right-0 w-3 h-full cursor-col-resize z-10` |
| Data row | `relative flex group cursor-pointer hover:bg-gray-50` |
| Overlay actions | `absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100` |
| Action button | `h-7 w-7 bg-white/80 hover:bg-white` |
| Last column | `flex-1` (no fixed width) |

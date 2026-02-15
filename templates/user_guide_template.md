# User Guide Template (Documentation)

Sử dụng template này khi viết tài liệu hướng dẫn sử dụng tính năng mới.

**Ngôn ngữ**: Tiếng Việt  
**Vị trí lưu**: `.doc/{tên_tính_năng}.md`

---

## Template

```markdown
# Hướng Dẫn: {Tên Tính Năng}

## 1. Mục Đích
{Mô tả ngắn gọn tính năng này giúp người dùng làm gì.}

## 2. Điều Kiện Tiên Quyết
- [ ] Đã đăng nhập vào hệ thống
- [ ] Có quyền truy cập module {Tên Module}
- [ ] {Điều kiện khác nếu có}

## 3. Các Bước Thực Hiện

### Bước 1: {Tên bước}
{Mô tả chi tiết hành động cần làm.}

![Bước 1](./{tên_tính_năng}/step1.png)

### Bước 2: {Tên bước}
{Mô tả chi tiết hành động cần làm.}

![Bước 2](./{tên_tính_năng}/step2.png)

### Bước 3: {Tên bước}
{Mô tả chi tiết hành động cần làm.}

![Bước 3](./{tên_tính_năng}/step3.png)

## 4. Kết Quả Mong Đợi
{Mô tả kết quả sau khi hoàn thành các bước.}

![Kết quả](./{tên_tính_năng}/result.png)

## 5. Xử Lý Lỗi Thường Gặp

| Lỗi | Nguyên Nhân | Cách Khắc Phục |
| :--- | :--- | :--- |
| {Mô tả lỗi} | {Nguyên nhân} | {Hướng dẫn sửa} |

## 6. Liên Hệ Hỗ Trợ
Nếu gặp vấn đề, vui lòng liên hệ: {email/số điện thoại hỗ trợ}.
```

---

## Quy Tắc Viết Tài Liệu

1. **Ngắn gọn**: Mỗi bước không quá 2-3 câu.
2. **Có hình ảnh**: Mỗi bước quan trọng phải có screenshot.
3. **Dễ hiểu**: Tránh thuật ngữ kỹ thuật, dùng ngôn ngữ người dùng cuối.
4. **Có ví dụ**: Nếu cần nhập dữ liệu, cho ví dụ cụ thể.

---

## Cấu Trúc Folder Hình Ảnh

```
.doc/
├── {tên_tính_năng}.md
└── {tên_tính_năng}/
    ├── step1.png
    ├── step2.png
    ├── step3.png
    └── result.png
```

---

## Checklist Tài Liệu

- [ ] Viết bằng Tiếng Việt
- [ ] Có ít nhất 1 hình ảnh minh họa
- [ ] Có bảng xử lý lỗi thường gặp
- [ ] Đã review lại chính tả
- [ ] Đặt file vào `.doc/`

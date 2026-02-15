# PRD: Cải Tiến Module Khách Hàng (CRM Enhancement)
## Ẩm Thực Giao Tuyết Catering ERP

**Version**: 2.0  
**Date**: 08/02/2026  
**Author**: AI Workforce (Hybrid Research-Reflexion v1.0)  
**Status**: Auto-Approved  
**Previous Audit Score**: B (75/100)  
**Target Score**: A (90+)

---

## 1. Tổng Quan

Module CRM hiện tại có backend mạnh (4 routers: CRUD, loyalty, marketing, interactions) nhưng frontend chưa tận dụng hết. "Thêm khách hàng" button không hoạt động, stats cards sai dữ liệu, tab filter chưa kết nối API.

## 2. Gap Analysis (12 Gaps)

### FE-Critical
| ID | Gap | Severity |
|:---|:----|:--------:|
| **FE-01** | Create/Edit customer modal — button có nhưng handler trống | 🔴 CRITICAL |
| **FE-02** | Stats card "Thân thiết" & "Mới tháng" dùng cùng `new_this_month` | 🔴 CRITICAL |
| **FE-03** | Type mismatch: FE `Customer.id: number` vs BE `id: UUID` | 🟡 HIGH |

### FE-High
| ID | Gap | Severity |
|:---|:----|:--------:|
| **FE-04** | Loyalty tier tabs không filter API (chỉ UI tabs, no filtering logic) | 🟡 HIGH |
| **FE-05** | Không có customer type filter (VIP, Regular, Churn Risk) | 🟡 HIGH |
| **FE-06** | Không có CSV export | 🟡 HIGH |
| **FE-07** | Không có delete customer action | 🟡 HIGH |

### FE-Medium
| ID | Gap | Severity |
|:---|:----|:--------:|
| **FE-08** | Không có birthday tracking/alerts UI | 🟠 MEDIUM |
| **FE-09** | Không có retention dashboard (churn risk, lost) | 🟠 MEDIUM |
| **FE-10** | Không hiển thị `source` (nguồn khách hàng) | 🟠 MEDIUM |
| **FE-11** | Không có inline note creation UI | 🟠 MEDIUM |
| **FE-12** | Customer preferences (sở thích) chưa hiển thị/edit | 🟠 MEDIUM |

### BE-Fix
| ID | Gap | Severity |
|:---|:----|:--------:|
| **BE-01** | Stats endpoint thiếu trường `new_this_month` (số KH mới) | 🔴 CRITICAL |

## 3. Phased Implementation

### Phase 1: Core CRUD & Stats Fix (Critical)
- Tạo `use-customers.ts` hooks (CRUD, stats, interactions, loyalty)
- Fix stats endpoint BE-01: thêm `new_this_month` count
- Fix FE-02: map stats đúng fields
- Fix FE-03: update Customer types to use `string` IDs
- Create customer modal (form: name, phone, email, address, source, notes)
- Edit customer modal (pre-filled)
- Delete customer with confirm modal
- Wire loyalty tier tab filter to API `customer_type` param

### Phase 2: Analytics & Retention
- Analytics tab: customer growth chart, top spenders, source distribution
- Retention dashboard: churn risk, lost, campaign send UI
- Birthday alerts section (upcoming birthdays)
- Customer type filter chips (VIP, Regular, Churn Risk, Lost)

### Phase 3: UX Polish
- CSV export button
- Inline note creation from list
- Source badge display
- Preferences editing in detail modal

## 4. Verification Plan
- Browser test: login → navigate to /crm → verify 5 stat cards → open create modal → create customer → verify in list → click analytics tab → click retention tab → export CSV

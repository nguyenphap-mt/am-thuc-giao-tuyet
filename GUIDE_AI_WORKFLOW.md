# AI Workforce System Manual (v2.0)

> **Mục đích**: Tài liệu hướng dẫn vận hành, phát triển và bảo trì hệ thống AI Workforce.
> **Phiên bản**: 2.0 (Activated Runtime)
> **Ngày cập nhật**: 2026-01-17

---

## 🏗️ 1. Kiến Trúc Hệ Thống (System Architecture)

Hệ thống AI Workforce không còn là một tập hợp các file prompt tĩnh, mà là một **Reactive Software System** vận hành trên nền tảng kỹ thuật hiện đại.

### 1.1 Tech Stack
| Layer | Technology | Vai trò |
| :--- | :--- | :--- |
| **Frontend** | Angular 18+ (Standalone) | Giao diện quản lý, Dashboard theo dõi Agent realtime, RxJS State Management. |
| **Backend** | Python 3.12+ (FastAPI) | Orchestrator, Logic 8 bước, Kết nối LLM, WebSocket Server. |
| **Database** | PostgreSQL 16+ | Lưu trữ Trạng thái (`workflow_executions`), Bộ nhớ Agent (`agent_memory`), Vector Knowledge (`pgvector`). |
| **AI Engine** | OpenAI / Gemini | Trí tuệ tổng hợp, sinh code, phân tích nghiệp vụ (thông qua `LLMService`). |

### 1.2 Luồng Dữ Liệu (Data Flow)
1. **Trigger**: Người dùng gửi request (Feature/Bug) qua API/UI.
2. **Orchestrator**: `AgentOrchestrator` nhận request, khởi tạo `WorkflowExecution` trong DB.
3. **Router**: `WorkflowRouter` quyết định bước đi tiếp theo (`Roadmap` -> `Analysis`...).
4. **Step Execution**: `StepExecutor` (ví dụ `AnalysisStep`) chạy:
   - Load Global Rules từ file `.md` (via `RuleLoader`).
   - Xây dựng Context & Prompt.
   - Gọi LLM Service để xử lý.
   - Lưu kết quả vào DB (`agent_memory`).
5. **Realtime Feedback**: Trạng thái và Logs được bắn qua WebSocket về Frontend Dashboard.

---

## 🔄 2. Quy Trình 8 Bước (The 8-Step Workflow)

Hệ thống tuân thủ quy trình nghiêm ngặt để đảm bảo chất lượng code.

| Bước | Agent | Nhiệm vụ | Output |
| :--- | :--- | :--- | :--- |
| **1. Roadmap Alignment** | Orchestrator | Kiểm tra tính năng có nằm trong lộ trình (`ROADMAP.md`) không. | `Approved/Rejected` |
| **2. Analysis** | Architect | Phân tích 5 chiều (UX, UI, FE, BE, DB). | `Impact Assessment JSON` |
| **3. Database** | DB Specialist | Thiết kế Schema, Migration SQL tuân thủ RLS. | `.sql` migration file |
| **4. Backend** | Backend Dev | Viết API, Pydantic Models, Business Logic. | Python files |
| **5. Frontend** | Frontend Dev | Viết Component, Service, UI integration. | Angular files |
| **6. Browser Test** | QA Engineer | Chạy E2E Test, kiểm tra giao diện. | Test Report |
| **7. Permission** | Security | Kiểm tra và cập nhật Matrix phân quyền. | `permission-matrix.md` update |
| **8. Documentation** | Tech Writer | Cập nhật tài liệu kỹ thuật và hướng dẫn SD. | Updated Docs |

> **Lưu ý**: Quy trình này động (`Dynamic`). Ví dụ: Request "Fix Bug" sẽ bỏ qua bước 1 và có thể bước 3 nếu không sửa DB.

---

## ⚙️ 3. Hướng Dẫn Vận Hành (Operational Guide)

### 3.1 Khởi động Hệ thống
Để chạy toàn bộ hệ thống (Backend + Worker + Frontend):

```bash
# 1. Start Backend API & Orchestrator
uvicorn backend.main:app --reload --port 8000

# 2. Start Background Worker (cho các tác vụ nặng)
arq backend.core.tasks.worker.WorkerSettings

# 3. Start Frontend Dashboard
ng serve --port 4200
```

### 3.2 Theo dõi Trạng thái (Monitor)
Truy cập: `http://localhost:4200/admin/workflow-dashboard`
- **Steps Visualization**: Xem workflow đang chạy đến bước nào.
- **Live Logs**: Xem log chi tiết của từng Agent (đang suy nghĩ gì, làm gì).

### 3.3 Trigger một Workflow mới
Gửi POST request tới API (hoặc dùng UI):

```json
POST /api/workflows/create
{
  "feature_name": "Employee Management Module",
  "request_type": "module",
  "details": "Create full CRUD for employees with timekeeping."
}
```

---

## 🧩 4. Hướng Dẫn Mở Rộng (Extension Guide)

### 4.1 Thêm Rule mới
Chỉ cần sửa file Markdown, **không cần sửa code Python**.
*   Frontend Rules: `prompts/rules/frontend.md`
*   Database Rules: `prompts/rules/database.md`
*   ...

Hệ thống (`RuleLoader`) sẽ tự động đọc file mới nhất vào lần chạy tiếp theo.

### 4.2 Thêm Agent/Logic mới
1.  Vào `backend/core/workflow/steps.py`.
2.  Tạo class mới kế thừa `BaseStepExecutor`.
3.  Đăng ký trong `StepExecutorFactory`.
4.  Cập nhật `WorkflowRouter` để điều hướng tới bước mới này.

---

## ⚠️ 5. Troubleshooting

*   **Lỗi "Rule file not found"**: Kiểm tra thư mục `prompts/rules/` có chứa đúng file `.md` không.
*   **Lỗi WebSocket Disconnect**: Kiểm tra Backend có đang chạy (`uvicorn`) không.
*   **Agent trả lời sai luật**: Kiểm tra lại nội dung file `.md` xem có mâu thuẫn (`Hallucination`) không.

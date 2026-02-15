# Hướng Dẫn: /frontend-quality-gate

> **Skills**: ALL Vercel Skills | **Cập nhật**: 01/02/2026

---

## 1. Tổng Quan

Comprehensive quality gate trước release, kết hợp tất cả Vercel Skills.

**Cú pháp**: `/frontend-quality-gate {path} --platform {platform} --release {type}`

---

## 2. 6 Phases

| Phase | Weight | Skill/Workflow |
| :---: | :---: | :--- |
| 1 | 0.15 | Static Analysis (TypeScript, ESLint) |
| 2 | 0.25 | Performance (`react-best-practices`) |
| 3 | 0.20 | Accessibility (`web-design-guidelines`) |
| 4 | 0.15 | Architecture (`composition-patterns`) |
| 5 | 0.15 | Security Check |
| 6 | 0.10 | Mobile (`react-native-skills`) - optional |

---

## 3. Decision Matrix

| Score | Verdict | Action |
| :---: | :--- | :--- |
| ≥ 8.5 | ✅ **GO** | Ready for release |
| 7.0-8.4 | ⚠️ **CONDITIONAL GO** | Fix high-priority first |
| 5.0-6.9 | 🟡 **HOLD** | Significant improvements |
| < 5.0 | ❌ **NO GO** | Block release |

---

## 4. Blocking Criteria (Auto NO-GO)

| Criterion | Threshold |
| :--- | :---: |
| TypeScript Errors | > 0 |
| ESLint Errors | > 0 |
| Security Vulnerabilities (High) | > 0 |
| Accessibility Critical Issues | > 0 |

---

## 5. Links

- Workflow: `.agent/workflows/frontend-quality-gate.md`
- Skills: `.agent/skills/`

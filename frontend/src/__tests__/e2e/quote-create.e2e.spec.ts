/**
 * E2E Test Specification: Create Quote Flow
 * ===========================================
 * 
 * This file contains E2E test cases for the Create Quote feature.
 * Can be executed with Playwright, Cypress, or adapted for browser testing.
 * 
 * Test Coverage:
 * - TC01: Navigate to Create Quote from List
 * - TC02: Form Validation (Required Fields)
 * - TC03: Successful Quote Creation
 * - TC04: Loading States (P2 Fix Verification)
 * 
 * Prerequisites:
 * - Backend running on port 8000
 * - Frontend running on port 3000
 * - Test user credentials: nguyenphap.mt@gmail.com / password
 */

// Test Data Constants
const TEST_DATA = {
    credentials: {
        email: 'nguyenphap.mt@gmail.com',
        password: 'password'
    },
    validQuote: {
        customer_name: 'Nguyen Van Test E2E',
        customer_phone: '0901234567',
        customer_email: 'test.e2e@example.com',
        event_type: 'wedding', // or 'birthday', 'corporate', etc.
        event_date: '2026-12-31', // Future date YYYY-MM-DD
        event_time: '18:00',
        table_count: '10',
        guest_count: '100', // Optional
        event_address: '123 Le Loi, Quan 1, Ho Chi Minh',
        notes: 'E2E Test - Please ignore'
    },
    urls: {
        baseUrl: 'http://localhost:3000',
        login: '/login',
        quoteList: '/quote',
        quoteCreate: '/quote/create'
    }
};

// ============================================
// TC01: Navigate to Create Quote from List
// ============================================
/**
 * Test: Verify navigation from Quote List to Create Quote page
 * 
 * Steps:
 * 1. Login with valid credentials
 * 2. Navigate to Quote List (/quote)
 * 3. Click "Tạo báo giá" button
 * 4. Verify redirect to /quote/create
 * 
 * Expected:
 * - Button shows loading spinner during navigation (P2 fix)
 * - Successfully redirects to Create Quote page
 * - Create Quote form is displayed
 */
const testNavigateToCreateQuote = {
    name: 'TC01: Navigate to Create Quote from List',
    steps: [
        { action: 'navigate', url: `${TEST_DATA.urls.baseUrl}${TEST_DATA.urls.login}` },
        { action: 'fill', selector: 'input[type="email"]', value: TEST_DATA.credentials.email },
        { action: 'fill', selector: 'input[type="password"]', value: TEST_DATA.credentials.password },
        { action: 'click', selector: 'button[type="submit"]' },
        { action: 'waitForNavigation', url: '/dashboard' },
        { action: 'navigate', url: `${TEST_DATA.urls.baseUrl}${TEST_DATA.urls.quoteList}` },
        { action: 'waitForSelector', selector: 'button:has-text("Tạo báo giá")' },
        { action: 'click', selector: 'button:has-text("Tạo báo giá")' },
        { action: 'waitForNavigation', url: TEST_DATA.urls.quoteCreate },
        { action: 'assertVisible', selector: 'h1:has-text("Tạo báo giá mới")' }
    ],
    assertions: [
        { type: 'url', expected: TEST_DATA.urls.quoteCreate },
        { type: 'visible', selector: 'form' },
        { type: 'visible', selector: 'input#customer_name' }
    ]
};

// ============================================
// TC02: Form Validation (Required Fields)
// ============================================
/**
 * Test: Verify form validation for required fields
 * 
 * Steps:
 * 1. Login and navigate to Create Quote
 * 2. Leave all fields empty
 * 3. Click "Tiếp tục" button
 * 4. Verify validation error messages appear
 * 
 * Expected:
 * - Error messages display for all required fields
 * - Form does not proceed to Step 2
 */
const testFormValidation = {
    name: 'TC02: Form Validation (Required Fields)',
    steps: [
        { action: 'navigate', url: `${TEST_DATA.urls.baseUrl}${TEST_DATA.urls.quoteCreate}` },
        { action: 'click', selector: 'button:has-text("Tiếp tục")' }
    ],
    assertions: [
        { type: 'visible', selector: 'p.text-red-500:has-text("Vui lòng nhập tên khách hàng")' },
        { type: 'visible', selector: 'p.text-red-500:has-text("Vui lòng nhập số điện thoại")' },
        { type: 'visible', selector: 'p.text-red-500:has-text("Vui lòng chọn ngày sự kiện")' },
        { type: 'visible', selector: 'p.text-red-500:has-text("Vui lòng nhập giờ sự kiện")' },
        { type: 'visible', selector: 'p.text-red-500:has-text("Vui lòng nhập số bàn")' },
        { type: 'visible', selector: 'p.text-red-500:has-text("Vui lòng chọn loại tiệc")' },
        { type: 'visible', selector: 'p.text-red-500:has-text("Vui lòng nhập địa điểm")' }
    ]
};

// ============================================
// TC03: Successful Quote Creation
// ============================================
/**
 * Test: Create a quote successfully with valid data
 * 
 * Steps:
 * 1. Login and navigate to Create Quote
 * 2. Fill all required fields with valid data
 * 3. Click "Tiếp tục" to proceed to Step 2
 * 4. Click "Tạo báo giá" to submit
 * 5. Verify success toast and redirect
 * 
 * Expected:
 * - Form proceeds to Step 2 (Confirmation)
 * - Quote is created successfully
 * - Success toast appears: "Tạo báo giá thành công"
 * - Redirected to Quote List (/quote)
 */
const testSuccessfulQuoteCreation = {
    name: 'TC03: Successful Quote Creation',
    steps: [
        { action: 'navigate', url: `${TEST_DATA.urls.baseUrl}${TEST_DATA.urls.quoteCreate}` },
        { action: 'fill', selector: '#customer_name', value: TEST_DATA.validQuote.customer_name },
        { action: 'fill', selector: '#customer_phone', value: TEST_DATA.validQuote.customer_phone },
        { action: 'fill', selector: '#customer_email', value: TEST_DATA.validQuote.customer_email },
        { action: 'click', selector: 'select#event_type, [data-testid="event_type"]' },
        { action: 'selectOption', selector: '#event_type', value: TEST_DATA.validQuote.event_type },
        { action: 'fill', selector: '#event_date', value: TEST_DATA.validQuote.event_date },
        { action: 'fill', selector: '#event_time', value: TEST_DATA.validQuote.event_time },
        { action: 'fill', selector: '#table_count', value: TEST_DATA.validQuote.table_count },
        { action: 'fill', selector: '#event_address', value: TEST_DATA.validQuote.event_address },
        { action: 'fill', selector: '#notes', value: TEST_DATA.validQuote.notes },
        { action: 'click', selector: 'button:has-text("Tiếp tục")' },
        { action: 'waitForSelector', selector: 'button:has-text("Tạo báo giá")' },
        { action: 'click', selector: 'button:has-text("Tạo báo giá")' },
        { action: 'waitForToast', text: 'Tạo báo giá thành công' },
        { action: 'waitForNavigation', url: TEST_DATA.urls.quoteList }
    ],
    assertions: [
        { type: 'toast', text: 'Tạo báo giá thành công', variant: 'success' },
        { type: 'url', expected: TEST_DATA.urls.quoteList }
    ]
};

// ============================================
// TC04: Loading States (P2 Fix Verification)
// ============================================
/**
 * Test: Verify loading states during navigation
 * 
 * Steps:
 * 1. Navigate to Quote List
 * 2. Click "Tạo báo giá" button
 * 3. Verify button shows loading spinner immediately
 * 4. Verify button text changes to "Đang chuyển..."
 * 
 * Expected (P2 Fix):
 * - Button is disabled during navigation
 * - Spinner icon appears instead of Plus icon
 * - Text changes to "Đang chuyển..."
 */
const testLoadingStates = {
    name: 'TC04: Loading States (P2 Fix Verification)',
    steps: [
        { action: 'navigate', url: `${TEST_DATA.urls.baseUrl}${TEST_DATA.urls.quoteList}` },
        { action: 'waitForSelector', selector: 'button:has-text("Tạo báo giá")' },
        { action: 'click', selector: 'button:has-text("Tạo báo giá")' },
        // Immediately after click, verify loading state
        { action: 'assertVisible', selector: 'button:has-text("Đang chuyển...")' },
        { action: 'assertVisible', selector: 'button svg.animate-spin' }
    ],
    assertions: [
        { type: 'visible', selector: 'button:disabled' },
        { type: 'visible', selector: 'svg.animate-spin' },
        { type: 'text', selector: 'button', expected: 'Đang chuyển...' }
    ]
};

// ============================================
// Export Test Suite
// ============================================
export const QuoteCreateE2ETestSuite = {
    name: 'Quote Create E2E Tests',
    version: '1.0.0',
    createdAt: '2026-02-01',
    tests: [
        testNavigateToCreateQuote,
        testFormValidation,
        testSuccessfulQuoteCreation,
        testLoadingStates
    ]
};

/**
 * Manual Execution Guide
 * ======================
 * 
 * For browser-based manual testing:
 * 
 * 1. Start services:
 *    - Backend: cd backend && python -m uvicorn main:app --reload --port 8000
 *    - Frontend: cd frontend && npm run dev
 * 
 * 2. Open browser at http://localhost:3000/login
 * 
 * 3. Login with credentials:
 *    - Email: nguyenphap.mt@gmail.com
 *    - Password: password
 * 
 * 4. Follow test steps in order:
 *    - TC01: Navigate to Quote List, click "Tạo báo giá"
 *    - TC02: Submit empty form, check error messages
 *    - TC03: Fill valid data, submit, verify success
 *    - TC04: Navigate again, observe loading spinner
 * 
 * Expected Results:
 * - All navigations work smoothly
 * - Loading spinner appears when clicking "Tạo báo giá" (P2 fix)
 * - Form validation shows Vietnamese error messages
 * - Successful creation shows toast and redirects
 */

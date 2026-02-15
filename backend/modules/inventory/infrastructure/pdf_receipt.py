"""
Inventory Receipt PDF Generator
Generates import/export receipts as PDF files with Vietnamese support.
Enhanced with project logo and branded color scheme.
"""
from fpdf import FPDF
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from io import BytesIO
from pathlib import Path
import pytz
import os


VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')
FONT_PATH = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD_PATH = "C:/Windows/Fonts/arialbd.ttf"

# Brand colors (SaddleBrown scheme — matching Excel/PDF export engine)
BRAND_BROWN = (139, 69, 19)      # #8B4513
BRAND_TAN = (210, 180, 140)      # Tan border
BRAND_DARK = (45, 45, 45)        # Near-black text
BRAND_GRAY = (100, 116, 139)     # Gray text
BRAND_ALT_ROW = (240, 230, 212)  # Warm beige

# Find logo dynamically from project root
def _find_logo_path() -> Optional[str]:
    """Search for Logo.png starting from this file's location upward."""
    current = Path(__file__).resolve()
    for _ in range(6):  # Walk up to 6 levels
        current = current.parent
        candidate = current / "Logo.png"
        if candidate.exists():
            return str(candidate)
        # Also check frontend/public
        candidate2 = current / "frontend" / "public" / "Logo.png"
        if candidate2.exists():
            return str(candidate2)
    return None


class InventoryReceiptPDF(FPDF):
    """Custom PDF class for Inventory Receipts with branded header."""
    
    def __init__(self):
        super().__init__()
        self.add_font("VNFont", "", FONT_PATH, uni=True)
        self.add_font("VNFont", "B", FONT_BOLD_PATH, uni=True)
        self._logo_path = _find_logo_path()
    
    def header(self):
        # Try to render logo image
        logo_rendered = False
        if self._logo_path:
            try:
                self.image(self._logo_path, x=10, y=8, w=55)
                logo_rendered = True
            except Exception:
                pass
        
        if not logo_rendered:
            # Fallback: text header with brand color
            self.set_font("VNFont", "B", 14)
            self.set_text_color(*BRAND_BROWN)
            self.cell(0, 10, "ẨM THỰC GIAO TUYẾT", align="C", new_x="LMARGIN", new_y="NEXT")
        
        # Subtitle (right-aligned)
        self.set_y(12)
        self.set_font("VNFont", "", 9)
        self.set_text_color(*BRAND_GRAY)
        self.cell(0, 5, "Hệ thống quản lý kho", align="R", new_x="LMARGIN", new_y="NEXT")
        now = datetime.now(VN_TZ).strftime("%d/%m/%Y %H:%M")
        self.cell(0, 5, f"Ngày in: {now}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(*BRAND_DARK)
        
        # Brown separator line
        self.ln(3)
        self.set_draw_color(*BRAND_BROWN)
        self.set_line_width(0.8)
        self.line(10, self.get_y(), 200, self.get_y())
        self.set_line_width(0.2)
        self.ln(5)
    
    def footer(self):
        self.set_y(-15)
        self.set_draw_color(*BRAND_TAN)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)
        self.set_font("VNFont", "", 7)
        self.set_text_color(*BRAND_GRAY)
        self.cell(0, 5, f"Trang {self.page_no()}/{{nb}}  |  Ẩm Thực Giao Tuyết ERP", align="C")


def generate_receipt_pdf(
    receipt_type: str,  # "IMPORT" or "EXPORT"
    item_name: str,
    item_sku: str,
    item_uom: str,
    quantity: float,
    warehouse_name: str,
    transaction_id: str,
    created_at: str,
    notes: Optional[str] = None,
    reason: Optional[str] = None,
    reference_doc: Optional[str] = None,
    unit_price: Optional[float] = None,
    lots: Optional[List[dict]] = None,
    method: Optional[str] = None,
) -> bytes:
    """
    Generate a PDF receipt for inventory import/export.
    Returns PDF as bytes.
    """
    pdf = InventoryReceiptPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # ===== TITLE =====
    is_export = receipt_type == "EXPORT"
    title = "PHIẾU XUẤT KHO" if is_export else "PHIẾU NHẬP KHO"
    title_color = (220, 38, 38) if is_export else (22, 163, 74)  # red / green
    
    pdf.set_font("VNFont", "B", 18)
    pdf.set_text_color(*title_color)
    pdf.cell(0, 12, title, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(*BRAND_DARK)
    pdf.ln(3)
    
    # ===== RECEIPT INFO =====
    pdf.set_font("VNFont", "", 10)
    
    # Parse and format date
    try:
        if isinstance(created_at, str):
            dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        else:
            dt = created_at
        date_str = dt.astimezone(VN_TZ).strftime("%d/%m/%Y %H:%M")
    except Exception:
        date_str = str(created_at)
    
    # Receipt metadata
    info_data = [
        ("Mã phiếu:", transaction_id[:12] + "..."),
        ("Ngày:", date_str),
        ("Kho:", warehouse_name),
    ]
    if reference_doc:
        info_data.append(("Chứng từ:", reference_doc))
    if reason:
        info_data.append(("Lý do:", reason))
    
    for label, value in info_data:
        pdf.set_font("VNFont", "B", 10)
        pdf.set_text_color(*BRAND_BROWN)
        pdf.cell(35, 7, label)
        pdf.set_font("VNFont", "", 10)
        pdf.set_text_color(*BRAND_DARK)
        pdf.cell(0, 7, value, new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(5)
    
    # ===== SEPARATOR =====
    pdf.set_draw_color(*BRAND_TAN)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)
    
    # ===== ITEM DETAILS =====
    pdf.set_font("VNFont", "B", 11)
    pdf.set_text_color(*BRAND_DARK)
    pdf.cell(0, 8, "CHI TIẾT HÀNG HÓA", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    
    # Table header (branded brown)
    col_widths = [15, 45, 35, 30, 25, 40]
    headers = ["STT", "Tên hàng", "SKU", "Đơn vị", "Số lượng", "Đơn giá"]
    
    pdf.set_font("VNFont", "B", 9)
    pdf.set_fill_color(*BRAND_BROWN)
    pdf.set_text_color(255, 255, 255)
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 8, h, border=1, fill=True, align="C")
    pdf.ln()
    pdf.set_text_color(*BRAND_DARK)
    
    # Table row
    pdf.set_font("VNFont", "", 9)
    row_data = [
        "1",
        item_name[:25],
        item_sku,
        item_uom,
        f"{quantity:,.2f}",
        f"{unit_price:,.0f} đ" if unit_price else "—",
    ]
    pdf.set_fill_color(255, 255, 255)
    for i, d in enumerate(row_data):
        align = "R" if i >= 4 else ("C" if i == 0 else "L")
        pdf.cell(col_widths[i], 8, d, border=1, align=align, fill=True)
    pdf.ln()
    
    # Total row (warm cream background)
    if unit_price:
        total = quantity * unit_price
        pdf.set_font("VNFont", "B", 9)
        pdf.set_fill_color(255, 243, 205)  # SUMMARY_BG
        pdf.cell(sum(col_widths[:4]), 8, "TỔNG CỘNG", border=1, align="R", fill=True)
        pdf.cell(col_widths[4], 8, f"{quantity:,.2f}", border=1, align="R", fill=True)
        pdf.cell(col_widths[5], 8, f"{total:,.0f} đ", border=1, align="R", fill=True)
        pdf.ln()
    
    pdf.ln(5)
    
    # ===== LOT DEDUCTION DETAILS (EXPORT only) =====
    if is_export and lots and len(lots) > 0:
        pdf.set_font("VNFont", "B", 11)
        pdf.set_text_color(*BRAND_DARK)
        method_text = "(FIFO tự động)" if method == "FIFO" else "(Chọn thủ công)"
        pdf.cell(0, 8, f"PHÂN BỔ LOT {method_text}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)
        
        lot_cols = [15, 55, 40, 40, 40]
        lot_headers = ["STT", "Mã Lot", "Số lượng xuất", "Tồn còn lại", "Trạng thái"]
        
        pdf.set_font("VNFont", "B", 9)
        pdf.set_fill_color(*BRAND_BROWN)
        pdf.set_text_color(255, 255, 255)
        for i, h in enumerate(lot_headers):
            pdf.cell(lot_cols[i], 8, h, border=1, fill=True, align="C")
        pdf.ln()
        pdf.set_text_color(*BRAND_DARK)
        
        pdf.set_font("VNFont", "", 9)
        for idx, lot in enumerate(lots):
            # Alternating row colors
            is_alt = idx % 2 == 1
            pdf.set_fill_color(*BRAND_ALT_ROW) if is_alt else pdf.set_fill_color(255, 255, 255)
            
            pdf.cell(lot_cols[0], 8, str(idx + 1), border=1, align="C", fill=True)
            pdf.cell(lot_cols[1], 8, lot.get("lot_number", "—"), border=1, fill=True)
            qty_deducted = lot.get("quantity_deducted", "—")
            pdf.cell(lot_cols[2], 8, f"{qty_deducted:,.2f}" if isinstance(qty_deducted, (int, float)) else str(qty_deducted), border=1, align="R", fill=True)
            remaining = lot.get("remaining", "—")
            pdf.cell(lot_cols[3], 8, f"{remaining:,.2f}" if isinstance(remaining, (int, float)) else str(remaining), border=1, align="R", fill=True)
            status = lot.get("status", "ACTIVE")
            pdf.cell(lot_cols[4], 8, status, border=1, align="C", fill=True)
            pdf.ln()
        
        pdf.ln(5)
    
    # ===== NOTES =====
    if notes:
        pdf.set_font("VNFont", "B", 10)
        pdf.set_text_color(*BRAND_BROWN)
        pdf.cell(0, 8, "GHI CHÚ:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("VNFont", "", 10)
        pdf.set_text_color(*BRAND_DARK)
        pdf.multi_cell(0, 6, notes)
        pdf.ln(5)
    
    # ===== SIGNATURES =====
    pdf.ln(10)
    pdf.set_draw_color(*BRAND_TAN)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(8)
    
    pdf.set_font("VNFont", "B", 10)
    pdf.set_text_color(*BRAND_DARK)
    col_w = 63
    pdf.cell(col_w, 8, "Người lập phiếu", align="C")
    pdf.cell(col_w, 8, "Thủ kho", align="C")
    pdf.cell(col_w, 8, "Giám đốc", align="C")
    pdf.ln()
    
    pdf.set_font("VNFont", "", 9)
    pdf.set_text_color(*BRAND_GRAY)
    pdf.cell(col_w, 6, "(Ký, họ tên)", align="C")
    pdf.cell(col_w, 6, "(Ký, họ tên)", align="C")
    pdf.cell(col_w, 6, "(Ký, họ tên)", align="C")
    
    # Return as bytes (fpdf2 returns bytearray, FastAPI needs bytes)
    return bytes(pdf.output())

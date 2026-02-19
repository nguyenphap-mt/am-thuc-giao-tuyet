"""Analyze text boxes inside the Word template."""
from docx import Document
from lxml import etree

doc = Document(r'd:\PROJECT\AM THUC GIAO TUYET\menu mẫu.docx')

# Namespace map
nsmap = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'wps': 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
    'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
}

# Find all txbxContent elements
txbx_contents = doc.element.body.findall('.//w:txbxContent', nsmap)
print(f"Found {len(txbx_contents)} txbxContent elements")

for i, txbx in enumerate(txbx_contents):
    print(f"\n=== TEXT BOX {i} ===")
    paragraphs = txbx.findall('.//w:p', nsmap)
    print(f"  Paragraphs: {len(paragraphs)}")
    
    for pi, p in enumerate(paragraphs):
        runs = p.findall('.//w:r', nsmap)
        full_text = ''
        for r in runs:
            t_elements = r.findall('.//w:t', nsmap)
            for t in t_elements:
                if t.text:
                    full_text += t.text
        print(f"  P{pi}: [{full_text.strip()}]")

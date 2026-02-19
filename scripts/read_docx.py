import zipfile
import xml.etree.ElementTree as ET

z = zipfile.ZipFile(r'd:\PROJECT\AM THUC GIAO TUYET\menu mẫu.docx')
tree = ET.parse(z.open('word/document.xml'))
root = tree.getroot()

ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

# Get all paragraphs
for i, p in enumerate(root.findall('.//w:p', ns)):
    text_parts = []
    for t in p.findall('.//w:t', ns):
        if t.text:
            text_parts.append(t.text)
    line = ''.join(text_parts)
    if line.strip():
        print(f"[{i}] {line}")

# Get all tables
print("\n=== TABLES ===")
for ti, table in enumerate(root.findall('.//w:tbl', ns)):
    print(f"\n--- Table {ti} ---")
    for ri, row in enumerate(table.findall('.//w:tr', ns)):
        cells = []
        for cell in row.findall('.//w:tc', ns):
            cell_text = ''.join(t.text or '' for t in cell.findall('.//w:t', ns))
            cells.append(cell_text)
        print(f"  Row {ri}: {cells}")

z.close()

"""Standalone test for menu generator."""
import copy
import io
from pathlib import Path
from docx import Document
from lxml import etree

TEMPLATE_PATH = Path(r'd:\PROJECT\AM THUC GIAO TUYET\menu mẫu.docx')
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_NS = "http://www.w3.org/XML/1998/namespace"

def generate_menu_docx(dish_names):
    doc = Document(str(TEMPLATE_PATH))
    txbx_contents = doc.element.body.findall(f'.//{{{W_NS}}}txbxContent')
    print(f"Found {len(txbx_contents)} text boxes")

    for ti, txbx in enumerate(txbx_contents):
        paragraphs = txbx.findall(f'{{{W_NS}}}p')
        print(f"  TextBox {ti}: {len(paragraphs)} paragraphs")

        if not paragraphs:
            continue

        dish_paragraphs = paragraphs[1:]
        if not dish_paragraphs:
            continue

        template_run = None
        first_dish_p = dish_paragraphs[0]
        runs = first_dish_p.findall(f'{{{W_NS}}}r')
        if runs:
            template_run = runs[0]

        template_pPr = first_dish_p.find(f'{{{W_NS}}}pPr')

        for dp in dish_paragraphs:
            txbx.remove(dp)

        for i, dish_name in enumerate(dish_names):
            numbered_text = f"{i + 1}.  {dish_name}"
            new_p = etree.SubElement(txbx, f'{{{W_NS}}}p')

            if template_pPr is not None:
                new_p.insert(0, copy.deepcopy(template_pPr))

            r_elem = etree.SubElement(new_p, f'{{{W_NS}}}r')
            if template_run is not None:
                rPr = template_run.find(f'{{{W_NS}}}rPr')
                if rPr is not None:
                    r_elem.insert(0, copy.deepcopy(rPr))

            t_elem = etree.SubElement(r_elem, f'{{{W_NS}}}t')
            t_elem.attrib[f'{{{XML_NS}}}space'] = 'preserve'
            t_elem.text = numbered_text

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer

dishes = [
    'Tôm chiên rế Sài Gòn xưa',
    'Gà ta hấp đồng quê + xôi',
    'Nai né thiên lý',
    'Bánh chưng + chả lụa + củ kiệu',
    'Lẩu riêu cua bắp bò',
    'Tàu hũ singapore',
    'Chả giò rế',
    'Bò nướng lá lốt',
]

buf = generate_menu_docx(dishes)
output_path = Path(r'd:\PROJECT\AM THUC GIAO TUYET\test_output.docx')
with open(output_path, 'wb') as f:
    f.write(buf.read())

print(f"SUCCESS! Generated: {output_path}")
print(f"File size: {output_path.stat().st_size} bytes")

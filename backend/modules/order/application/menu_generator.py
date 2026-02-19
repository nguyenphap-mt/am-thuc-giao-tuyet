"""
Menu Generator Service
Generates .docx menu card from Word template by replacing text box content
with actual order items. Preserves all formatting, borders, and ornaments.
"""

import copy
import io
from pathlib import Path
from typing import List

from docx import Document
from lxml import etree

# Path to the menu template
TEMPLATE_PATH = Path(__file__).resolve().parents[3] / "templates" / "menu_template.docx"

# Word XML namespace
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _get_text_box_contents(doc: Document) -> list:
    """Find all <w:txbxContent> elements in the document."""
    return doc.element.body.findall(f'.//{{{W_NS}}}txbxContent')


def _get_paragraphs_from_txbx(txbx) -> list:
    """Get all <w:p> elements directly inside a txbxContent."""
    return txbx.findall(f'{{{W_NS}}}p')


def _clear_runs(paragraph) -> None:
    """Remove all <w:r> elements from a paragraph (keeps pPr)."""
    for r in paragraph.findall(f'{{{W_NS}}}r'):
        paragraph.remove(r)


def _set_paragraph_text(paragraph, text: str, template_run=None) -> None:
    """
    Set a paragraph's text by clearing existing runs and adding a new one.
    If template_run is provided, copy its formatting (rPr).
    """
    _clear_runs(paragraph)

    # Create new run
    r_elem = etree.SubElement(paragraph, f'{{{W_NS}}}r')

    # Copy formatting from template run if available
    if template_run is not None:
        rPr = template_run.find(f'{{{W_NS}}}rPr')
        if rPr is not None:
            r_elem.insert(0, copy.deepcopy(rPr))

    # Add text element
    t_elem = etree.SubElement(r_elem, f'{{{W_NS}}}t')
    XML_NS = 'http://www.w3.org/XML/1998/namespace'
    t_elem.attrib[f'{{{XML_NS}}}space'] = 'preserve'
    t_elem.text = text


def generate_menu_docx(dish_names: List[str]) -> io.BytesIO:
    """
    Generate a menu .docx file by replacing dish names in the template.

    Args:
        dish_names: List of dish name strings (e.g., ["Tôm chiên rế Sài Gòn xưa", ...])

    Returns:
        BytesIO buffer containing the generated .docx file
    """
    if not TEMPLATE_PATH.exists():
        raise FileNotFoundError(f"Menu template not found at: {TEMPLATE_PATH}")

    doc = Document(str(TEMPLATE_PATH))

    # Find all text box contents
    txbx_contents = _get_text_box_contents(doc)

    for txbx in txbx_contents:
        paragraphs = _get_paragraphs_from_txbx(txbx)

        if not paragraphs:
            continue

        # P0 is always "MENU" title — leave it unchanged
        # P1..P6 are dish names — replace them

        # Get the first dish paragraph to use as formatting template
        dish_paragraphs = paragraphs[1:]  # Skip MENU title (P0)

        if not dish_paragraphs:
            continue

        # Get template run formatting from the first dish paragraph
        template_run = None
        first_dish_p = dish_paragraphs[0]
        runs = first_dish_p.findall(f'{{{W_NS}}}r')
        if runs:
            template_run = runs[0]

        # Get template paragraph properties (pPr) for cloning new paragraphs
        template_pPr = first_dish_p.find(f'{{{W_NS}}}pPr')

        # Remove ALL existing dish paragraphs (P1 onwards)
        for dp in dish_paragraphs:
            txbx.remove(dp)

        # Add new paragraphs for each dish
        for i, dish_name in enumerate(dish_names):
            # BUGFIX: BUG-20260219-002
            # Word template pPr already has auto-numbering (list format).
            # Only set the dish name text — Word handles the "1. 2. 3." prefix.
            # Create new paragraph element
            new_p = etree.SubElement(txbx, f'{{{W_NS}}}p')

            # Copy paragraph properties (spacing, alignment, numbering, etc.)
            if template_pPr is not None:
                new_p.insert(0, copy.deepcopy(template_pPr))

            # Set text with formatting (dish name only, no manual numbering)
            _set_paragraph_text(new_p, dish_name, template_run)

    # Save to BytesIO buffer
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer

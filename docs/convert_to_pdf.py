#!/usr/bin/env python3
"""Convert NCPS report markdown to PDF using weasyprint."""
import os, re, markdown
from weasyprint import HTML

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))
REPORT_MD = os.path.join(DOCS_DIR, "NCPS_FINAL_PROJECT_REPORT.md")
OUTPUT_PDF = os.path.join(DOCS_DIR, "NCPS_FINAL_PROJECT_REPORT.pdf")

print("Reading markdown...")
with open(REPORT_MD, "r", encoding="utf-8") as f:
    md_text = f.read()

# --- LaTeX -> readable Unicode/HTML -----------------------------------------
# The report writes formulas in $...$ / $$...$$ LaTeX. Rather than dumping the
# raw commands into the PDF, translate the common constructs to Unicode symbols
# with HTML sub/superscripts so the math reads like properly typeset notation.
_SYMBOLS = {
    'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'Delta': 'Δ',
    'epsilon': 'ε', 'varepsilon': 'ε', 'theta': 'θ', 'lambda': 'λ', 'mu': 'µ',
    'nu': 'ν', 'sigma': 'σ', 'Sigma': 'Σ', 'tau': 'τ', 'phi': 'φ', 'rho': 'ρ',
    'pi': 'π', 'omega': 'ω', 'eta': 'η', 'kappa': 'κ', 'times': '×', 'cdot': '·',
    'pm': '±', 'leq': '≤', 'le': '≤', 'geq': '≥', 'ge': '≥', 'neq': '≠',
    'approx': '≈', 'forall': '∀', 'exists': '∃', 'in': '∈', 'notin': '∉',
    'infty': '∞', 'rightarrow': '→', 'Rightarrow': '⇒', 'to': '→', 'sum': 'Σ',
    'prod': '∏', 'partial': '∂', 'nabla': '∇', 'propto': '∝', 'sim': '∼',
    'wedge': '∧', 'vee': '∨', 'cup': '∪', 'cap': '∩', 'subseteq': '⊆',
    'langle': '⟨', 'rangle': '⟩', 'cdots': '⋯', 'ldots': '…', 'circ': '∘',
}

# sentinels keep LaTeX-escaped literals safe from later brace/command stripping
_ESCAPES = {r'\{': '\x01', r'\}': '\x02', r'\_': '\x03', r'\|': '\x04',
            r'\%': '%', r'\&': '&', r'\#': '#', r'\$': '$'}
_RESTORE = {'\x01': '{', '\x02': '}', '\x03': '_', '\x04': '|'}


def _read_braced(s, i):
    """Given s[i] == '{', return (inner_text, index_after_closing_brace)."""
    depth, j = 0, i
    while j < len(s):
        if s[j] == '{':
            depth += 1
        elif s[j] == '}':
            depth -= 1
            if depth == 0:
                return s[i + 1:j], j + 1
        j += 1
    return s[i + 1:], len(s)


def _replace_frac(s):
    """Rewrite \\frac{A}{B} -> (A)/(B), honouring nested/braced arguments."""
    out, i = [], 0
    while i < len(s):
        if s.startswith(r'\frac', i):
            k = i + 5
            while k < len(s) and s[k] == ' ':
                k += 1
            if k < len(s) and s[k] == '{':
                num, k = _read_braced(s, k)
                while k < len(s) and s[k] == ' ':
                    k += 1
                if k < len(s) and s[k] == '{':
                    den, k = _read_braced(s, k)
                    out.append('(' + _replace_frac(num) + ')/(' + _replace_frac(den) + ')')
                    i = k
                    continue
        out.append(s[i])
        i += 1
    return ''.join(out)


def latexify(s):
    s = s.strip()
    for esc, sent in _ESCAPES.items():
        s = s.replace(esc, sent)
    # textual wrappers and the indicator symbol
    s = re.sub(r'\\mathbb\{([^{}]*)\}', r'\1', s)
    s = re.sub(r'\\(?:text|mathrm|mathbf|mathit|mathcal|operatorname)\{([^{}]*)\}', r'\1', s)
    s = s.replace('\\left', '').replace('\\right', '')
    s = _replace_frac(s)
    # \sqrt{...}
    while True:
        m = re.search(r'\\sqrt\{', s)
        if not m:
            break
        inner, end = _read_braced(s, m.end() - 1)
        s = s[:m.start()] + '√(' + inner + ')' + s[end:]
    # named symbols, longest first so prefixes don't win
    for name, ch in sorted(_SYMBOLS.items(), key=lambda kv: -len(kv[0])):
        s = re.sub(r'\\' + name + r'(?![A-Za-z])', ch, s)
    # spacing commands
    s = re.sub(r'\\(?:quad|qquad|,|;|:|!)', ' ', s)
    # subscripts and superscripts
    s = re.sub(r'_\{([^{}]*)\}', r'<sub>\1</sub>', s)
    s = re.sub(r'_([A-Za-z0-9])', r'<sub>\1</sub>', s)
    s = re.sub(r'\^\{([^{}]*)\}', r'<sup>\1</sup>', s)
    s = re.sub(r'\^([A-Za-z0-9*+\-])', r'<sup>\1</sup>', s)
    # any leftover commands: drop the backslash, keep the word
    s = re.sub(r'\\([A-Za-z]+)', r'\1', s)
    s = s.replace('{', '').replace('}', '')
    for sent, ch in _RESTORE.items():
        s = s.replace(sent, ch)
    return s


# Clean markdown
md_text = re.sub(r'<!--.*?-->', '', md_text, flags=re.DOTALL)
md_text = re.sub(r'<div[^>]*page-break[^>]*>.*?</div>', '<div class="pagebreak"></div>', md_text, flags=re.DOTALL)
md_text = re.sub(r'<br\s*/?>', '<br/>', md_text)
md_text = re.sub(r'\$\$(.*?)\$\$', lambda m: f'<div class="mathblock">{latexify(m.group(1))}</div>', md_text, flags=re.DOTALL)
md_text = re.sub(r'\$(.*?)\$', lambda m: f'<span class="math">{latexify(m.group(1))}</span>', md_text)

print("Converting to HTML...")
md_converter = markdown.Markdown(extensions=['tables', 'fenced_code'])
html_body = md_converter.convert(md_text)

# Build full HTML
html_full = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>NCPS Final Year Project Report</title>
<style>
/* ============================================================
   IEEE STANDARD FORMATTING
   Font: Times New Roman (serif fallback)
   Body: 10pt, single-spaced (1.15 line-height for readability)
   Margins: 1 inch (25.4mm) top/bottom, 0.75 inch (19mm) sides
   Headings: IEEE hierarchy
   ============================================================ */

@page {{
    size: A4;
    margin: 25.4mm 19mm 25.4mm 19mm;
    @top-center {{
        content: "NETWORK-AWARE CREDIBILITY AND PROPAGATION SYSTEM | 2026";
        font-size: 8pt;
        color: #333;
        font-family: 'Times New Roman', 'Times', 'DejaVu Serif', serif;
        border-bottom: 0.5pt solid #000;
        padding-bottom: 4pt;
    }}
    @bottom-center {{
        content: counter(page) " — Dept. of CSE, National Institute of Technology Srinagar";
        font-size: 8pt;
        color: #333;
        font-family: 'Times New Roman', 'Times', 'DejaVu Serif', serif;
        border-top: 0.5pt solid #000;
        padding-top: 4pt;
    }}
}}

@page :first {{
    @top-center {{ content: ""; border-bottom: none; }}
    @bottom-center {{ content: ""; border-top: none; }}
}}

/* === BODY — IEEE: Times New Roman, 10pt === */
body {{
    font-family: 'Times New Roman', 'Times', 'DejaVu Serif', serif;
    font-size: 10pt;
    line-height: 1.15;
    color: #000;
    text-align: justify;
}}

.pagebreak {{
    page-break-after: always;
    height: 0;
    margin: 0;
    padding: 0;
}}

/* === MATH === */
.mathblock {{
    text-align: center;
    font-family: "Cambria Math", "Latin Modern Math", "Times New Roman", serif;
    font-size: 11.5pt;
    margin: 10px 0;
    page-break-inside: avoid;
}}
.math {{
    font-family: "Cambria Math", "Latin Modern Math", "Times New Roman", serif;
    white-space: nowrap;
}}
.mathblock sub, .math sub {{ font-size: 0.72em; vertical-align: -0.28em; }}
.mathblock sup, .math sup {{ font-size: 0.72em; vertical-align: 0.42em; }}

/* === HEADINGS — IEEE Standard Hierarchy === */

/* Chapter Title: 24pt, Bold, Centered, UPPERCASE */
h1 {{
    font-family: 'Times New Roman', 'Times', 'DejaVu Serif', serif;
    font-size: 24pt;
    font-weight: bold;
    text-align: center;
    margin-top: 30px;
    margin-bottom: 18px;
    color: #000;
    text-transform: uppercase;
    page-break-before: always;
    letter-spacing: 0.5px;
}}

h1:first-of-type {{
    page-break-before: avoid;
}}

/* Section Heading (e.g. 1.1, 2.1): 12pt, Bold, Small-Caps style */
h2 {{
    font-family: 'Times New Roman', 'Times', 'DejaVu Serif', serif;
    font-size: 12pt;
    font-weight: bold;
    margin-top: 18px;
    margin-bottom: 8px;
    color: #000;
    font-variant: small-caps;
    border-bottom: none;
    padding-bottom: 0;
}}

/* Subsection Heading (e.g. 1.1.1): 10pt, Bold, Italic */
h3 {{
    font-family: 'Times New Roman', 'Times', 'DejaVu Serif', serif;
    font-size: 10pt;
    font-weight: bold;
    font-style: italic;
    margin-top: 14px;
    margin-bottom: 6px;
    color: #000;
}}

/* Sub-subsection: 10pt, Italic */
h4 {{
    font-family: 'Times New Roman', 'Times', 'DejaVu Serif', serif;
    font-size: 10pt;
    font-weight: normal;
    font-style: italic;
    margin-top: 10px;
    margin-bottom: 5px;
    color: #000;
}}

/* === PARAGRAPHS — IEEE: 10pt, justified, first-line indent === */
p {{
    margin-bottom: 6px;
    margin-top: 0;
    orphans: 3;
    widows: 3;
    text-indent: 1.5em;
}}

/* No indent for first paragraph after heading */
h1 + p, h2 + p, h3 + p, h4 + p {{
    text-indent: 0;
}}

/* === TABLES — IEEE: 8pt, centered caption, horizontal rules === */
table {{
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 16px 0;
    font-family: 'Times New Roman', 'Times', 'DejaVu Serif', serif;
    font-size: 8pt;
    page-break-inside: auto;
}}

th {{
    background-color: #000;
    color: #fff;
    font-weight: bold;
    padding: 5px 4px;
    text-align: left;
    border: 1px solid #000;
    font-size: 8pt;
    font-family: 'Times New Roman', 'Times', 'DejaVu Serif', serif;
}}

td {{
    padding: 4px;
    border: 1px solid #666;
    vertical-align: top;
    font-size: 8pt;
    font-family: 'Times New Roman', 'Times', 'DejaVu Serif', serif;
}}

tr:nth-child(even) {{
    background-color: #f2f2f2;
}}

/* === CODE — IEEE: Courier New, 8pt === */
pre {{
    background-color: #f5f5f5;
    border: 1px solid #999;
    padding: 8px 10px;
    margin: 10px 0;
    font-family: 'Courier New', 'Courier', monospace;
    font-size: 8pt;
    line-height: 1.25;
    page-break-inside: avoid;
    overflow-wrap: break-word;
    white-space: pre-wrap;
}}

code {{
    font-family: 'Courier New', 'Courier', monospace;
    font-size: 8.5pt;
    background-color: #eee;
    padding: 1px 3px;
}}

pre code {{
    background: none;
    padding: 0;
    font-size: 8pt;
}}

/* === FIGURES — IEEE: centered, max-width constrained === */
img {{
    max-width: 100%;
    max-height: 260px;
    display: block;
    margin: 14px auto;
    border: 0.5px solid #999;
    page-break-inside: avoid;
}}

/* === LISTS — IEEE style === */
ul, ol {{
    margin: 6px 0 8px 20px;
    font-size: 10pt;
}}

li {{
    margin-bottom: 2px;
}}

/* === HORIZONTAL RULES === */
hr {{
    border: none;
    border-top: 0.5px solid #666;
    margin: 14px 0;
}}

/* === EMPHASIS === */
strong {{
    font-weight: bold;
}}

em, i {{
    font-style: italic;
}}

/* === CENTER ALIGNMENT === */
div[align="center"] {{
    text-align: center;
}}

/* === PAGE BREAK CONTROL === */
h2, h3, h4 {{
    page-break-after: avoid;
}}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

# Save HTML as well
html_path = os.path.join(DOCS_DIR, "NCPS_FINAL_PROJECT_REPORT.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_full)
print(f"HTML saved: {html_path}")

# Convert to PDF
print("Converting to PDF with weasyprint (this may take a minute)...")
HTML(string=html_full, base_url=DOCS_DIR).write_pdf(OUTPUT_PDF)

size_mb = os.path.getsize(OUTPUT_PDF) / (1024 * 1024)
print(f"\n✅ PDF generated successfully!")
print(f"   File: {OUTPUT_PDF}")
print(f"   Size: {size_mb:.1f} MB")

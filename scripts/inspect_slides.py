import sys
sys.path.insert(0, 'E:/site-packages')
from pptx import Presentation

prs = Presentation('Slides Template.pptx')
s2 = prs.slides[1]
print("=== Slide 2 Details ===")
for sh in s2.shapes:
    print(f"\nShape: {sh.name} (type={sh.shape_type})")
    if sh.has_text_frame:
        for p in sh.text_frame.paragraphs:
            print(f"P (level {p.level}): '{p.text[:60]}'")
            for r in p.runs:
                color_info = "default"
                try:
                    if r.font.color:
                        color_info = str(r.font.color.rgb) if r.font.color.type == 1 else f"theme({r.font.color.theme_color})"
                except Exception as e:
                    color_info = f"err({e})"
                print(f"   Run: '{r.text}' | Font: {r.font.name} | Size: {r.font.size.pt if r.font.size else None} | Bold: {r.font.bold} | Color: {color_info}")

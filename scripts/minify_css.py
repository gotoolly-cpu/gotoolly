import re
from pathlib import Path

in_path = Path('assets/css/tools.css')
out_path = Path('assets/css/tools.min.css')
text = in_path.read_text(encoding='utf-8')
# remove comments
text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
# collapse whitespace
text = re.sub(r'\s+', ' ', text)
# remove spaces around symbols
text = re.sub(r'\s*([{}:;,>+~])\s*', r'\1', text)
# final trim
text = text.strip()
out_path.write_text(text, encoding='utf-8')
print(f'Minified {in_path} -> {out_path} (size {out_path.stat().st_size} bytes)')
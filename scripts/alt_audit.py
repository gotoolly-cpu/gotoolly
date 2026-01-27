#!/usr/bin/env python3
"""Scan HTML files for <img> tags missing alt attributes and optionally add placeholder alts.

Usage:
  python scripts/alt_audit.py       # report missing alts
  python scripts/alt_audit.py --apply  # add placeholder alt="" to missing images (safe placeholder)

Note: It's safer to review the report and add meaningful alt text manually.
"""
import argparse
import os
import re

IMG_RE = re.compile(r'<img\s+([^>]*?)>', re.IGNORECASE)
ALT_RE = re.compile(r'\balt\s*=')
SRC_RE = re.compile(r'src\s*=\s*"([^"]+)"')


def scan_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    missing = []
    for m in IMG_RE.finditer(content):
        tag = m.group(0)
        attrs = m.group(1)
        if not ALT_RE.search(attrs):
            src_match = SRC_RE.search(attrs)
            src = src_match.group(1) if src_match else 'unknown'
            missing.append((tag, src))
    return missing


def apply_patch(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    def repl(match):
        tag = match.group(0)
        attrs = match.group(1)
        if ALT_RE.search(attrs):
            return tag
        # add empty alt (developer should replace with meaningful text)
        new_tag = tag.replace('<img ', '<img alt="" ', 1)
        return new_tag

    new_content = IMG_RE.sub(repl, content)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true', help='Add placeholder alt attributes to missing images')
    parser.add_argument('--paths', nargs='*', default=['.'], help='Paths to scan')
    args = parser.parse_args()

    total_missing = 0
    for base in args.paths:
        for root, dirs, files in os.walk(base):
            for file in files:
                if file.lower().endswith('.html'):
                    path = os.path.join(root, file)
                    missing = scan_file(path)
                    if missing:
                        print(f'File: {path}')
                        for tag, src in missing:
                            print(f'  Missing alt -> {src}    {tag[:80]}')
                        total_missing += len(missing)
                        if args.apply:
                            apply_patch(path)
                            print('  --> applied placeholder alts')

    print(f'Completed. Total missing alts found: {total_missing}')

if __name__ == '__main__':
    main()

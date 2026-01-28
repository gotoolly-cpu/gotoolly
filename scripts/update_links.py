#!/usr/bin/env python3
"""
update_links.py

Usage:
  - Dry run (default): show replacements without changing files
  - --apply : apply changes in-place (backups made as .bak)
  - --sitemap PATH : write sitemap.xml (defaults to ./sitemap.xml)

What it does:
  - Finds HTML files across the project (excluding assets folder)
  - Rewrites internal links that point to /pages/...*.html or relative pages to clean URLs (root-relative, e.g. /contact)
  - Updates <link rel="canonical"> tags and sitemap entries
  - Optionally writes sitemap.xml with clean URLs

Notes:
  - Script is conservative and creates .bak files when applying
  - Run with --dry-run first to review changes
"""

import argparse
import pathlib
import re
import shutil
import sys
import time
from datetime import datetime
from xml.etree import ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXCLUDE_DIRS = {"assets", "node_modules", ".git"}

# Patterns to replace (use absolute clean links starting with /)
# 1) Href/src/action that explicitly point to /pages/... .html
P1 = re.compile(r"(?P<pre>(href|src|action)=[\"'])/?pages/(?P<path>[^\"'#?]+)\.html(?P<post>\b)")
# 2) Relative references like ../pages/... .html or pages/... .html
P2 = re.compile(r"(?P<pre>(href|src|action)=[\"'])((?:\.\./)*)pages/(?P<path>[^\"'#?]+)\.html(?P<post>\b)")
# 3) Canonical link tag
P_CANON = re.compile(r"(<link[^>]*rel=[\"']canonical[\"'][^>]*href=[\"'])(?P<href>[^\"']+)([\"'][^>]*>)", re.I)

# Skip patterns for sitemap / link updates: assets, external links (http://, https://, mailto:, tel:)
EXTERNAL = re.compile(r"^(https?:|mailto:|tel:|#)", re.I)


def find_html_files(root: pathlib.Path):
    for p in root.rglob('*.html'):
        # skip inside excluded directories
        if any(part in EXCLUDE_DIRS for part in p.parts):
            continue
        yield p


def make_clean_url(path_str: str) -> str:
    """Given a path like 'contact' or 'guides/seo', return '/contact' or '/guides/seo'"""
    # Remove leading/trailing slashes
    path = path_str.strip('/ ')
    return '/' + path


def replace_in_html(content: str, file_path: pathlib.Path, dry_run=True):
    changed = False
    new = content

    # Replace absolute /pages/foo.html -> /foo
    def p1_repl(m):
        pre = m.group('pre')
        path = m.group('path')
        newlink = make_clean_url(path)
        nonlocal changed
        changed = True
        return f"{pre}{newlink}"

    new, n1 = P1.subn(p1_repl, new)

    # Replace relative ../pages/foo.html and pages/foo.html -> /foo
    def p2_repl(m):
        pre = m.group('pre')
        path = m.group('path')
        newlink = make_clean_url(path)
        nonlocal changed
        changed = True
        return f"{pre}{newlink}"

    new, n2 = P2.subn(p2_repl, new)

    # Update canonical href if pointing to pages/*.html or any *.html to clean url
    def canon_repl(m):
        prefix = m.group(1)
        href = m.group('href')
        suffix = m.group(3)
        # ignore external
        if EXTERNAL.match(href):
            return m.group(0)
        # if includes /pages/ or endswith .html: convert
        if '/pages/' in href or href.endswith('.html'):
            # remove domain if present
            href_path = re.sub(r'^https?://[^/]+', '', href)
            href_path = re.sub(r'^/pages/', '/', href_path)
            href_path = href_path.rstrip('/')
            if href_path.endswith('.html'):
                href_path = href_path[:-5]
            # ensure leading slash
            if not href_path.startswith('/'):
                href_path = '/' + href_path
            return f"{prefix}{href_path}{suffix}"
        return m.group(0)

    new, n3 = P_CANON.subn(canon_repl, new)

    if dry_run:
        return new, (n1 + n2 + n3) > 0, (n1, n2, n3)
    else:
        return new, (n1 + n2 + n3) > 0, (n1, n2, n3)


def generate_sitemap(out_path: pathlib.Path, root: pathlib.Path):
    """Generate sitemap.xml containing clean URLs for pages, guides, tools, and root pages"""
    urlset = ET.Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    domain = 'https://gotoolly.com'

    for f in find_html_files(root):
        # Build path relative to site root
        rel = f.relative_to(root)
        # Skip files that shouldn't be indexed
        if rel.parts[0] in EXCLUDE_DIRS:
            continue
        # If file is pages/..., map to clean path without extension and without /pages
        if rel.parts[0] == 'pages':
            clean_rel = pathlib.Path(*rel.parts[1:]).with_suffix('')
            url_path = '/' + str(clean_rel).replace('\\', '/')
        else:
            # other files: /tools/foo.html -> /tools/foo
            url_path = '/' + str(rel.with_suffix('')).replace('\\', '/')

        # exclude index pages pointing to root - keep /tools/index.html as /tools
        # normalize index -> directory
        if url_path.endswith('/index'):
            url_path = url_path[:-6] or '/'

        url = ET.SubElement(urlset, 'url')
        ET.SubElement(url, 'loc').text = domain.rstrip('/') + url_path
        ET.SubElement(url, 'lastmod').text = datetime.utcfromtimestamp(f.stat().st_mtime).strftime('%Y-%m-%dT%H:%M:%SZ')
        ET.SubElement(url, 'changefreq').text = 'weekly'
        ET.SubElement(url, 'priority').text = '0.6'

    tree = ET.ElementTree(urlset)
    tree.write(out_path, encoding='utf-8', xml_declaration=True)
    return out_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true', help='Apply changes. Without this the script does a dry-run')
    parser.add_argument('--sitemap', default='sitemap.xml', help='Write sitemap file after changes')
    parser.add_argument('--root', default='.', help='Project root (default .)')
    args = parser.parse_args()

    project_root = pathlib.Path(args.root).resolve()
    files = list(find_html_files(project_root))

    print(f"Found {len(files)} HTML files to scan (excluding assets & common ignores)")

    total_changes = 0
    for f in files:
        text = f.read_text(encoding='utf-8')
        new_text, changed, counts = replace_in_html(text, f, dry_run=not args.apply)
        if changed:
            total_changes += 1
            print(f"[CHANGES] {f} - matches: {counts}")
            if args.apply:
                bak = f.with_suffix(f.suffix + '.bak')
                shutil.copy2(f, bak)
                f.write_text(new_text, encoding='utf-8')
                print(f"    applied (backup -> {bak.name})")

    print(f"Scanned: {len(files)} files, files with changes: {total_changes}")

    sitemap_path = project_root / args.sitemap
    print(f"Generating sitemap to {sitemap_path} ...")
    generate_sitemap(sitemap_path, project_root)
    print("Sitemap generation complete.")

    if total_changes == 0 and not args.apply:
        print("No changes detected in dry-run. Use --apply to make replacements.")


if __name__ == '__main__':
    main()

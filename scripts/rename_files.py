#!/usr/bin/env python3
"""Safe rename script: normalize filenames and directory names by removing spaces,
converting to lowercase, and stripping non-alphanumeric characters (except - and .).

Usage:
  python scripts/rename_files.py --apply    # actually perform renames
  python scripts/rename_files.py           # dry-run (shows what would be renamed)

CAUTION: Always run with no --apply first to inspect the proposed changes.
"""

import argparse
import os
import re
import sys

RE_FILENAME = re.compile(r'[^a-z0-9\-\.]')
RE_DIRNAME = re.compile(r'[^a-z0-9\-]')


def normalize_filename(filename: str) -> str:
    name = filename.lower().replace(' ', '-')
    name = RE_FILENAME.sub('', name)
    return name


def normalize_dirname(dirname: str) -> str:
    name = dirname.lower().replace(' ', '-')
    name = RE_DIRNAME.sub('', name)
    return name


def plan_renames(root_dir: str):
    file_ops = []  # (old_path, new_path)
    dir_ops = []

    for root, dirs, files in os.walk(root_dir):
        # plan file renames
        for filename in files:
            new_name = normalize_filename(filename)
            if new_name and new_name != filename:
                old_path = os.path.join(root, filename)
                new_path = os.path.join(root, new_name)
                file_ops.append((old_path, new_path))

        # plan dir renames (defer actual directory renames)
        for dirname in dirs:
            new_dir = normalize_dirname(dirname)
            if new_dir and new_dir != dirname:
                old_path = os.path.join(root, dirname)
                new_path = os.path.join(root, new_dir)
                dir_ops.append((old_path, new_path))

    return file_ops, dir_ops


def apply_ops(ops, dry_run=True):
    for old_path, new_path in ops:
        if os.path.exists(new_path):
            print(f"SKIP (target exists): {old_path} -> {new_path}")
            continue
        print(f"Renaming: {old_path} -> {new_path}")
        if not dry_run:
            os.rename(old_path, new_path)


def main():
    parser = argparse.ArgumentParser(description='Normalize filenames and directory names')
    parser.add_argument('paths', nargs='*', default=['./tools', './pages'], help='Paths to process')
    parser.add_argument('--apply', action='store_true', help='Apply renames (default is dry-run)')
    args = parser.parse_args()

    all_file_ops = []
    all_dir_ops = []

    for path in args.paths:
        if not os.path.exists(path):
            print(f"Warning: path does not exist: {path}")
            continue
        file_ops, dir_ops = plan_renames(path)
        all_file_ops.extend(file_ops)
        all_dir_ops.extend(dir_ops)

    if not all_file_ops and not all_dir_ops:
        print("No renames planned.")
        return

    print("Planned file renames:")
    for old, new in all_file_ops:
        print(f"  {old} -> {new}")

    print("Planned directory renames (deferred):")
    for old, new in all_dir_ops:
        print(f"  {old} -> {new}")

    if not args.apply:
        print('\nDry-run complete. Re-run with --apply to perform the renames.')
        return

    # Apply file renames first
    apply_ops(all_file_ops, dry_run=not args.apply)

    # To avoid messing with running os.walk order, apply directory renames from deepest path first
    all_dir_ops_sorted = sorted(all_dir_ops, key=lambda x: x[0].count(os.sep), reverse=True)
    apply_ops(all_dir_ops_sorted, dry_run=not args.apply)

    print('All renames attempted.')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3

from pathlib import Path

ROOT = Path("/home/vineet_kushwaha1/security-awareness-platform/frontend/VShield")

RENAMES = {
    "ApprovalQueueImage.png": "dashboard-overview-sidebar.png",
    "cretificate_icon.png": "dashboard-user-progress.png",
    "main_left_button.png": "",
    "main_left_top.png": "",
    "main_right_bottom.png": "",
    "main_right_top.png": "",
    "MyApprovedCampaignsImage.png": "",
    "RejectedCampaignsImage.png": "",
    "side_1_1.png": "",
    "side_1_2.png": "",
    "side_1_3.png": "",
    "side_1_4.png": "",
    "side_3_1.png": "",
    "solo_quiz.png": "",
    "solo_vids.png": "",
}

TEXT_EXTENSIONS = {
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".css",
}

#
# Rename files
#
for old_name, new_name in RENAMES.items():
    matches = list(ROOT.rglob(old_name))

    if not matches:
        print(f"[NOT FOUND] {old_name}")
        continue

    for old_path in matches:
        new_path = old_path.with_name(new_name)

        print(f"[RENAME FILE]")
        print(f"  {old_path}")
        print(f"  -> {new_path}")

        old_path.rename(new_path)

#
# Replace references
#
for file_path in ROOT.rglob("*"):
    if not file_path.is_file():
        continue

    if file_path.suffix.lower() not in TEXT_EXTENSIONS:
        continue

    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception:
        continue

    original = content

    for old_name, new_name in RENAMES.items():
        content = content.replace(old_name, new_name)

    if content != original:
        file_path.write_text(content, encoding="utf-8")
        print(f"[UPDATED] {file_path}")

print("Done")

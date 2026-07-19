#!/usr/bin/env python3
"""
generate_sitemap.py
--------------------
정적 페이지 + Google Sheets에 등록된 게시글(content.html?id=N) URL을 합쳐
sitemap.xml을 재생성합니다.

사용법:
    python3 scripts/generate_sitemap.py

전제 조건:
    - assets/site.js 안의 SHEET_ID 값이 실제로 "웹에 게시"된 구글 시트를 가리켜야 합니다.
    - 시트 컬럼 순서: id, category, emoji, title, summary, tags, date, content, views

이 스크립트는 외부 라이브러리 없이(표준 라이브러리만 사용) 동작하므로
GitHub Actions의 기본 ubuntu-latest 러너에서 별도 설치 없이 실행됩니다.
"""
import json
import re
import sys
from datetime import date, datetime
from urllib.request import urlopen
from urllib.error import URLError
from urllib.parse import quote

SITE_URL = "https://paycal.kr"
SHEET_ID = "1jMKkYQcUZP8DPeMv1dZbM8PIe3HxoInTvmiD3lEVsj4"
SHEET_NAME = "시트1"

STATIC_PAGES = [
    ("/", "weekly", "1.0"),
    ("/salary.html", "monthly", "0.9"),
    ("/retirement.html", "monthly", "0.9"),
    ("/annual-leave.html", "monthly", "0.9"),
    ("/year-end-tax.html", "monthly", "0.9"),
    ("/unemployment.html", "monthly", "0.9"),
    ("/minimum-wage.html", "monthly", "0.9"),
]
# noindex 페이지(contact/privacy/terms)는 의도적으로 포함하지 않습니다.


def fetch_posts():
    """gviz 엔드포인트에서 게시글 목록을 가져옵니다. 실패하면 빈 리스트를 반환합니다."""
    url = (
        f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq"
        f"?tqx=out:json&headers=1&sheet={quote(SHEET_NAME)}"
    )
    try:
        with urlopen(url, timeout=15) as resp:
            text = resp.read().decode("utf-8")
    except (URLError, OSError, ValueError) as e:
        print(f"[경고] 시트를 불러오지 못했습니다 ({e}). 게시글 URL 없이 진행합니다.", file=sys.stderr)
        return []

    start, end = text.find("("), text.rfind(")")
    if start == -1 or end == -1:
        print("[경고] gviz 응답 형식을 해석할 수 없습니다.", file=sys.stderr)
        return []

    try:
        data = json.loads(text[start + 1:end])
    except json.JSONDecodeError:
        print("[경고] gviz JSON 파싱 실패.", file=sys.stderr)
        return []

    rows = data.get("table", {}).get("rows", [])
    posts = []
    for row in rows:
        cells = row.get("c") or []
        if not cells or cells[0] is None or cells[0].get("v") is None:
            continue
        post_id = cells[0]["v"]
        date_val = None
        if len(cells) > 6 and cells[6] and cells[6].get("v") is not None:
            raw = cells[6]["v"]
            m = re.match(r"Date\((\d+),(\d+),(\d+)\)", str(raw))
            if m:
                y, mo, d = int(m.group(1)), int(m.group(2)) + 1, int(m.group(3))
                date_val = f"{y:04d}-{mo:02d}-{d:02d}"
        posts.append((post_id, date_val))
    return posts


def build_sitemap(posts):
    today = date.today().isoformat()
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<!--",
        "  이 파일은 scripts/generate_sitemap.py 로 자동 생성되었습니다. 직접 수정하지 마세요.",
        "  contact.html / privacy.html / terms.html 은 noindex 페이지이므로 의도적으로 제외했습니다.",
        "-->",
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for path, freq, priority in STATIC_PAGES:
        lines += [
            "  <url>",
            f"    <loc>{SITE_URL}{path}</loc>",
            f"    <lastmod>{today}</lastmod>",
            f"    <changefreq>{freq}</changefreq>",
            f"    <priority>{priority}</priority>",
            "  </url>",
        ]
    for post_id, post_date in posts:
        lines += [
            "  <url>",
            f"    <loc>{SITE_URL}/content.html?id={post_id}</loc>",
            f"    <lastmod>{post_date or today}</lastmod>",
            "    <changefreq>yearly</changefreq>",
            "    <priority>0.6</priority>",
            "  </url>",
        ]
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main():
    posts = fetch_posts()
    xml = build_sitemap(posts)
    with open("sitemap.xml", "w", encoding="utf-8") as f:
        f.write(xml)
    print(f"sitemap.xml 생성 완료 · 정적 페이지 {len(STATIC_PAGES)}개 + 게시글 {len(posts)}개")


if __name__ == "__main__":
    main()

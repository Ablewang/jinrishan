#!/usr/bin/env python3
"""批量生成拼豆指导图和材料清单"""

import re
import os
import json
import argparse
import colorsys
from PIL import Image, ImageDraw, ImageFont
from collections import Counter

FONT_PATH = '/System/Library/Fonts/STHeiti Medium.ttc'
BASE = '/Users/wangyong/yong/assistant-web/apps/minecraft'
TS_PATH = f'{BASE}/utils/color.ts'
GALLERY_DIR = f'{BASE}/gallery'
OUTPUT_DIR = f'{BASE}/output'

# 手机宽度基准（3x 高清，实际显示 390px）
PHONE_W = 390 * 3

# ── 颜色解析 ─────────────────────────────────────────────────────
def parse_colors(ts_path):
    with open(ts_path, 'r') as f:
        content = f.read()
    pattern = re.compile(
        r"id:\s*'([^']+)'.*?code:\s*'([^']+)'.*?name:\s*'([^']+)'.*?rgb:\s*\[(\d+),\s*(\d+),\s*(\d+)\]",
        re.DOTALL
    )
    seen = {}
    colors = []
    for m in pattern.finditer(content):
        code = m.group(2)
        if code in seen:
            continue
        seen[code] = True
        colors.append({
            'code': code,
            'name': m.group(3),
            'rgb': (int(m.group(4)), int(m.group(5)), int(m.group(6))),
        })
    return colors

# ── LAB 色彩空间 ─────────────────────────────────────────────────
def rgb_to_lab(rgb):
    r, g, b = [x / 255.0 for x in rgb]
    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = lin(r), lin(g), lin(b)
    X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    X, Y, Z = X / 0.95047, Y / 1.00000, Z / 1.08883
    def f(t):
        return t ** (1/3) if t > 0.008856 else 7.787 * t + 16/116
    fx, fy, fz = f(X), f(Y), f(Z)
    return (116*fy - 16, 500*(fx - fy), 200*(fy - fz))

def lab_dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5

def hsv_dist(rgb1, rgb2):
    h1, s1, v1 = colorsys.rgb_to_hsv(rgb1[0]/255, rgb1[1]/255, rgb1[2]/255)
    h2, s2, v2 = colorsys.rgb_to_hsv(rgb2[0]/255, rgb2[1]/255, rgb2[2]/255)
    dh = min(abs(h1-h2), 1-abs(h1-h2))
    s_weight = (s1 + s2) / 2
    return (dh * 2 * s_weight)**2 + (abs(s1-s2) * 0.5)**2 + (abs(v1-v2) * 1.5)**2

def find_nearest(rgb, palette):
    h, s, v = colorsys.rgb_to_hsv(rgb[0]/255, rgb[1]/255, rgb[2]/255)
    lab = rgb_to_lab(rgb)
    def score(p):
        c, c_lab = p
        l = lab_dist(lab, c_lab)
        hv = hsv_dist(rgb, c['rgb']) * 30
        return l * (1 - s * 0.6) + hv * (s * 0.6)
    return min(palette, key=score)[0]

def build_palette(colors):
    return [(c, rgb_to_lab(c['rgb'])) for c in colors]

# ── 图片 → NxN 格子 ─────────────────────────────────────────────
def image_to_grid(img, palette, grid_size=16, quantize_colors=8):
    img = img.convert('RGBA')
    img_small = img.resize((grid_size, grid_size), Image.NEAREST)
    pixels = img_small.load()
    grid = []
    for row in range(grid_size):
        grid_row = []
        for col in range(grid_size):
            pr, pg, pb, pa = pixels[col, row]
            if pa < 128:
                grid_row.append(None)
            else:
                matched = find_nearest((pr, pg, pb), palette)
                grid_row.append(matched['code'])
        grid.append(grid_row)
    return grid

# ── 生成 pindou 指导图 ───────────────────────────────────────────
def render_pindou(grid, colors_by_code, board_size=20):
    grid_size = len(grid)
    offset = (board_size - grid_size) // 2

    # 基于手机宽度 PHONE_W 计算尺寸
    margin = round(PHONE_W * 0.06)        # ~70px @3x
    cell_px = (PHONE_W - 2 * margin) // board_size
    title_h = round(PHONE_W * 0.08)

    grid_w = board_size * cell_px
    img_w = grid_w + 2 * margin
    img_h = title_h + grid_w + 2 * margin

    img = Image.new('RGB', (img_w, img_h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    fs_title = max(12, round(PHONE_W * 0.038))
    fs_code  = max(7,  round(cell_px * 0.38))
    fs_num   = max(8,  round(PHONE_W * 0.028))
    try:
        font_title = ImageFont.truetype(FONT_PATH, fs_title)
        font_code  = ImageFont.truetype(FONT_PATH, fs_code)
        font_num   = ImageFont.truetype(FONT_PATH, fs_num)
    except:
        font_title = font_code = font_num = ImageFont.load_default()

    draw.text((margin, round(title_h * 0.25)),
              f'拼豆图纸预览  ({board_size} x {board_size})',
              fill=(40, 40, 40), font=font_title)

    gx0 = margin
    gy0 = title_h + margin

    # 填格子
    for row in range(board_size):
        for col in range(board_size):
            x0 = gx0 + col * cell_px
            y0 = gy0 + row * cell_px
            x1 = x0 + cell_px
            y1 = y0 + cell_px
            gr = row - offset
            gc = col - offset
            in_grid = 0 <= gr < grid_size and 0 <= gc < grid_size
            code = grid[gr][gc] if in_grid else None

            if not in_grid:
                draw.rectangle([x0, y0, x1, y1], fill=(242, 238, 228))
            elif code is None:
                draw.rectangle([x0, y0, x1, y1], fill=(248, 248, 248))
                draw.line([x0, y0, x1, y1], fill=(210, 210, 210), width=1)
                draw.line([x1, y0, x0, y1], fill=(210, 210, 210), width=1)
            else:
                info = colors_by_code.get(code)
                fill = tuple(info['rgb']) if info else (200, 200, 200)
                draw.rectangle([x0, y0, x1, y1], fill=fill)
                r2, g2, b2 = fill
                lum = 0.299 * r2 + 0.587 * g2 + 0.114 * b2
                tc = (0, 0, 0) if lum > 128 else (255, 255, 255)
                bbox = draw.textbbox((0, 0), code, font=font_code)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                draw.text((x0 + (cell_px - tw) // 2, y0 + (cell_px - th) // 2),
                          code, fill=tc, font=font_code)

    # 网格线（后画）
    gx1 = gx0 + grid_w
    gy1 = gy0 + grid_w
    for i in range(board_size + 1):
        x = gx0 + i * cell_px
        y = gy0 + i * cell_px
        thick = 2 if i % 5 == 0 else 1
        color = (80, 80, 80) if i % 5 == 0 else (190, 190, 190)
        draw.line([x, gy0, x, gy1], fill=color, width=thick)
        draw.line([gx0, y, gx1, y], fill=color, width=thick)

    # 外边框
    draw.rectangle([gx0, gy0, gx1, gy1], outline=(60, 60, 60), width=2)

    # 四周编号
    for i in range(board_size):
        cx = gx0 + i * cell_px + cell_px // 2
        cy = gy0 + i * cell_px + cell_px // 2
        label = str(i + 1)
        bbox = draw.textbbox((0, 0), label, font=font_num)
        lw = bbox[2] - bbox[0]
        lh = bbox[3] - bbox[1]
        draw.text((cx - lw // 2, gy0 - lh - 4), label, fill=(80, 80, 80), font=font_num)
        draw.text((cx - lw // 2, gy1 + 4),       label, fill=(80, 80, 80), font=font_num)
        draw.text((gx0 - lw - 4, cy - lh // 2),  label, fill=(80, 80, 80), font=font_num)
        draw.text((gx1 + 4,      cy - lh // 2),  label, fill=(80, 80, 80), font=font_num)

    return img

# ── 生成材料清单图 ───────────────────────────────────────────────
def render_checklist(grid, colors_by_code, img_w=None):
    if img_w is None:
        img_w = PHONE_W

    counts = Counter(code for row in grid for code in row if code)
    total_beads = sum(counts.values())
    items = sorted(counts.items(), key=lambda x: -x[1])

    pad       = round(img_w * 0.036)
    swatch_sz = round(img_w * 0.052)
    row_h     = round(img_w * 0.082)
    hdr_h     = round(img_w * 0.1)
    col_hdr_h = round(img_w * 0.065)
    img_h = hdr_h + col_hdr_h + len(items) * row_h + pad

    img = Image.new('RGB', (img_w, img_h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    fs_title = round(img_w * 0.038)
    fs_body  = round(img_w * 0.032)
    try:
        font_title = ImageFont.truetype(FONT_PATH, fs_title)
        font_head  = ImageFont.truetype(FONT_PATH, fs_body)
        font_body  = ImageFont.truetype(FONT_PATH, fs_body)
    except:
        font_title = font_head = font_body = ImageFont.load_default()

    draw.text((pad, round(hdr_h * 0.28)),
              f'材料清单  ({len(items)} 种颜色，{total_beads} 颗)',
              fill=(40, 40, 40), font=font_title)

    y = hdr_h
    draw.rectangle([0, y, img_w, y + col_hdr_h], fill=(245, 245, 245))

    # 列位置按比例
    c_swatch = pad
    c_code   = round(img_w * 0.12)
    c_name   = round(img_w * 0.26)
    c_count  = round(img_w * 0.70)
    c_pct    = round(img_w * 0.84)

    for label, x in [('色块', c_swatch), ('色号', c_code), ('名称', c_name),
                     ('数量', c_count), ('占比', c_pct)]:
        draw.text((x, y + round(col_hdr_h * 0.22)), label, fill=(120, 120, 120), font=font_head)
    draw.line([0, y + col_hdr_h, img_w, y + col_hdr_h], fill=(210, 210, 210))
    y += col_hdr_h

    for i, (code, count) in enumerate(items):
        bg = (250, 250, 250) if i % 2 == 0 else (255, 255, 255)
        draw.rectangle([0, y, img_w, y + row_h], fill=bg)
        info = colors_by_code.get(code)
        fill = tuple(info['rgb']) if info else (200, 200, 200)
        name = info['name'] if info else ''
        cy = y + (row_h - swatch_sz) // 2
        draw.rounded_rectangle([c_swatch, cy, c_swatch + swatch_sz, cy + swatch_sz],
                                radius=4, fill=fill, outline=(180, 180, 180))
        ty = y + (row_h - fs_body) // 2 - 2
        draw.text((c_code,  ty), code,  fill=(30, 30, 30),   font=font_body)
        draw.text((c_name,  ty), name,  fill=(60, 60, 60),   font=font_body)
        draw.text((c_count, ty), str(count), fill=(30, 30, 30), font=font_body)
        draw.text((c_pct,   ty), f'{count / total_beads * 100:.1f}%',
                  fill=(120, 120, 120), font=font_body)
        draw.line([0, y + row_h, img_w, y + row_h], fill=(235, 235, 235))
        y += row_h

    return img

# ── 处理单张图片 ─────────────────────────────────────────────────
def process_image(img_path, palette, colors_by_code, out_dir, grid_size=16, cell_px=None, quantize=8):
    name = os.path.splitext(os.path.basename(img_path))[0]
    img = Image.open(img_path)
    grid = image_to_grid(img, palette, grid_size=grid_size, quantize_colors=quantize)

    pindou_img    = render_pindou(grid, colors_by_code, board_size=20)
    checklist_img = render_checklist(grid, colors_by_code, img_w=pindou_img.width)

    gap     = round(pindou_img.width * 0.02)
    total_h = pindou_img.height + gap + checklist_img.height
    combined = Image.new('RGB', (pindou_img.width, total_h), (255, 255, 255))
    combined.paste(pindou_img, (0, 0))
    combined.paste(checklist_img, (0, pindou_img.height + gap))
    combined.save(os.path.join(out_dir, f'{name}.png'))

    # JSON 输出
    counts = Counter(code for row in grid for code in row if code)
    total_beads = sum(counts.values())
    materials = []
    for code, count in sorted(counts.items(), key=lambda x: -x[1]):
        info = colors_by_code.get(code, {})
        materials.append({
            'code': code,
            'name': info.get('name', ''),
            'rgb': list(info['rgb']) if info else [200, 200, 200],
            'count': count,
            'pct': round(count / total_beads * 100, 1),
        })
    data = {
        'name': name,
        'grid_size': grid_size,
        'board_size': 20,
        'total_beads': total_beads,
        'color_count': len(counts),
        'grid': grid,
        'materials': materials,
    }
    with open(os.path.join(out_dir, f'{name}.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'  done: {name}')

# ── main ─────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--category', help='只处理某个分类')
    parser.add_argument('--file',     help='只处理单张图片路径')
    parser.add_argument('--grid',     type=int, default=16, help='格子数 (默认16)')
    parser.add_argument('--quantize', type=int, default=8,  help='预量化色数 (默认8)')
    args = parser.parse_args()

    print('parsing colors...')
    colors = parse_colors(TS_PATH)
    print(f'  {len(colors)} unique color codes')
    palette = build_palette(colors)
    colors_by_code = {c['code']: c for c in colors}

    if args.file:
        out_dir = os.path.join(OUTPUT_DIR, 'single')
        os.makedirs(out_dir, exist_ok=True)
        process_image(args.file, palette, colors_by_code, out_dir,
                      args.grid, quantize=args.quantize)
    else:
        cats = [args.category] if args.category else [
            d for d in os.listdir(GALLERY_DIR) if os.path.isdir(os.path.join(GALLERY_DIR, d))
        ]
        for cat in sorted(cats):
            cat_dir = os.path.join(GALLERY_DIR, cat)
            if not os.path.isdir(cat_dir):
                print(f'category not found: {cat}')
                continue
            out_dir = os.path.join(OUTPUT_DIR, cat)
            os.makedirs(out_dir, exist_ok=True)
            files = sorted(f for f in os.listdir(cat_dir) if f.endswith('.png'))
            print(f'\n[{cat}] {len(files)} images')
            for f in files:
                process_image(os.path.join(cat_dir, f), palette, colors_by_code, out_dir,
                              args.grid, quantize=args.quantize)

    print('\nall done!')

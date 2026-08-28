#!/usr/bin/env python3
"""测试单张图片的拼豆转换效果"""

import re
import os
from PIL import Image, ImageDraw, ImageFont
from collections import Counter

# ── 1. 解析 color.ts ──────────────────────────────────────────────
def parse_colors(ts_path):
    with open(ts_path, 'r') as f:
        content = f.read()

    # 提取每个颜色块: id, code, name, rgb
    pattern = re.compile(
        r"id:\s*['\`]([^'\`]+)['\`].*?"
        r"code:\s*['\`]([^'\`]+)['\`].*?"
        r"name:\s*['\`]([^'\`]+)['\`].*?"
        r'rgb:\s*\[(\d+),\s*(\d+),\s*(\d+)\]',
        re.DOTALL
    )

    seen_codes = {}
    colors = []
    for m in pattern.finditer(content):
        code = m.group(2)
        if code in seen_codes:
            continue
        seen_codes[code] = True
        colors.append({
            'id': m.group(1),
            'code': code,
            'name': m.group(3),
            'rgb': (int(m.group(4)), int(m.group(5)), int(m.group(6))),
        })
    return colors

# ── 2. LAB 色彩空间最近邻匹配 ────────────────────────────────────
def rgb_to_lab(rgb):
    r, g, b = [x / 255.0 for x in rgb]
    # sRGB → linear
    def linearize(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = linearize(r), linearize(g), linearize(b)
    # linear RGB → XYZ (D65)
    X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    # XYZ → Lab
    X, Y, Z = X / 0.95047, Y / 1.00000, Z / 1.08883
    def f(t):
        return t ** (1/3) if t > 0.008856 else 7.787 * t + 16/116
    fx, fy, fz = f(X), f(Y), f(Z)
    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b2 = 200 * (fy - fz)
    return (L, a, b2)

def lab_distance(lab1, lab2):
    return sum((a - b) ** 2 for a, b in zip(lab1, lab2)) ** 0.5

def build_palette(colors):
    return [(c, rgb_to_lab(c['rgb'])) for c in colors]

def find_nearest(rgb, palette):
    lab = rgb_to_lab(rgb)
    best = min(palette, key=lambda x: lab_distance(lab, x[1]))
    return best[0]

# ── 3. 区域投票：128x128 → 20x20 ────────────────────────────────
def image_to_grid(img, palette, grid_size=20, quantize_colors=8):
    img = img.convert('RGBA')
    r, g, b, a = img.split()
    rgb_img = Image.merge('RGB', (r, g, b))
    # 先量化减少颜色数，消除边缘过渡噪点
    quantized = rgb_img.quantize(colors=quantize_colors, method=Image.Quantize.MEDIANCUT).convert('RGB')
    img = Image.merge('RGBA', (*quantized.split(), a))
    w, h = img.size  # 128, 128
    pixels = img.load()

    cell_w = w / grid_size
    cell_h = h / grid_size

    grid = []
    for row in range(grid_size):
        grid_row = []
        for col in range(grid_size):
            # 这个格子覆盖的像素范围
            x0 = int(col * cell_w)
            x1 = int((col + 1) * cell_w)
            y0 = int(row * cell_h)
            y1 = int((row + 1) * cell_h)

            votes = []
            for y in range(y0, y1):
                for x in range(x0, x1):
                    r, g, b, a = pixels[x, y]
                    if a < 128:
                        continue
                    matched = find_nearest((r, g, b), palette)
                    votes.append(matched['code'])

            if not votes:
                grid_row.append(None)
            else:
                # 多数投票
                winner_code = Counter(votes).most_common(1)[0][0]
                grid_row.append(winner_code)
        grid.append(grid_row)
    return grid

# ── 4. 生成 pindou 指导图 ────────────────────────────────────────
def render_pindou(grid, colors_by_code, out_path, cell_px=60, grid_size=20):
    margin = 40
    total = grid_size * cell_px + 2 * margin
    img = Image.new('RGB', (total, total), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # 字体（系统自带）
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 11)
        font_small = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 9)
    except:
        font = ImageFont.load_default()
        font_small = font

    # 画格子
    for row in range(grid_size):
        for col in range(grid_size):
            code = grid[row][col]
            x0 = margin + col * cell_px
            y0 = margin + row * cell_px
            x1 = x0 + cell_px
            y1 = y0 + cell_px

            if code is None:
                # 透明格：浅灰打叉
                draw.rectangle([x0, y0, x1, y1], fill=(245, 245, 245))
                draw.line([x0, y0, x1, y1], fill=(220, 220, 220), width=1)
                draw.line([x1, y0, x0, y1], fill=(220, 220, 220), width=1)
            else:
                color_info = colors_by_code.get(code)
                fill = tuple(color_info['rgb']) if color_info else (200, 200, 200)
                draw.rectangle([x0, y0, x1, y1], fill=fill)

                # 文字颜色根据亮度自动选黑/白
                r, g, b = fill
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                text_color = (0, 0, 0) if lum > 128 else (255, 255, 255)

                # 色号居中
                bbox = draw.textbbox((0, 0), code, font=font)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                tx = x0 + (cell_px - tw) // 2
                ty = y0 + (cell_px - th) // 2
                draw.text((tx, ty), code, fill=text_color, font=font)

    # 网格线
    for i in range(grid_size + 1):
        x = margin + i * cell_px
        y = margin + i * cell_px
        thick = 2 if i % 5 == 0 else 1
        color = (100, 100, 100) if i % 5 == 0 else (180, 180, 180)
        draw.line([x, margin, x, margin + grid_size * cell_px], fill=color, width=thick)
        draw.line([margin, y, margin + grid_size * cell_px, y], fill=color, width=thick)

    # 行列标号
    for i in range(grid_size):
        x = margin + i * cell_px + cell_px // 2
        y = margin + i * cell_px + cell_px // 2
        draw.text((x - 4, margin - 20), str(i + 1), fill=(80, 80, 80), font=font_small)
        draw.text((margin - 25, y - 6), str(i + 1), fill=(80, 80, 80), font=font_small)

    img.save(out_path)
    print(f'saved: {out_path}')

# ── 5. 生成清单图 ────────────────────────────────────────────────
def render_checklist(grid, colors_by_code, out_path):
    counts = Counter()
    for row in grid:
        for code in row:
            if code:
                counts[code] += 1

    total_beads = sum(counts.values())
    sorted_items = sorted(counts.items(), key=lambda x: -x[1])

    row_h = 44
    header_h = 60
    padding = 20
    img_w = 800
    img_h = header_h + len(sorted_items) * row_h + padding * 2

    img = Image.new('RGB', (img_w, img_h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    try:
        font_title = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 18)
        font_body = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 14)
    except:
        font_title = ImageFont.load_default()
        font_body = font_title

    # 标题
    title = f'材料清单（{len(sorted_items)} 种颜色，{total_beads} 颗）'
    draw.text((padding, padding), title, fill=(30, 30, 30), font=font_title)

    # 表头
    y = header_h
    draw.rectangle([0, y, img_w, y + 1], fill=(200, 200, 200))
    headers = [('色块', 60), ('色号', 160), ('名称', 340), ('数量', 560), ('占比', 680)]
    for label, x in headers:
        draw.text((x, y + 8), label, fill=(100, 100, 100), font=font_body)
    y += row_h

    for i, (code, count) in enumerate(sorted_items):
        bg = (248, 248, 248) if i % 2 == 0 else (255, 255, 255)
        draw.rectangle([0, y, img_w, y + row_h], fill=bg)

        color_info = colors_by_code.get(code)
        if color_info:
            fill = tuple(color_info['rgb'])
            name = color_info['name']
        else:
            fill = (200, 200, 200)
            name = ''

        # 色块
        draw.rounded_rectangle([60, y + 8, 92, y + row_h - 8], radius=4, fill=fill,
                                 outline=(180, 180, 180))
        # 色号
        draw.text((120, y + 12), code, fill=(30, 30, 30), font=font_body)
        # 名称
        draw.text((200, y + 12), name, fill=(60, 60, 60), font=font_body)
        # 数量
        draw.text((520, y + 12), str(count), fill=(30, 30, 30), font=font_body)
        # 占比
        pct = f'{count / total_beads * 100:.1f}%'
        draw.text((650, y + 12), pct, fill=(120, 120, 120), font=font_body)

        draw.line([0, y + row_h, img_w, y + row_h], fill=(230, 230, 230))
        y += row_h

    img.save(out_path)
    print(f'saved: {out_path}')

# ── main ─────────────────────────────────────────────────────────
if __name__ == '__main__':
    BASE = '/Users/wangyong/yong/assistant-web/apps/minecraft'
    ts_path = f'{BASE}/utils/color.ts'
    img_path = f'{BASE}/gallery/Building Blocks/ancient_debris.png'
    out_dir = f'{BASE}/scripts/test_output'
    os.makedirs(out_dir, exist_ok=True)

    print('parsing colors...')
    colors = parse_colors(ts_path)
    print(f'  {len(colors)} unique color codes')

    palette = build_palette(colors)
    colors_by_code = {c['code']: c for c in colors}

    print('processing image...')
    img = Image.open(img_path)
    grid = image_to_grid(img, palette, grid_size=20)

    render_pindou(grid, colors_by_code, f'{out_dir}/ancient_debris_pindou.png')
    render_checklist(grid, colors_by_code, f'{out_dir}/ancient_debris_checklist.png')
    print('done!')

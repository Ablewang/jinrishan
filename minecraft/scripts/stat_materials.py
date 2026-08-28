#!/usr/bin/env python3
"""统计所有 json 中的 materials，输出汇总到 output/materials_stat.json"""

import json
import os
from collections import defaultdict

OUTPUT_DIR = '/Users/wangyong/yong/jinrishan/minecraft/output'

total = defaultdict(lambda: {'name': '', 'rgb': [], 'count': 0})

for root, dirs, files in os.walk(OUTPUT_DIR):
    for fname in files:
        if not fname.endswith('.json'):
            continue
        path = os.path.join(root, fname)
        with open(path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except Exception:
                continue
        for m in data.get('materials', []):
            code = m['code']
            total[code]['name'] = m['name']
            total[code]['rgb'] = m['rgb']
            total[code]['count'] += m['count']

items = sorted(total.items(), key=lambda x: -x[1]['count'])
result = {
    'color_count': len(items),
    'total_beads': sum(v['count'] for _, v in items),
    'materials': [
        {
            'code': code,
            'name': v['name'],
            'rgb': v['rgb'],
            'count': v['count'],
        }
        for code, v in items
    ],
}

out_path = os.path.join(OUTPUT_DIR, 'materials_stat.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f'共 {result["color_count"]} 种颜色，{result["total_beads"]} 颗拼豆')
print(f'输出: {out_path}')

#!/usr/bin/env python3
"""批量生成拼豆指导图和材料清单"""

import re
import os
import json
import argparse
import colorsys
from PIL import Image, ImageDraw, ImageFont
from collections import Counter

FONT_PATH = '/mnt/c/Windows/Fonts/msyh.ttc'
BASE = '/home/jeffrey/yong/jinrishan/minecraft'
TS_PATH = f'{BASE}/utils/color.ts'
GALLERY_DIR = f'{BASE}/gallery'
OUTPUT_DIR = f'{BASE}/output'

# 手机宽度基准（3x 高清，实际显示 390px）
PHONE_W = 390 * 3

# ── Minecraft 物品中文名称对照表 ──────────────────────────────────
ITEM_NAMES_ZH = {
    'acacia_boat': '金合欢木船', 'acacia_button': '金合欢木按钮',
    'acacia_chest_boat': '带箱金合欢木船', 'acacia_door': '金合欢木门',
    'acacia_fence': '金合欢木栅栏', 'acacia_fence_gate': '金合欢木栅栏门',
    'acacia_hanging_sign': '金合欢木悬挂告示牌', 'acacia_leaves': '金合欢树叶',
    'acacia_log': '金合欢原木', 'acacia_planks': '金合欢木板',
    'acacia_pressure_plate': '金合欢木压力板', 'acacia_sapling': '金合欢树苗',
    'acacia_shelf': '金合欢木书架', 'acacia_sign': '金合欢木告示牌',
    'acacia_slab': '金合欢木台阶', 'acacia_stairs': '金合欢木楼梯',
    'acacia_trapdoor': '金合欢木活板门', 'acacia_wood': '金合欢木头',
    'activator_rail': '激活铁轨', 'air': '空气',
    'allay_spawn_egg': '悦灵刷怪蛋', 'allium': '韭葱',
    'amethyst_block': '紫水晶块', 'amethyst_cluster': '紫水晶簇',
    'amethyst_shard': '紫水晶碎片', 'ancient_debris': '远古残骸',
    'andesite': '安山岩', 'andesite_slab': '安山岩台阶',
    'andesite_stairs': '安山岩楼梯', 'andesite_wall': '安山岩墙',
    'angler_pottery_sherd': '垂钓陶片', 'anvil': '铁砧',
    'apple': '苹果', 'archer_pottery_sherd': '弓箭手陶片',
    'armadillo_scute': '犰狳鳞甲', 'armadillo_spawn_egg': '犰狳刷怪蛋',
    'armor_stand': '盔甲架', 'arms_up_pottery_sherd': '举手陶片',
    'arrow': '箭', 'axolotl_bucket': '桶装美西螈',
    'axolotl_spawn_egg': '美西螈刷怪蛋', 'azalea': '杜鹃花丛',
    'azalea_leaves': '杜鹃花树叶', 'azure_bluet': '蓝色兰花',
    'baked_potato': '烤土豆', 'bamboo': '竹子',
    'bamboo_block': '竹块', 'bamboo_button': '竹按钮',
    'bamboo_chest_raft': '带箱竹筏', 'bamboo_door': '竹门',
    'bamboo_fence': '竹栅栏', 'bamboo_fence_gate': '竹栅栏门',
    'bamboo_hanging_sign': '竹悬挂告示牌', 'bamboo_mosaic': '竹马赛克',
    'bamboo_mosaic_slab': '竹马赛克台阶', 'bamboo_mosaic_stairs': '竹马赛克楼梯',
    'bamboo_planks': '竹板', 'bamboo_pressure_plate': '竹压力板',
    'bamboo_raft': '竹筏', 'bamboo_shelf': '竹书架',
    'bamboo_sign': '竹告示牌', 'bamboo_slab': '竹台阶',
    'bamboo_stairs': '竹楼梯', 'bamboo_trapdoor': '竹活板门',
    'barrel': '木桶', 'barrier': '屏障',
    'basalt': '玄武岩', 'bat_spawn_egg': '蝙蝠刷怪蛋',
    'beacon': '信标', 'bedrock': '基岩',
    'bee_nest': '蜂巢', 'bee_spawn_egg': '蜜蜂刷怪蛋',
    'beef': '生牛肉', 'beehive': '蜂箱',
    'beetroot': '甜菜根', 'beetroot_seeds': '甜菜种子',
    'beetroot_soup': '甜菜汤', 'bell': '钟',
    'big_dripleaf': '大型垂滴叶',
    'birch_boat': '白桦木船', 'birch_button': '白桦木按钮',
    'birch_chest_boat': '带箱白桦木船', 'birch_door': '白桦木门',
    'birch_fence': '白桦木栅栏', 'birch_fence_gate': '白桦木栅栏门',
    'birch_hanging_sign': '白桦木悬挂告示牌', 'birch_leaves': '白桦树叶',
    'birch_log': '白桦原木', 'birch_planks': '白桦木板',
    'birch_pressure_plate': '白桦木压力板', 'birch_sapling': '白桦树苗',
    'birch_shelf': '白桦木书架', 'birch_sign': '白桦木告示牌',
    'birch_slab': '白桦木台阶', 'birch_stairs': '白桦木楼梯',
    'birch_trapdoor': '白桦木活板门', 'birch_wood': '白桦木头',
    'black_banner': '黑色旗帜', 'black_bed': '黑色床',
    'black_bundle': '黑色收纳袋', 'black_candle': '黑色蜡烛',
    'black_carpet': '黑色地毯', 'black_concrete': '黑色混凝土',
    'black_concrete_powder': '黑色混凝土粉末', 'black_dye': '黑色染料',
    'black_glazed_terracotta': '黑色釉陶', 'black_harness': '黑色马铠',
    'black_shulker_box': '黑色潜影盒', 'black_stained_glass': '黑色染色玻璃',
    'black_stained_glass_pane': '黑色染色玻璃板', 'black_terracotta': '黑色陶瓦',
    'black_wool': '黑色羊毛', 'blackstone': '黑石',
    'blackstone_slab': '黑石台阶', 'blackstone_stairs': '黑石楼梯',
    'blackstone_wall': '黑石墙', 'blade_pottery_sherd': '刀刃陶片',
    'blast_furnace': '高炉', 'blaze_powder': '烈焰粉',
    'blaze_rod': '烈焰棒', 'blaze_spawn_egg': '烈焰人刷怪蛋',
    'blue_banner': '蓝色旗帜', 'blue_bed': '蓝色床',
    'blue_bundle': '蓝色收纳袋', 'blue_candle': '蓝色蜡烛',
    'blue_carpet': '蓝色地毯', 'blue_concrete': '蓝色混凝土',
    'blue_concrete_powder': '蓝色混凝土粉末', 'blue_dye': '蓝色染料',
    'blue_egg': '蓝色鸡蛋', 'blue_glazed_terracotta': '蓝色釉陶',
    'blue_harness': '蓝色马铠', 'blue_ice': '蓝冰',
    'blue_orchid': '蓝色兰花', 'blue_shulker_box': '蓝色潜影盒',
    'blue_stained_glass': '蓝色染色玻璃', 'blue_stained_glass_pane': '蓝色染色玻璃板',
    'blue_terracotta': '蓝色陶瓦', 'blue_wool': '蓝色羊毛',
    'bogged_spawn_egg': '沼泽骷髅刷怪蛋', 'bolt_armor_trim_smithing_template': '闪电锻造模板',
    'bone': '骨头', 'bone_block': '骨块', 'bone_meal': '骨粉',
    'book': '书', 'bookshelf': '书架',
    'bordure_indented_banner_pattern': '锯齿边旗帜图案',
    'bow': '弓', 'bowl': '碗',
    'brain_coral': '脑纹珊瑚', 'brain_coral_block': '脑纹珊瑚块',
    'brain_coral_fan': '脑纹珊瑚扇', 'bread': '面包',
    'breeze_rod': '风息棒', 'breeze_spawn_egg': '风息者刷怪蛋',
    'brewer_pottery_sherd': '酿造陶片', 'brewing_stand': '酿造台',
    'brick': '砖块', 'brick_slab': '砖台阶',
    'brick_stairs': '砖楼梯', 'brick_wall': '砖墙', 'bricks': '砖',
    'brown_banner': '棕色旗帜', 'brown_bed': '棕色床',
    'brown_bundle': '棕色收纳袋', 'brown_candle': '棕色蜡烛',
    'brown_carpet': '棕色地毯', 'brown_concrete': '棕色混凝土',
    'brown_concrete_powder': '棕色混凝土粉末', 'brown_dye': '棕色染料',
    'brown_egg': '棕色鸡蛋', 'brown_glazed_terracotta': '棕色釉陶',
    'brown_harness': '棕色马铠', 'brown_mushroom': '棕色蘑菇',
    'brown_mushroom_block': '棕色蘑菇块', 'brown_shulker_box': '棕色潜影盒',
    'brown_stained_glass': '棕色染色玻璃', 'brown_stained_glass_pane': '棕色染色玻璃板',
    'brown_terracotta': '棕色陶瓦', 'brown_wool': '棕色羊毛',
    'brush': '刷子', 'bubble_coral': '气泡珊瑚',
    'bubble_coral_block': '气泡珊瑚块', 'bubble_coral_fan': '气泡珊瑚扇',
    'bucket': '桶', 'budding_amethyst': '紫水晶母岩',
    'bundle': '收纳袋', 'burn_pottery_sherd': '燃烧陶片', 'bush': '灌木',
    'cactus': '仙人掌', 'cactus_flower': '仙人掌花', 'cake': '蛋糕',
    'calcite': '方解石', 'calibrated_sculk_sensor': '校准幽匿感测体',
    'camel_spawn_egg': '骆驼刷怪蛋', 'campfire': '营火', 'candle': '蜡烛',
    'carrot': '胡萝卜', 'carrot_on_a_stick': '胡萝卜钓竿',
    'cartography_table': '制图台', 'carved_pumpkin': '雕刻南瓜',
    'cat_spawn_egg': '猫刷怪蛋', 'cauldron': '炼药锅',
    'cave_spider_spawn_egg': '洞穴蜘蛛刷怪蛋', 'chain': '铁链',
    'chain_command_block': '连锁型命令方块',
    'chainmail_boots': '锁链靴子', 'chainmail_chestplate': '锁链胸甲',
    'chainmail_helmet': '锁链头盔', 'chainmail_leggings': '锁链护腿',
    'charcoal': '木炭',
    'cherry_boat': '樱花木船', 'cherry_button': '樱花木按钮',
    'cherry_chest_boat': '带箱樱花木船', 'cherry_door': '樱花木门',
    'cherry_fence': '樱花木栅栏', 'cherry_fence_gate': '樱花木栅栏门',
    'cherry_hanging_sign': '樱花木悬挂告示牌', 'cherry_leaves': '樱花树叶',
    'cherry_log': '樱花原木', 'cherry_planks': '樱花木板',
    'cherry_pressure_plate': '樱花木压力板', 'cherry_sapling': '樱花树苗',
    'cherry_shelf': '樱花木书架', 'cherry_sign': '樱花木告示牌',
    'cherry_slab': '樱花木台阶', 'cherry_stairs': '樱花木楼梯',
    'cherry_trapdoor': '樱花木活板门', 'cherry_wood': '樱花木头',
    'chest': '箱子', 'chest_minecart': '运输矿车',
    'chicken': '生鸡肉', 'chicken_spawn_egg': '鸡刷怪蛋',
    'chipped_anvil': '破损铁砧', 'chiseled_bookshelf': '雕纹书架',
    'chiseled_copper': '雕纹铜块', 'chiseled_deepslate': '雕纹深板岩',
    'chiseled_nether_bricks': '雕纹下界砖',
    'chiseled_polished_blackstone': '雕纹磨制黑石',
    'chiseled_quartz_block': '雕纹石英块',
    'chiseled_red_sandstone': '雕纹红砂岩',
    'chiseled_resin_bricks': '雕纹树脂砖',
    'chiseled_sandstone': '雕纹砂岩', 'chiseled_stone_bricks': '雕纹石砖',
    'chiseled_tuff': '雕纹凝灰岩', 'chiseled_tuff_bricks': '雕纹凝灰岩砖',
    'chorus_flower': '紫颂花', 'chorus_fruit': '紫颂果',
    'chorus_plant': '紫颂植物', 'clay': '泥土块', 'clay_ball': '粘土球',
    'clock': '时钟', 'closed_eyeblossom': '闭合眼花',
    'coal': '煤炭', 'coal_block': '煤炭块', 'coal_ore': '煤炭矿石',
    'coarse_dirt': '粗泥土', 'coast_armor_trim_smithing_template': '海岸锻造模板',
    'cobbled_deepslate': '圆石深板岩', 'cobbled_deepslate_slab': '圆石深板岩台阶',
    'cobbled_deepslate_stairs': '圆石深板岩楼梯', 'cobbled_deepslate_wall': '圆石深板岩墙',
    'cobblestone': '圆石', 'cobblestone_slab': '圆石台阶',
    'cobblestone_stairs': '圆石楼梯', 'cobblestone_wall': '圆石墙',
    'cobweb': '蜘蛛网', 'cocoa_beans': '可可豆',
    'cod': '生鳕鱼', 'cod_bucket': '桶装鳕鱼', 'cod_spawn_egg': '鳕鱼刷怪蛋',
    'command_block': '命令方块', 'command_block_minecart': '命令方块矿车',
    'comparator': '红石比较器', 'compass': '指南针',
    'composter': '堆肥桶', 'conduit': '导流管',
    'cooked_beef': '熟牛排', 'cooked_chicken': '熟鸡肉',
    'cooked_cod': '熟鳕鱼', 'cooked_mutton': '熟羊排',
    'cooked_porkchop': '熟猪排', 'cooked_rabbit': '熟兔肉',
    'cooked_salmon': '熟鲑鱼', 'cookie': '曲奇',
    'copper_axe': '铜斧', 'copper_bars': '铜栏杆',
    'copper_block': '铜块', 'copper_boots': '铜靴子',
    'copper_bulb': '铜灯泡', 'copper_chain': '铜链',
    'copper_chest': '铜箱子', 'copper_chestplate': '铜胸甲',
    'copper_door': '铜门', 'copper_golem_spawn_egg': '铜傀儡刷怪蛋',
    'copper_golem_statue': '铜傀儡雕像', 'copper_grate': '铜格栅',
    'copper_helmet': '铜头盔', 'copper_hoe': '铜锄',
    'copper_horse_armor': '铜马铠', 'copper_ingot': '铜锭',
    'copper_lantern': '铜灯笼', 'copper_leggings': '铜护腿',
    'copper_nugget': '铜粒', 'copper_ore': '铜矿石',
    'copper_pickaxe': '铜镐', 'copper_shovel': '铜铲',
    'copper_sword': '铜剑', 'copper_torch': '铜火把',
    'copper_trapdoor': '铜活板门', 'cornflower': '矢车菊',
    'cow_spawn_egg': '牛刷怪蛋',
    'cracked_deepslate_bricks': '裂纹深板岩砖',
    'cracked_deepslate_tiles': '裂纹深板岩瓦',
    'cracked_nether_bricks': '裂纹下界砖',
    'cracked_polished_blackstone_bricks': '裂纹磨制黑石砖',
    'cracked_stone_bricks': '裂纹石砖',
    'crafter': '合成器', 'crafting_table': '工作台',
    'creaking_heart': '嘎枝之心', 'creaking_spawn_egg': '嘎枝刷怪蛋',
    'creeper_banner_pattern': '苦力怕旗帜图案', 'creeper_head': '苦力怕头颅',
    'creeper_spawn_egg': '苦力怕刷怪蛋',
    'crimson_button': '绯红菌按钮', 'crimson_door': '绯红菌门',
    'crimson_fence': '绯红菌栅栏', 'crimson_fence_gate': '绯红菌栅栏门',
    'crimson_fungus': '绯红菌', 'crimson_hanging_sign': '绯红菌悬挂告示牌',
    'crimson_hyphae': '绯红菌丝体', 'crimson_nylium': '绯红菌岩',
    'crimson_planks': '绯红菌木板', 'crimson_pressure_plate': '绯红菌压力板',
    'crimson_roots': '绯红菌根', 'crimson_shelf': '绯红菌书架',
    'crimson_sign': '绯红菌告示牌', 'crimson_slab': '绯红菌台阶',
    'crimson_stairs': '绯红菌楼梯', 'crimson_stem': '绯红菌茎',
    'crimson_trapdoor': '绯红菌活板门',
    'crossbow': '弩', 'crying_obsidian': '哭泣的黑曜石',
    'cut_copper': '切制铜块', 'cut_copper_slab': '切制铜台阶',
    'cut_copper_stairs': '切制铜楼梯',
    'cut_red_sandstone': '切制红砂岩', 'cut_red_sandstone_slab': '切制红砂岩台阶',
    'cut_sandstone': '切制砂岩', 'cut_sandstone_slab': '切制砂岩台阶',
    'cyan_banner': '青色旗帜', 'cyan_bed': '青色床',
    'cyan_bundle': '青色收纳袋', 'cyan_candle': '青色蜡烛',
    'cyan_carpet': '青色地毯', 'cyan_concrete': '青色混凝土',
    'cyan_concrete_powder': '青色混凝土粉末', 'cyan_dye': '青色染料',
    'cyan_glazed_terracotta': '青色釉陶', 'cyan_harness': '青色马铠',
    'cyan_shulker_box': '青色潜影盒', 'cyan_stained_glass': '青色染色玻璃',
    'cyan_stained_glass_pane': '青色染色玻璃板', 'cyan_terracotta': '青色陶瓦',
    'cyan_wool': '青色羊毛',
    'damaged_anvil': '损坏的铁砧', 'dandelion': '蒲公英',
    'danger_pottery_sherd': '危险陶片',
    'dark_oak_boat': '深色橡木船', 'dark_oak_button': '深色橡木按钮',
    'dark_oak_chest_boat': '带箱深色橡木船', 'dark_oak_door': '深色橡木门',
    'dark_oak_fence': '深色橡木栅栏', 'dark_oak_fence_gate': '深色橡木栅栏门',
    'dark_oak_hanging_sign': '深色橡木悬挂告示牌', 'dark_oak_leaves': '深色橡树叶',
    'dark_oak_log': '深色橡木原木', 'dark_oak_planks': '深色橡木板',
    'dark_oak_pressure_plate': '深色橡木压力板', 'dark_oak_sapling': '深色橡树苗',
    'dark_oak_shelf': '深色橡木书架', 'dark_oak_sign': '深色橡木告示牌',
    'dark_oak_slab': '深色橡木台阶', 'dark_oak_stairs': '深色橡木楼梯',
    'dark_oak_trapdoor': '深色橡木活板门', 'dark_oak_wood': '深色橡木头',
    'dark_prismarine': '深色海晶石', 'dark_prismarine_slab': '深色海晶石台阶',
    'dark_prismarine_stairs': '深色海晶石楼梯',
    'daylight_detector': '阳光传感器',
    'dead_brain_coral': '枯死脑纹珊瑚', 'dead_brain_coral_block': '枯死脑纹珊瑚块',
    'dead_brain_coral_fan': '枯死脑纹珊瑚扇',
    'dead_bubble_coral': '枯死气泡珊瑚', 'dead_bubble_coral_block': '枯死气泡珊瑚块',
    'dead_bubble_coral_fan': '枯死气泡珊瑚扇',
    'dead_bush': '枯木',
    'dead_fire_coral': '枯死火焰珊瑚', 'dead_fire_coral_block': '枯死火焰珊瑚块',
    'dead_fire_coral_fan': '枯死火焰珊瑚扇',
    'dead_horn_coral': '枯死鹿角珊瑚', 'dead_horn_coral_block': '枯死鹿角珊瑚块',
    'dead_horn_coral_fan': '枯死鹿角珊瑚扇',
    'dead_tube_coral': '枯死管状珊瑚', 'dead_tube_coral_block': '枯死管状珊瑚块',
    'dead_tube_coral_fan': '枯死管状珊瑚扇',
    'debug_stick': '调试棒', 'decorated_pot': '纹饰陶罐',
    'deepslate': '深板岩', 'deepslate_brick_slab': '深板岩砖台阶',
    'deepslate_brick_stairs': '深板岩砖楼梯', 'deepslate_brick_wall': '深板岩砖墙',
    'deepslate_bricks': '深板岩砖', 'deepslate_coal_ore': '深层煤炭矿石',
    'deepslate_copper_ore': '深层铜矿石', 'deepslate_diamond_ore': '深层钻石矿石',
    'deepslate_emerald_ore': '深层绿宝石矿石', 'deepslate_gold_ore': '深层金矿石',
    'deepslate_iron_ore': '深层铁矿石', 'deepslate_lapis_ore': '深层青金石矿石',
    'deepslate_redstone_ore': '深层红石矿石',
    'deepslate_tile_slab': '深板岩瓦台阶', 'deepslate_tile_stairs': '深板岩瓦楼梯',
    'deepslate_tile_wall': '深板岩瓦墙', 'deepslate_tiles': '深板岩瓦',
    'detector_rail': '探测铁轨', 'diamond': '钻石',
    'diamond_axe': '钻石斧', 'diamond_block': '钻石块',
    'diamond_boots': '钻石靴子', 'diamond_chestplate': '钻石胸甲',
    'diamond_helmet': '钻石头盔', 'diamond_hoe': '钻石锄',
    'diamond_horse_armor': '钻石马铠', 'diamond_leggings': '钻石护腿',
    'diamond_ore': '钻石矿石', 'diamond_pickaxe': '钻石镐',
    'diamond_shovel': '钻石铲', 'diamond_sword': '钻石剑',
    'diorite': '闪长岩', 'diorite_slab': '闪长岩台阶',
    'diorite_stairs': '闪长岩楼梯', 'diorite_wall': '闪长岩墙',
    'dirt': '泥土', 'dirt_path': '泥土小路',
    'disc_fragment_5': '唱片碎片5', 'dispenser': '发射器',
    'dolphin_spawn_egg': '海豚刷怪蛋', 'donkey_spawn_egg': '驴刷怪蛋',
    'dragon_breath': '龙息', 'dragon_egg': '龙蛋', 'dragon_head': '龙头',
    'dried_ghast': '干燥恶魂', 'dried_kelp': '干海带',
    'dried_kelp_block': '干海带块', 'dripstone_block': '滴水石块',
    'dropper': '投掷器', 'drowned_spawn_egg': '溺尸刷怪蛋',
    'dune_armor_trim_smithing_template': '沙丘锻造模板',
    'echo_shard': '回响碎片', 'egg': '鸡蛋',
    'elder_guardian_spawn_egg': '远古守卫者刷怪蛋', 'elytra': '鞘翅',
    'emerald': '绿宝石', 'emerald_block': '绿宝石块',
    'emerald_ore': '绿宝石矿石', 'enchanted_book': '魔法书',
    'enchanted_golden_apple': '附魔金苹果', 'enchanting_table': '附魔台',
    'end_crystal': '末地水晶', 'end_portal_frame': '末地传送门框架',
    'end_rod': '末地烛', 'end_stone': '末地石',
    'end_stone_brick_slab': '末地石砖台阶', 'end_stone_brick_stairs': '末地石砖楼梯',
    'end_stone_brick_wall': '末地石砖墙', 'end_stone_bricks': '末地石砖',
    'ender_chest': '末影箱', 'ender_dragon_spawn_egg': '末影龙刷怪蛋',
    'ender_eye': '末影之眼', 'ender_pearl': '末影珍珠',
    'enderman_spawn_egg': '末影人刷怪蛋', 'endermite_spawn_egg': '末影螨刷怪蛋',
    'evoker_spawn_egg': '唤魔者刷怪蛋', 'experience_bottle': '附魔之瓶',
    'explorer_pottery_sherd': '探索者陶片',
    'exposed_chiseled_copper': '轻微氧化雕纹铜块',
    'exposed_copper': '轻微氧化铜块', 'exposed_copper_bars': '轻微氧化铜栏杆',
    'exposed_copper_bulb': '轻微氧化铜灯泡', 'exposed_copper_chain': '轻微氧化铜链',
    'exposed_copper_chest': '轻微氧化铜箱子', 'exposed_copper_door': '轻微氧化铜门',
    'exposed_copper_golem_statue': '轻微氧化铜傀儡雕像',
    'exposed_copper_grate': '轻微氧化铜格栅', 'exposed_copper_lantern': '轻微氧化铜灯笼',
    'exposed_copper_trapdoor': '轻微氧化铜活板门',
    'exposed_cut_copper': '轻微氧化切制铜块',
    'exposed_cut_copper_slab': '轻微氧化切制铜台阶',
    'exposed_cut_copper_stairs': '轻微氧化切制铜楼梯',
    'exposed_lightning_rod': '轻微氧化避雷针',
    'eye_armor_trim_smithing_template': '眼睛锻造模板',
    'farmland': '耕地', 'feather': '羽毛',
    'fermented_spider_eye': '发酵蜘蛛眼', 'fern': '蕨草',
    'field_masoned_banner_pattern': '砖纹旗帜图案', 'filled_map': '已填充地图',
    'fire_charge': '火球',
    'fire_coral': '火焰珊瑚', 'fire_coral_block': '火焰珊瑚块',
    'fire_coral_fan': '火焰珊瑚扇', 'firefly_bush': '萤火虫灌木',
    'firework_rocket': '烟火火箭', 'firework_star': '烟火之星',
    'fishing_rod': '钓鱼竿', 'fletching_table': '制箭台',
    'flint': '燧石', 'flint_and_steel': '打火石',
    'flow_armor_trim_smithing_template': '流动锻造模板',
    'flow_banner_pattern': '流动旗帜图案', 'flow_pottery_sherd': '流动陶片',
    'flower_banner_pattern': '花朵旗帜图案', 'flower_pot': '花盆',
    'flowering_azalea': '开花杜鹃花丛', 'flowering_azalea_leaves': '开花杜鹃花树叶',
    'fox_spawn_egg': '狐狸刷怪蛋', 'friend_pottery_sherd': '友谊陶片',
    'frog_spawn_egg': '青蛙刷怪蛋', 'frogspawn': '蛙卵',
    'furnace': '熔炉', 'furnace_minecart': '熔炉矿车',
    'ghast_spawn_egg': '恶魂刷怪蛋', 'ghast_tear': '恶魂之泪',
    'gilded_blackstone': '镶金黑石', 'glass': '玻璃',
    'glass_bottle': '玻璃瓶', 'glass_pane': '玻璃板',
    'glistering_melon_slice': '闪烁西瓜片', 'globe_banner_pattern': '地球旗帜图案',
    'glow_berries': '发光浆果', 'glow_ink_sac': '发光墨囊',
    'glow_item_frame': '发光物品展示框', 'glow_lichen': '发光地衣',
    'glow_squid_spawn_egg': '发光鱿鱼刷怪蛋', 'glowstone': '萤石',
    'glowstone_dust': '萤石粉', 'goat_horn': '山羊角',
    'goat_spawn_egg': '山羊刷怪蛋', 'gold_block': '金块',
    'gold_ingot': '金锭', 'gold_nugget': '金粒', 'gold_ore': '金矿石',
    'golden_apple': '金苹果', 'golden_axe': '金斧',
    'golden_boots': '金靴子', 'golden_carrot': '金胡萝卜',
    'golden_chestplate': '金胸甲', 'golden_helmet': '金头盔',
    'golden_hoe': '金锄', 'golden_horse_armor': '金马铠',
    'golden_leggings': '金护腿', 'golden_pickaxe': '金镐',
    'golden_shovel': '金铲', 'golden_sword': '金剑',
    'granite': '花岗岩', 'granite_slab': '花岗岩台阶',
    'granite_stairs': '花岗岩楼梯', 'granite_wall': '花岗岩墙',
    'grass_block': '草方块', 'gravel': '沙砾',
    'gray_banner': '灰色旗帜', 'gray_bed': '灰色床',
    'gray_bundle': '灰色收纳袋', 'gray_candle': '灰色蜡烛',
    'gray_carpet': '灰色地毯', 'gray_concrete': '灰色混凝土',
    'gray_concrete_powder': '灰色混凝土粉末', 'gray_dye': '灰色染料',
    'gray_glazed_terracotta': '灰色釉陶', 'gray_harness': '灰色马铠',
    'gray_shulker_box': '灰色潜影盒', 'gray_stained_glass': '灰色染色玻璃',
    'gray_stained_glass_pane': '灰色染色玻璃板', 'gray_terracotta': '灰色陶瓦',
    'gray_wool': '灰色羊毛',
    'green_banner': '绿色旗帜', 'green_bed': '绿色床',
    'green_bundle': '绿色收纳袋', 'green_candle': '绿色蜡烛',
    'green_carpet': '绿色地毯', 'green_concrete': '绿色混凝土',
    'green_concrete_powder': '绿色混凝土粉末', 'green_dye': '绿色染料',
    'green_glazed_terracotta': '绿色釉陶', 'green_harness': '绿色马铠',
    'green_shulker_box': '绿色潜影盒', 'green_stained_glass': '绿色染色玻璃',
    'green_stained_glass_pane': '绿色染色玻璃板', 'green_terracotta': '绿色陶瓦',
    'green_wool': '绿色羊毛', 'grindstone': '砂轮',
    'guardian_spawn_egg': '守卫者刷怪蛋', 'gunpowder': '火药',
    'guster_banner_pattern': '风暴旗帜图案', 'guster_pottery_sherd': '风暴陶片',
    'hanging_roots': '垂根', 'happy_ghast_spawn_egg': '快乐恶魂刷怪蛋',
    'hay_block': '干草块', 'heart_of_the_sea': '海洋之心',
    'heart_pottery_sherd': '心形陶片', 'heartbreak_pottery_sherd': '心碎陶片',
    'heavy_core': '沉重核心', 'heavy_weighted_pressure_plate': '重型测重压力板',
    'hoglin_spawn_egg': '疣猪兽刷怪蛋', 'honey_block': '蜂蜜块',
    'honey_bottle': '蜂蜜瓶', 'honeycomb': '蜂巢',
    'honeycomb_block': '蜂巢块', 'hopper': '漏斗',
    'hopper_minecart': '漏斗矿车',
    'horn_coral': '鹿角珊瑚', 'horn_coral_block': '鹿角珊瑚块',
    'horn_coral_fan': '鹿角珊瑚扇', 'horse_spawn_egg': '马刷怪蛋',
    'host_armor_trim_smithing_template': '宿主锻造模板',
    'howl_pottery_sherd': '嚎叫陶片', 'husk_spawn_egg': '尸壳刷怪蛋',
    'ice': '冰',
    'infested_chiseled_stone_bricks': '被虫蚀的雕纹石砖',
    'infested_cobblestone': '被虫蚀的圆石',
    'infested_cracked_stone_bricks': '被虫蚀的裂纹石砖',
    'infested_deepslate': '被虫蚀的深板岩',
    'infested_mossy_stone_bricks': '被虫蚀的苔石砖',
    'infested_stone': '被虫蚀的石头', 'infested_stone_bricks': '被虫蚀的石砖',
    'ink_sac': '墨囊',
    'iron_axe': '铁斧', 'iron_bars': '铁栏杆',
    'iron_block': '铁块', 'iron_boots': '铁靴子',
    'iron_chain': '铁链', 'iron_chestplate': '铁胸甲',
    'iron_door': '铁门', 'iron_golem_spawn_egg': '铁傀儡刷怪蛋',
    'iron_helmet': '铁头盔', 'iron_hoe': '铁锄',
    'iron_horse_armor': '铁马铠', 'iron_ingot': '铁锭',
    'iron_leggings': '铁护腿', 'iron_nugget': '铁粒',
    'iron_ore': '铁矿石', 'iron_pickaxe': '铁镐',
    'iron_shovel': '铁铲', 'iron_sword': '铁剑',
    'iron_trapdoor': '铁活板门', 'item_frame': '物品展示框',
    'jack_o_lantern': '南瓜灯', 'jigsaw': '拼图', 'jukebox': '唱片机',
    'jungle_boat': '丛林木船', 'jungle_button': '丛林木按钮',
    'jungle_chest_boat': '带箱丛林木船', 'jungle_door': '丛林木门',
    'jungle_fence': '丛林木栅栏', 'jungle_fence_gate': '丛林木栅栏门',
    'jungle_hanging_sign': '丛林木悬挂告示牌', 'jungle_leaves': '丛林树叶',
    'jungle_log': '丛林原木', 'jungle_planks': '丛林木板',
    'jungle_pressure_plate': '丛林木压力板', 'jungle_sapling': '丛林树苗',
    'jungle_shelf': '丛林木书架', 'jungle_sign': '丛林木告示牌',
    'jungle_slab': '丛林木台阶', 'jungle_stairs': '丛林木楼梯',
    'jungle_trapdoor': '丛林木活板门', 'jungle_wood': '丛林木头',
    'kelp': '海带', 'knowledge_book': '知识书', 'ladder': '梯子',
    'lantern': '灯笼', 'lapis_block': '青金石块',
    'lapis_lazuli': '青金石', 'lapis_ore': '青金石矿石',
    'large_amethyst_bud': '大型紫水晶芽', 'large_fern': '大型蕨草',
    'lava_bucket': '岩浆桶', 'lead': '拴绳', 'leaf_litter': '落叶',
    'leather': '皮革', 'leather_boots': '皮革靴子',
    'leather_chestplate': '皮革胸甲', 'leather_helmet': '皮革头盔',
    'leather_horse_armor': '皮革马铠', 'leather_leggings': '皮革护腿',
    'lectern': '讲台', 'lever': '拉杆', 'light': '光源',
    'light_blue_banner': '淡蓝色旗帜', 'light_blue_bed': '淡蓝色床',
    'light_blue_bundle': '淡蓝色收纳袋', 'light_blue_candle': '淡蓝色蜡烛',
    'light_blue_carpet': '淡蓝色地毯', 'light_blue_concrete': '淡蓝色混凝土',
    'light_blue_concrete_powder': '淡蓝色混凝土粉末', 'light_blue_dye': '淡蓝色染料',
    'light_blue_glazed_terracotta': '淡蓝色釉陶', 'light_blue_harness': '淡蓝色马铠',
    'light_blue_shulker_box': '淡蓝色潜影盒',
    'light_blue_stained_glass': '淡蓝色染色玻璃',
    'light_blue_stained_glass_pane': '淡蓝色染色玻璃板',
    'light_blue_terracotta': '淡蓝色陶瓦', 'light_blue_wool': '淡蓝色羊毛',
    'light_gray_banner': '淡灰色旗帜', 'light_gray_bed': '淡灰色床',
    'light_gray_bundle': '淡灰色收纳袋', 'light_gray_candle': '淡灰色蜡烛',
    'light_gray_carpet': '淡灰色地毯', 'light_gray_concrete': '淡灰色混凝土',
    'light_gray_concrete_powder': '淡灰色混凝土粉末', 'light_gray_dye': '淡灰色染料',
    'light_gray_glazed_terracotta': '淡灰色釉陶', 'light_gray_harness': '淡灰色马铠',
    'light_gray_shulker_box': '淡灰色潜影盒',
    'light_gray_stained_glass': '淡灰色染色玻璃',
    'light_gray_stained_glass_pane': '淡灰色染色玻璃板',
    'light_gray_terracotta': '淡灰色陶瓦', 'light_gray_wool': '淡灰色羊毛',
    'light_weighted_pressure_plate': '轻型测重压力板', 'lightning_rod': '避雷针',
    'lilac': '丁香', 'lily_of_the_valley': '铃兰', 'lily_pad': '睡莲',
    'lime_banner': '黄绿色旗帜', 'lime_bed': '黄绿色床',
    'lime_bundle': '黄绿色收纳袋', 'lime_candle': '黄绿色蜡烛',
    'lime_carpet': '黄绿色地毯', 'lime_concrete': '黄绿色混凝土',
    'lime_concrete_powder': '黄绿色混凝土粉末', 'lime_dye': '黄绿色染料',
    'lime_glazed_terracotta': '黄绿色釉陶', 'lime_harness': '黄绿色马铠',
    'lime_shulker_box': '黄绿色潜影盒', 'lime_stained_glass': '黄绿色染色玻璃',
    'lime_stained_glass_pane': '黄绿色染色玻璃板',
    'lime_terracotta': '黄绿色陶瓦', 'lime_wool': '黄绿色羊毛',
    'lingering_potion': '滞留型药水', 'llama_spawn_egg': '羊驼刷怪蛋',
    'lodestone': '磁石', 'loom': '织布机',
    'mace': '重锤',
    'magenta_banner': '品红色旗帜', 'magenta_bed': '品红色床',
    'magenta_bundle': '品红色收纳袋', 'magenta_candle': '品红色蜡烛',
    'magenta_carpet': '品红色地毯', 'magenta_concrete': '品红色混凝土',
    'magenta_concrete_powder': '品红色混凝土粉末', 'magenta_dye': '品红色染料',
    'magenta_glazed_terracotta': '品红色釉陶', 'magenta_harness': '品红色马铠',
    'magenta_shulker_box': '品红色潜影盒',
    'magenta_stained_glass': '品红色染色玻璃',
    'magenta_stained_glass_pane': '品红色染色玻璃板',
    'magenta_terracotta': '品红色陶瓦', 'magenta_wool': '品红色羊毛',
    'magma_block': '岩浆块', 'magma_cream': '岩浆膏',
    'magma_cube_spawn_egg': '岩浆怪刷怪蛋',
    'mangrove_boat': '红树木船', 'mangrove_button': '红树木按钮',
    'mangrove_chest_boat': '带箱红树木船', 'mangrove_door': '红树木门',
    'mangrove_fence': '红树木栅栏', 'mangrove_fence_gate': '红树木栅栏门',
    'mangrove_hanging_sign': '红树木悬挂告示牌', 'mangrove_leaves': '红树树叶',
    'mangrove_log': '红树原木', 'mangrove_planks': '红树木板',
    'mangrove_pressure_plate': '红树木压力板', 'mangrove_propagule': '红树胚轴',
    'mangrove_roots': '红树根', 'mangrove_shelf': '红树木书架',
    'mangrove_sign': '红树木告示牌', 'mangrove_slab': '红树木台阶',
    'mangrove_stairs': '红树木楼梯', 'mangrove_trapdoor': '红树木活板门',
    'mangrove_wood': '红树木头', 'map': '地图',
    'medium_amethyst_bud': '中型紫水晶芽', 'melon': '西瓜',
    'melon_seeds': '西瓜种子', 'melon_slice': '西瓜片',
    'milk_bucket': '牛奶桶', 'minecart': '矿车',
    'miner_pottery_sherd': '矿工陶片', 'mojang_banner_pattern': 'Mojang旗帜图案',
    'mooshroom_spawn_egg': '哞菇刷怪蛋', 'moss_block': '苔藓块',
    'moss_carpet': '苔藓地毯', 'mossy_cobblestone': '苔石圆石',
    'mossy_cobblestone_slab': '苔石圆石台阶', 'mossy_cobblestone_stairs': '苔石圆石楼梯',
    'mossy_cobblestone_wall': '苔石圆石墙', 'mossy_stone_brick_slab': '苔石砖台阶',
    'mossy_stone_brick_stairs': '苔石砖楼梯', 'mossy_stone_brick_wall': '苔石砖墙',
    'mossy_stone_bricks': '苔石砖', 'mourner_pottery_sherd': '哀悼陶片',
    'mud': '泥巴', 'mud_brick_slab': '泥砖台阶',
    'mud_brick_stairs': '泥砖楼梯', 'mud_brick_wall': '泥砖墙',
    'mud_bricks': '泥砖', 'muddy_mangrove_roots': '泥泞红树根',
    'mule_spawn_egg': '骡子刷怪蛋', 'mushroom_stem': '蘑菇茎',
    'mushroom_stew': '蘑菇汤',
    'music_disc_11': '唱片 11', 'music_disc_13': '唱片 13',
    'music_disc_5': '唱片 5', 'music_disc_blocks': '唱片 Blocks',
    'music_disc_cat': '唱片 Cat', 'music_disc_chirp': '唱片 Chirp',
    'music_disc_creator': '唱片 Creator',
    'music_disc_creator_music_box': '唱片 Creator Music Box',
    'music_disc_far': '唱片 Far', 'music_disc_lava_chicken': '唱片 Lava Chicken',
    'music_disc_mall': '唱片 Mall', 'music_disc_mellohi': '唱片 Mellohi',
    'music_disc_otherside': '唱片 Otherside',
    'music_disc_pigstep': '唱片 Pigstep',
    'music_disc_precipice': '唱片 Precipice', 'music_disc_relic': '唱片 Relic',
    'music_disc_stal': '唱片 Stal', 'music_disc_strad': '唱片 Strad',
    'music_disc_tears': '唱片 Tears', 'music_disc_wait': '唱片 Wait',
    'music_disc_ward': '唱片 Ward', 'mutton': '生羊排',
    'mycelium': '菌丝体', 'name_tag': '命名牌',
    'nautilus_shell': '鹦鹉螺壳',
    'nether_brick': '下界砖块', 'nether_brick_fence': '下界砖栅栏',
    'nether_brick_slab': '下界砖台阶', 'nether_brick_stairs': '下界砖楼梯',
    'nether_brick_wall': '下界砖墙', 'nether_bricks': '下界砖',
    'nether_gold_ore': '下界金矿石', 'nether_quartz_ore': '下界石英矿石',
    'nether_sprouts': '下界芽', 'nether_star': '下界之星',
    'nether_wart': '下界疣', 'nether_wart_block': '疣块',
    'netherite_axe': '下界合金斧', 'netherite_block': '下界合金块',
    'netherite_boots': '下界合金靴子', 'netherite_chestplate': '下界合金胸甲',
    'netherite_helmet': '下界合金头盔', 'netherite_hoe': '下界合金锄',
    'netherite_ingot': '下界合金锭', 'netherite_leggings': '下界合金护腿',
    'netherite_pickaxe': '下界合金镐', 'netherite_scrap': '下界合金碎片',
    'netherite_shovel': '下界合金铲', 'netherite_sword': '下界合金剑',
    'netherite_upgrade_smithing_template': '下界合金升级锻造模板',
    'netherrack': '下界岩', 'note_block': '音符盒',
    'oak_boat': '橡木船', 'oak_button': '橡木按钮',
    'oak_chest_boat': '带箱橡木船', 'oak_door': '橡木门',
    'oak_fence': '橡木栅栏', 'oak_fence_gate': '橡木栅栏门',
    'oak_hanging_sign': '橡木悬挂告示牌', 'oak_leaves': '橡树叶',
    'oak_log': '橡木原木', 'oak_planks': '橡木板',
    'oak_pressure_plate': '橡木压力板', 'oak_sapling': '橡树苗',
    'oak_shelf': '橡木书架', 'oak_sign': '橡木告示牌',
    'oak_slab': '橡木台阶', 'oak_stairs': '橡木楼梯',
    'oak_trapdoor': '橡木活板门', 'oak_wood': '橡木头',
    'observer': '侦测器', 'obsidian': '黑曜石',
    'ocelot_spawn_egg': '豹猫刷怪蛋', 'ochre_froglight': '赭黄蛙明石',
    'ominous_bottle': '凶兆药水', 'ominous_trial_key': '凶兆试炼钥匙',
    'open_eyeblossom': '开放眼花',
    'orange_banner': '橙色旗帜', 'orange_bed': '橙色床',
    'orange_bundle': '橙色收纳袋', 'orange_candle': '橙色蜡烛',
    'orange_carpet': '橙色地毯', 'orange_concrete': '橙色混凝土',
    'orange_concrete_powder': '橙色混凝土粉末', 'orange_dye': '橙色染料',
    'orange_glazed_terracotta': '橙色釉陶', 'orange_harness': '橙色马铠',
    'orange_shulker_box': '橙色潜影盒', 'orange_stained_glass': '橙色染色玻璃',
    'orange_stained_glass_pane': '橙色染色玻璃板',
    'orange_terracotta': '橙色陶瓦', 'orange_tulip': '橙色郁金香',
    'orange_wool': '橙色羊毛', 'oxeye_daisy': '滨菊',
    'oxidized_chiseled_copper': '氧化雕纹铜块',
    'oxidized_copper': '氧化铜块', 'oxidized_copper_bars': '氧化铜栏杆',
    'oxidized_copper_bulb': '氧化铜灯泡', 'oxidized_copper_chain': '氧化铜链',
    'oxidized_copper_chest': '氧化铜箱子', 'oxidized_copper_door': '氧化铜门',
    'oxidized_copper_golem_statue': '氧化铜傀儡雕像',
    'oxidized_copper_grate': '氧化铜格栅', 'oxidized_copper_lantern': '氧化铜灯笼',
    'oxidized_copper_trapdoor': '氧化铜活板门',
    'oxidized_cut_copper': '氧化切制铜块',
    'oxidized_cut_copper_slab': '氧化切制铜台阶',
    'oxidized_cut_copper_stairs': '氧化切制铜楼梯',
    'oxidized_lightning_rod': '氧化避雷针',
    'packed_ice': '浮冰', 'packed_mud': '紧实泥巴', 'painting': '画',
    'pale_hanging_moss': '苍白悬挂苔藓', 'pale_moss_block': '苍白苔藓块',
    'pale_moss_carpet': '苍白苔藓地毯',
    'pale_oak_boat': '苍白橡木船', 'pale_oak_button': '苍白橡木按钮',
    'pale_oak_chest_boat': '带箱苍白橡木船', 'pale_oak_door': '苍白橡木门',
    'pale_oak_fence': '苍白橡木栅栏', 'pale_oak_fence_gate': '苍白橡木栅栏门',
    'pale_oak_hanging_sign': '苍白橡木悬挂告示牌', 'pale_oak_leaves': '苍白橡树叶',
    'pale_oak_log': '苍白橡木原木', 'pale_oak_planks': '苍白橡木板',
    'pale_oak_pressure_plate': '苍白橡木压力板', 'pale_oak_sapling': '苍白橡树苗',
    'pale_oak_shelf': '苍白橡木书架', 'pale_oak_sign': '苍白橡木告示牌',
    'pale_oak_slab': '苍白橡木台阶', 'pale_oak_stairs': '苍白橡木楼梯',
    'pale_oak_trapdoor': '苍白橡木活板门', 'pale_oak_wood': '苍白橡木头',
    'panda_spawn_egg': '熊猫刷怪蛋', 'paper': '纸',
    'parrot_spawn_egg': '鹦鹉刷怪蛋', 'pearlescent_froglight': '珍珠白蛙明石',
    'peony': '牡丹', 'petrified_oak_slab': '石化橡木台阶',
    'phantom_membrane': '幻翼膜', 'phantom_spawn_egg': '幻翼刷怪蛋',
    'pig_spawn_egg': '猪刷怪蛋', 'piglin_banner_pattern': '猪灵旗帜图案',
    'piglin_brute_spawn_egg': '猪灵蛮兵刷怪蛋', 'piglin_head': '猪灵头颅',
    'piglin_spawn_egg': '猪灵刷怪蛋', 'pillager_spawn_egg': '掠夺者刷怪蛋',
    'pink_banner': '粉红色旗帜', 'pink_bed': '粉红色床',
    'pink_bundle': '粉红色收纳袋', 'pink_candle': '粉红色蜡烛',
    'pink_carpet': '粉红色地毯', 'pink_concrete': '粉红色混凝土',
    'pink_concrete_powder': '粉红色混凝土粉末', 'pink_dye': '粉红色染料',
    'pink_glazed_terracotta': '粉红色釉陶', 'pink_harness': '粉红色马铠',
    'pink_petals': '粉红色花瓣', 'pink_shulker_box': '粉红色潜影盒',
    'pink_stained_glass': '粉红色染色玻璃',
    'pink_stained_glass_pane': '粉红色染色玻璃板',
    'pink_terracotta': '粉红色陶瓦', 'pink_tulip': '粉红色郁金香',
    'pink_wool': '粉红色羊毛', 'piston': '活塞',
    'pitcher_plant': '瓶子草', 'pitcher_pod': '瓶子草荚',
    'player_head': '玩家头颅', 'plenty_pottery_sherd': '丰盛陶片',
    'podzol': '灰化土', 'pointed_dripstone': '滴水石锥',
    'poisonous_potato': '毒土豆', 'polar_bear_spawn_egg': '北极熊刷怪蛋',
    'polished_andesite': '磨制安山岩', 'polished_andesite_slab': '磨制安山岩台阶',
    'polished_andesite_stairs': '磨制安山岩楼梯',
    'polished_basalt': '磨制玄武岩', 'polished_blackstone': '磨制黑石',
    'polished_blackstone_brick_slab': '磨制黑石砖台阶',
    'polished_blackstone_brick_stairs': '磨制黑石砖楼梯',
    'polished_blackstone_brick_wall': '磨制黑石砖墙',
    'polished_blackstone_bricks': '磨制黑石砖',
    'polished_blackstone_button': '磨制黑石按钮',
    'polished_blackstone_pressure_plate': '磨制黑石压力板',
    'polished_blackstone_slab': '磨制黑石台阶',
    'polished_blackstone_stairs': '磨制黑石楼梯',
    'polished_blackstone_wall': '磨制黑石墙',
    'polished_deepslate': '磨制深板岩', 'polished_deepslate_slab': '磨制深板岩台阶',
    'polished_deepslate_stairs': '磨制深板岩楼梯',
    'polished_deepslate_wall': '磨制深板岩墙',
    'polished_diorite': '磨制闪长岩', 'polished_diorite_slab': '磨制闪长岩台阶',
    'polished_diorite_stairs': '磨制闪长岩楼梯',
    'polished_granite': '磨制花岗岩', 'polished_granite_slab': '磨制花岗岩台阶',
    'polished_granite_stairs': '磨制花岗岩楼梯',
    'polished_tuff': '磨制凝灰岩', 'polished_tuff_slab': '磨制凝灰岩台阶',
    'polished_tuff_stairs': '磨制凝灰岩楼梯', 'polished_tuff_wall': '磨制凝灰岩墙',
    'popped_chorus_fruit': '爆裂紫颂果', 'poppy': '虞美人',
    'porkchop': '生猪排', 'potato': '土豆', 'potion': '药水',
    'powder_snow_bucket': '粉雪桶', 'powered_rail': '充能铁轨',
    'prismarine': '海晶石', 'prismarine_brick_slab': '海晶石砖台阶',
    'prismarine_brick_stairs': '海晶石砖楼梯', 'prismarine_bricks': '海晶石砖',
    'prismarine_crystals': '海晶石晶体', 'prismarine_shard': '海晶石碎片',
    'prismarine_slab': '海晶石台阶', 'prismarine_stairs': '海晶石楼梯',
    'prismarine_wall': '海晶石墙', 'prize_pottery_sherd': '奖品陶片',
    'pufferfish': '河豚', 'pufferfish_bucket': '桶装河豚',
    'pufferfish_spawn_egg': '河豚刷怪蛋', 'pumpkin': '南瓜',
    'pumpkin_pie': '南瓜派', 'pumpkin_seeds': '南瓜种子',
    'purple_banner': '紫色旗帜', 'purple_bed': '紫色床',
    'purple_bundle': '紫色收纳袋', 'purple_candle': '紫色蜡烛',
    'purple_carpet': '紫色地毯', 'purple_concrete': '紫色混凝土',
    'purple_concrete_powder': '紫色混凝土粉末', 'purple_dye': '紫色染料',
    'purple_glazed_terracotta': '紫色釉陶', 'purple_harness': '紫色马铠',
    'purple_shulker_box': '紫色潜影盒', 'purple_stained_glass': '紫色染色玻璃',
    'purple_stained_glass_pane': '紫色染色玻璃板',
    'purple_terracotta': '紫色陶瓦', 'purple_wool': '紫色羊毛',
    'purpur_block': '紫珀块', 'purpur_pillar': '紫珀柱',
    'purpur_slab': '紫珀台阶', 'purpur_stairs': '紫珀楼梯',
    'quartz': '石英', 'quartz_block': '石英块',
    'quartz_bricks': '石英砖', 'quartz_pillar': '石英柱',
    'quartz_slab': '石英台阶', 'quartz_stairs': '石英楼梯',
    'rabbit': '生兔肉', 'rabbit_foot': '兔子脚',
    'rabbit_hide': '兔子皮', 'rabbit_spawn_egg': '兔子刷怪蛋',
    'rabbit_stew': '兔子汤', 'rail': '铁轨',
    'raiser_armor_trim_smithing_template': '提升锻造模板',
    'ravager_spawn_egg': '劫掠兽刷怪蛋', 'raw_copper': '粗铜',
    'raw_copper_block': '粗铜块', 'raw_gold': '粗金',
    'raw_gold_block': '粗金块', 'raw_iron': '粗铁',
    'raw_iron_block': '粗铁块', 'recovery_compass': '恢复指南针',
    'red_banner': '红色旗帜', 'red_bed': '红色床',
    'red_bundle': '红色收纳袋', 'red_candle': '红色蜡烛',
    'red_carpet': '红色地毯', 'red_concrete': '红色混凝土',
    'red_concrete_powder': '红色混凝土粉末', 'red_dye': '红色染料',
    'red_glazed_terracotta': '红色釉陶', 'red_harness': '红色马铠',
    'red_mushroom': '红色蘑菇', 'red_mushroom_block': '红色蘑菇块',
    'red_nether_brick_slab': '红色下界砖台阶',
    'red_nether_brick_stairs': '红色下界砖楼梯',
    'red_nether_brick_wall': '红色下界砖墙', 'red_nether_bricks': '红色下界砖',
    'red_sand': '红沙', 'red_sandstone': '红砂岩',
    'red_sandstone_slab': '红砂岩台阶', 'red_sandstone_stairs': '红砂岩楼梯',
    'red_sandstone_wall': '红砂岩墙', 'red_shulker_box': '红色潜影盒',
    'red_stained_glass': '红色染色玻璃',
    'red_stained_glass_pane': '红色染色玻璃板',
    'red_terracotta': '红色陶瓦', 'red_tulip': '红色郁金香',
    'red_wool': '红色羊毛', 'redstone': '红石',
    'redstone_block': '红石块', 'redstone_lamp': '红石灯',
    'redstone_ore': '红石矿石', 'redstone_torch': '红石火把',
    'reinforced_deepslate': '强化深板岩', 'repeater': '红石中继器',
    'repeating_command_block': '循环型命令方块', 'resin_block': '树脂块',
    'resin_brick': '树脂砖块', 'resin_brick_slab': '树脂砖台阶',
    'resin_brick_stairs': '树脂砖楼梯', 'resin_brick_wall': '树脂砖墙',
    'resin_bricks': '树脂砖', 'resin_clump': '树脂团',
    'respawn_anchor': '重生锚', 'rib_armor_trim_smithing_template': '肋骨锻造模板',
    'rooted_dirt': '缠根泥土', 'rose_bush': '玫瑰丛', 'rotten_flesh': '腐肉',
    'saddle': '鞍', 'salmon': '生鲑鱼',
    'salmon_bucket': '桶装鲑鱼', 'salmon_spawn_egg': '鲑鱼刷怪蛋',
    'sand': '沙子', 'sandstone': '砂岩',
    'sandstone_slab': '砂岩台阶', 'sandstone_stairs': '砂岩楼梯',
    'sandstone_wall': '砂岩墙', 'scaffolding': '脚手架',
    'scrape_pottery_sherd': '刮削陶片', 'sculk': '幽匿块',
    'sculk_catalyst': '幽匿催发体', 'sculk_sensor': '幽匿感测体',
    'sculk_shrieker': '幽匿尖啸体', 'sculk_vein': '幽匿脉络',
    'sea_lantern': '海晶灯', 'sea_pickle': '海泡菜', 'seagrass': '海草',
    'sentry_armor_trim_smithing_template': '哨兵锻造模板',
    'shaper_armor_trim_smithing_template': '塑造者锻造模板',
    'sheaf_pottery_sherd': '麦穗陶片', 'shears': '剪刀',
    'sheep_spawn_egg': '绵羊刷怪蛋', 'shelter_pottery_sherd': '庇护陶片',
    'shield': '盾牌', 'short_dry_grass': '矮枯草', 'short_grass': '矮草丛',
    'shroomlight': '菌光体', 'shulker_box': '潜影盒',
    'shulker_shell': '潜影壳', 'shulker_spawn_egg': '潜影贝刷怪蛋',
    'silence_armor_trim_smithing_template': '寂静锻造模板',
    'silverfish_spawn_egg': '蠹鱼刷怪蛋',
    'skeleton_horse_spawn_egg': '骷髅马刷怪蛋',
    'skeleton_skull': '骷髅头颅', 'skeleton_spawn_egg': '骷髅刷怪蛋',
    'skull_banner_pattern': '头颅旗帜图案', 'skull_pottery_sherd': '骷髅陶片',
    'slime_ball': '黏液球', 'slime_block': '黏液块',
    'slime_spawn_egg': '史莱姆刷怪蛋', 'small_amethyst_bud': '小型紫水晶芽',
    'small_dripleaf': '小型垂滴叶', 'smithing_table': '锻造台',
    'smoker': '烟熏炉', 'smooth_basalt': '平滑玄武岩',
    'smooth_quartz': '平滑石英块', 'smooth_quartz_slab': '平滑石英台阶',
    'smooth_quartz_stairs': '平滑石英楼梯',
    'smooth_red_sandstone': '平滑红砂岩',
    'smooth_red_sandstone_slab': '平滑红砂岩台阶',
    'smooth_red_sandstone_stairs': '平滑红砂岩楼梯',
    'smooth_sandstone': '平滑砂岩', 'smooth_sandstone_slab': '平滑砂岩台阶',
    'smooth_sandstone_stairs': '平滑砂岩楼梯',
    'smooth_stone': '平滑石头', 'smooth_stone_slab': '平滑石头台阶',
    'sniffer_egg': '嗅探兽蛋', 'sniffer_spawn_egg': '嗅探兽刷怪蛋',
    'snort_pottery_sherd': '喷鼻陶片',
    'snout_armor_trim_smithing_template': '猪鼻锻造模板',
    'snow': '雪', 'snow_block': '雪块',
    'snow_golem_spawn_egg': '雪傀儡刷怪蛋', 'snowball': '雪球',
    'soul_campfire': '灵魂营火', 'soul_lantern': '灵魂灯笼',
    'soul_sand': '灵魂沙', 'soul_soil': '灵魂土', 'soul_torch': '灵魂火把',
    'spawner': '刷怪笼', 'spectral_arrow': '幽灵箭',
    'spider_eye': '蜘蛛眼', 'spider_spawn_egg': '蜘蛛刷怪蛋',
    'spire_armor_trim_smithing_template': '尖塔锻造模板',
    'splash_potion': '喷溅型药水', 'sponge': '海绵',
    'spore_blossom': '孢子花',
    'spruce_boat': '云杉木船', 'spruce_button': '云杉木按钮',
    'spruce_chest_boat': '带箱云杉木船', 'spruce_door': '云杉木门',
    'spruce_fence': '云杉木栅栏', 'spruce_fence_gate': '云杉木栅栏门',
    'spruce_hanging_sign': '云杉木悬挂告示牌', 'spruce_leaves': '云杉树叶',
    'spruce_log': '云杉原木', 'spruce_planks': '云杉木板',
    'spruce_pressure_plate': '云杉木压力板', 'spruce_sapling': '云杉树苗',
    'spruce_shelf': '云杉木书架', 'spruce_sign': '云杉木告示牌',
    'spruce_slab': '云杉木台阶', 'spruce_stairs': '云杉木楼梯',
    'spruce_trapdoor': '云杉木活板门', 'spruce_wood': '云杉木头',
    'spyglass': '望远镜', 'squid_spawn_egg': '鱿鱼刷怪蛋',
    'stick': '木棍', 'sticky_piston': '粘性活塞',
    'stone': '石头', 'stone_axe': '石斧',
    'stone_brick_slab': '石砖台阶', 'stone_brick_stairs': '石砖楼梯',
    'stone_brick_wall': '石砖墙', 'stone_bricks': '石砖',
    'stone_button': '石头按钮', 'stone_hoe': '石锄',
    'stone_pickaxe': '石镐', 'stone_pressure_plate': '石头压力板',
    'stone_shovel': '石铲', 'stone_slab': '石头台阶',
    'stone_stairs': '石头楼梯', 'stone_sword': '石剑',
    'stonecutter': '切石机', 'stray_spawn_egg': '流浪者刷怪蛋',
    'strider_spawn_egg': '炽足兽刷怪蛋', 'string': '线',
    'stripped_acacia_log': '去皮金合欢原木', 'stripped_acacia_wood': '去皮金合欢木头',
    'stripped_bamboo_block': '去皮竹块',
    'stripped_birch_log': '去皮白桦原木', 'stripped_birch_wood': '去皮白桦木头',
    'stripped_cherry_log': '去皮樱花原木', 'stripped_cherry_wood': '去皮樱花木头',
    'stripped_crimson_hyphae': '去皮绯红菌丝体', 'stripped_crimson_stem': '去皮绯红菌茎',
    'stripped_dark_oak_log': '去皮深色橡木原木',
    'stripped_dark_oak_wood': '去皮深色橡木头',
    'stripped_jungle_log': '去皮丛林原木', 'stripped_jungle_wood': '去皮丛林木头',
    'stripped_mangrove_log': '去皮红树原木', 'stripped_mangrove_wood': '去皮红树木头',
    'stripped_oak_log': '去皮橡木原木', 'stripped_oak_wood': '去皮橡木头',
    'stripped_pale_oak_log': '去皮苍白橡木原木',
    'stripped_pale_oak_wood': '去皮苍白橡木头',
    'stripped_spruce_log': '去皮云杉原木', 'stripped_spruce_wood': '去皮云杉木头',
    'stripped_warped_hyphae': '去皮诡异菌丝体', 'stripped_warped_stem': '去皮诡异菌茎',
    'structure_block': '结构方块', 'structure_void': '结构空位',
    'sugar': '糖', 'sugar_cane': '甘蔗', 'sunflower': '向日葵',
    'suspicious_gravel': '可疑的沙砾', 'suspicious_sand': '可疑的沙子',
    'suspicious_stew': '迷之炖菜', 'sweet_berries': '浆果',
    'tadpole_bucket': '桶装蝌蚪', 'tadpole_spawn_egg': '蝌蚪刷怪蛋',
    'tall_dry_grass': '高枯草', 'tall_grass': '高草丛',
    'target': '靶', 'terracotta': '陶瓦',
    'test_block': '测试方块', 'test_instance_block': '测试实例方块',
    'tide_armor_trim_smithing_template': '潮汐锻造模板',
    'tinted_glass': '染色玻璃', 'tipped_arrow': '药水箭',
    'tnt': 'TNT', 'tnt_minecart': 'TNT矿车', 'torch': '火把',
    'torchflower': '火炬花', 'torchflower_seeds': '火炬花种子',
    'totem_of_undying': '不死图腾',
    'trader_llama_spawn_egg': '行商羊驼刷怪蛋', 'trapped_chest': '陷阱箱',
    'trial_key': '试炼钥匙', 'trial_spawner': '试炼刷怪笼',
    'trident': '三叉戟', 'tripwire_hook': '绊线钩',
    'tropical_fish': '热带鱼', 'tropical_fish_bucket': '桶装热带鱼',
    'tropical_fish_spawn_egg': '热带鱼刷怪蛋',
    'tube_coral': '管状珊瑚', 'tube_coral_block': '管状珊瑚块',
    'tube_coral_fan': '管状珊瑚扇',
    'tuff': '凝灰岩', 'tuff_brick_slab': '凝灰岩砖台阶',
    'tuff_brick_stairs': '凝灰岩砖楼梯', 'tuff_brick_wall': '凝灰岩砖墙',
    'tuff_bricks': '凝灰岩砖', 'tuff_slab': '凝灰岩台阶',
    'tuff_stairs': '凝灰岩楼梯', 'tuff_wall': '凝灰岩墙',
    'turtle_egg': '海龟蛋', 'turtle_helmet': '海龟壳',
    'turtle_scute': '海龟鳞甲', 'turtle_spawn_egg': '海龟刷怪蛋',
    'twisting_vines': '缠怨藤', 'vault': '宝库',
    'verdant_froglight': '翠绿蛙明石',
    'vex_armor_trim_smithing_template': '恼鬼锻造模板',
    'vex_spawn_egg': '恼鬼刷怪蛋', 'villager_spawn_egg': '村民刷怪蛋',
    'vindicator_spawn_egg': '卫道士刷怪蛋', 'vine': '藤蔓',
    'wandering_trader_spawn_egg': '流浪商人刷怪蛋',
    'ward_armor_trim_smithing_template': '守护锻造模板',
    'warden_spawn_egg': '监守者刷怪蛋',
    'warped_button': '诡异菌按钮', 'warped_door': '诡异菌门',
    'warped_fence': '诡异菌栅栏', 'warped_fence_gate': '诡异菌栅栏门',
    'warped_fungus': '诡异菌', 'warped_fungus_on_a_stick': '诡异菌鱼竿',
    'warped_hanging_sign': '诡异菌悬挂告示牌', 'warped_hyphae': '诡异菌丝体',
    'warped_nylium': '诡异菌岩', 'warped_planks': '诡异菌木板',
    'warped_pressure_plate': '诡异菌压力板', 'warped_roots': '诡异菌根',
    'warped_shelf': '诡异菌书架', 'warped_sign': '诡异菌告示牌',
    'warped_slab': '诡异菌台阶', 'warped_stairs': '诡异菌楼梯',
    'warped_stem': '诡异菌茎', 'warped_trapdoor': '诡异菌活板门',
    'warped_wart_block': '诡异疣块', 'water_bucket': '水桶',
    'waxed_chiseled_copper': '涂蜡雕纹铜块',
    'waxed_copper_bars': '涂蜡铜栏杆', 'waxed_copper_block': '涂蜡铜块',
    'waxed_copper_bulb': '涂蜡铜灯泡', 'waxed_copper_chain': '涂蜡铜链',
    'waxed_copper_chest': '涂蜡铜箱子', 'waxed_copper_door': '涂蜡铜门',
    'waxed_copper_golem_statue': '涂蜡铜傀儡雕像',
    'waxed_copper_grate': '涂蜡铜格栅', 'waxed_copper_lantern': '涂蜡铜灯笼',
    'waxed_copper_trapdoor': '涂蜡铜活板门',
    'waxed_cut_copper': '涂蜡切制铜块',
    'waxed_cut_copper_slab': '涂蜡切制铜台阶',
    'waxed_cut_copper_stairs': '涂蜡切制铜楼梯',
    'waxed_exposed_chiseled_copper': '涂蜡轻微氧化雕纹铜块',
    'waxed_exposed_copper': '涂蜡轻微氧化铜块',
    'waxed_exposed_copper_bars': '涂蜡轻微氧化铜栏杆',
    'waxed_exposed_copper_bulb': '涂蜡轻微氧化铜灯泡',
    'waxed_exposed_copper_chain': '涂蜡轻微氧化铜链',
    'waxed_exposed_copper_chest': '涂蜡轻微氧化铜箱子',
    'waxed_exposed_copper_door': '涂蜡轻微氧化铜门',
    'waxed_exposed_copper_golem_statue': '涂蜡轻微氧化铜傀儡雕像',
    'waxed_exposed_copper_grate': '涂蜡轻微氧化铜格栅',
    'waxed_exposed_copper_lantern': '涂蜡轻微氧化铜灯笼',
    'waxed_exposed_copper_trapdoor': '涂蜡轻微氧化铜活板门',
    'waxed_exposed_cut_copper': '涂蜡轻微氧化切制铜块',
    'waxed_exposed_cut_copper_slab': '涂蜡轻微氧化切制铜台阶',
    'waxed_exposed_cut_copper_stairs': '涂蜡轻微氧化切制铜楼梯',
    'waxed_exposed_lightning_rod': '涂蜡轻微氧化避雷针',
    'waxed_lightning_rod': '涂蜡避雷针',
    'waxed_oxidized_chiseled_copper': '涂蜡氧化雕纹铜块',
    'waxed_oxidized_copper': '涂蜡氧化铜块',
    'waxed_oxidized_copper_bars': '涂蜡氧化铜栏杆',
    'waxed_oxidized_copper_bulb': '涂蜡氧化铜灯泡',
    'waxed_oxidized_copper_chain': '涂蜡氧化铜链',
    'waxed_oxidized_copper_chest': '涂蜡氧化铜箱子',
    'waxed_oxidized_copper_door': '涂蜡氧化铜门',
    'waxed_oxidized_copper_golem_statue': '涂蜡氧化铜傀儡雕像',
    'waxed_oxidized_copper_grate': '涂蜡氧化铜格栅',
    'waxed_oxidized_copper_lantern': '涂蜡氧化铜灯笼',
    'waxed_oxidized_copper_trapdoor': '涂蜡氧化铜活板门',
    'waxed_oxidized_cut_copper': '涂蜡氧化切制铜块',
    'waxed_oxidized_cut_copper_slab': '涂蜡氧化切制铜台阶',
    'waxed_oxidized_cut_copper_stairs': '涂蜡氧化切制铜楼梯',
    'waxed_oxidized_lightning_rod': '涂蜡氧化避雷针',
    'waxed_weathered_chiseled_copper': '涂蜡部分氧化雕纹铜块',
    'waxed_weathered_copper': '涂蜡部分氧化铜块',
    'waxed_weathered_copper_bars': '涂蜡部分氧化铜栏杆',
    'waxed_weathered_copper_bulb': '涂蜡部分氧化铜灯泡',
    'waxed_weathered_copper_chain': '涂蜡部分氧化铜链',
    'waxed_weathered_copper_chest': '涂蜡部分氧化铜箱子',
    'waxed_weathered_copper_door': '涂蜡部分氧化铜门',
    'waxed_weathered_copper_golem_statue': '涂蜡部分氧化铜傀儡雕像',
    'waxed_weathered_copper_grate': '涂蜡部分氧化铜格栅',
    'waxed_weathered_copper_lantern': '涂蜡部分氧化铜灯笼',
    'waxed_weathered_copper_trapdoor': '涂蜡部分氧化铜活板门',
    'waxed_weathered_cut_copper': '涂蜡部分氧化切制铜块',
    'waxed_weathered_cut_copper_slab': '涂蜡部分氧化切制铜台阶',
    'waxed_weathered_cut_copper_stairs': '涂蜡部分氧化切制铜楼梯',
    'waxed_weathered_lightning_rod': '涂蜡部分氧化避雷针',
    'wayfinder_armor_trim_smithing_template': '寻路者锻造模板',
    'weathered_chiseled_copper': '部分氧化雕纹铜块',
    'weathered_copper': '部分氧化铜块',
    'weathered_copper_bars': '部分氧化铜栏杆',
    'weathered_copper_bulb': '部分氧化铜灯泡',
    'weathered_copper_chain': '部分氧化铜链',
    'weathered_copper_chest': '部分氧化铜箱子',
    'weathered_copper_door': '部分氧化铜门',
    'weathered_copper_golem_statue': '部分氧化铜傀儡雕像',
    'weathered_copper_grate': '部分氧化铜格栅',
    'weathered_copper_lantern': '部分氧化铜灯笼',
    'weathered_copper_trapdoor': '部分氧化铜活板门',
    'weathered_cut_copper': '部分氧化切制铜块',
    'weathered_cut_copper_slab': '部分氧化切制铜台阶',
    'weathered_cut_copper_stairs': '部分氧化切制铜楼梯',
    'weathered_lightning_rod': '部分氧化避雷针',
    'weeping_vines': '垂泪藤', 'wet_sponge': '湿海绵',
    'wheat': '小麦', 'wheat_seeds': '小麦种子',
    'white_banner': '白色旗帜', 'white_bed': '白色床',
    'white_bundle': '白色收纳袋', 'white_candle': '白色蜡烛',
    'white_carpet': '白色地毯', 'white_concrete': '白色混凝土',
    'white_concrete_powder': '白色混凝土粉末', 'white_dye': '白色染料',
    'white_glazed_terracotta': '白色釉陶', 'white_harness': '白色马铠',
    'white_shulker_box': '白色潜影盒', 'white_stained_glass': '白色染色玻璃',
    'white_stained_glass_pane': '白色染色玻璃板',
    'white_terracotta': '白色陶瓦', 'white_tulip': '白色郁金香',
    'white_wool': '白色羊毛',
    'wild_armor_trim_smithing_template': '野性锻造模板',
    'wildflowers': '野花', 'wind_charge': '风弹',
    'witch_spawn_egg': '女巫刷怪蛋', 'wither_rose': '凋灵玫瑰',
    'wither_skeleton_skull': '凋灵骷髅头颅',
    'wither_skeleton_spawn_egg': '凋灵骷髅刷怪蛋',
    'wither_spawn_egg': '凋灵刷怪蛋', 'wolf_armor': '狼铠',
    'wolf_spawn_egg': '狼刷怪蛋', 'wooden_axe': '木斧',
    'wooden_hoe': '木锄', 'wooden_pickaxe': '木镐',
    'wooden_shovel': '木铲', 'wooden_sword': '木剑',
    'writable_book': '书与笔', 'written_book': '成书',
    'yellow_banner': '黄色旗帜', 'yellow_bed': '黄色床',
    'yellow_bundle': '黄色收纳袋', 'yellow_candle': '黄色蜡烛',
    'yellow_carpet': '黄色地毯', 'yellow_concrete': '黄色混凝土',
    'yellow_concrete_powder': '黄色混凝土粉末', 'yellow_dye': '黄色染料',
    'yellow_glazed_terracotta': '黄色釉陶', 'yellow_harness': '黄色马铠',
    'yellow_shulker_box': '黄色潜影盒', 'yellow_stained_glass': '黄色染色玻璃',
    'yellow_stained_glass_pane': '黄色染色玻璃板',
    'yellow_terracotta': '黄色陶瓦', 'yellow_wool': '黄色羊毛',
    'zoglin_spawn_egg': '嗤灵刷怪蛋', 'zombie_head': '僵尸头颅',
    'zombie_horse_spawn_egg': '僵尸马刷怪蛋',
    'zombie_spawn_egg': '僵尸刷怪蛋',
    'zombie_villager_spawn_egg': '僵尸村民刷怪蛋',
    'zombified_piglin_spawn_egg': '僵尸猪灵刷怪蛋',
}

def get_zh_name(en_name):
    return ITEM_NAMES_ZH.get(en_name, en_name)

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
def render_pindou(grid, colors_by_code, board_size=20, display_name=''):
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

    title_text = f'{display_name}拼豆图纸  ({board_size} x {board_size})' if display_name else f'拼豆图纸  ({board_size} x {board_size})'
    draw.text((margin, round(title_h * 0.25)),
              title_text,
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
                cx_cell = x0 + cell_px // 2
                cy_cell = y0 + cell_px // 2
                draw.text((cx_cell, cy_cell), code, fill=tc, font=font_code, anchor='mm')

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

    # 四周编号（用 anchor 精确对齐，避免 bbox 偏移问题）
    for i in range(board_size):
        cx = gx0 + i * cell_px + cell_px // 2
        cy = gy0 + i * cell_px + cell_px // 2
        label = str(i + 1)
        draw.text((cx, gy0 - 6),  label, fill=(80, 80, 80), font=font_num, anchor='mb')
        draw.text((cx, gy1 + 6),  label, fill=(80, 80, 80), font=font_num, anchor='mt')
        draw.text((gx0 - 6, cy),  label, fill=(80, 80, 80), font=font_num, anchor='rm')
        draw.text((gx1 + 6, cy),  label, fill=(80, 80, 80), font=font_num, anchor='lm')

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
    display_name = get_zh_name(name)
    img = Image.open(img_path)
    grid = image_to_grid(img, palette, grid_size=grid_size, quantize_colors=quantize)

    pindou_img    = render_pindou(grid, colors_by_code, board_size=20, display_name=display_name)
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
        'display_name': display_name,
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

# ── 汇总统计 ─────────────────────────────────────────────────────
def aggregate_stats(colors_by_code):
    cats = [d for d in os.listdir(OUTPUT_DIR) if os.path.isdir(os.path.join(OUTPUT_DIR, d))]
    summary = {}  # cat -> {code: count}
    global_counts = Counter()

    for cat in sorted(cats):
        cat_dir = os.path.join(OUTPUT_DIR, cat)
        cat_counts = Counter()
        for fname in os.listdir(cat_dir):
            if not fname.endswith('.json'):
                continue
            with open(os.path.join(cat_dir, fname), encoding='utf-8') as f:
                data = json.load(f)
            for m in data.get('materials', []):
                cat_counts[m['code']] += m['count']
                global_counts[m['code']] += m['count']
        summary[cat] = dict(cat_counts)

    def make_items(counts):
        total = sum(counts.values())
        items = []
        for code, count in sorted(counts.items()):  # 按色号字母排序
            info = colors_by_code.get(code, {})
            items.append({
                'code': code,
                'name': info.get('name', ''),
                'rgb': list(info['rgb']) if info else [200, 200, 200],
                'count': count,
                'pct': round(count / total * 100, 1) if total else 0,
            })
        return items, total

    out = {'categories': {}, 'global': {}}
    for cat, counts in summary.items():
        items, total = make_items(counts)
        out['categories'][cat] = {'total_beads': total, 'color_count': len(counts), 'materials': items}
    g_items, g_total = make_items(global_counts)
    out['global'] = {'total_beads': g_total, 'color_count': len(global_counts), 'materials': g_items}

    json_path = os.path.join(OUTPUT_DIR, 'summary.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f'  saved {json_path}')

    # 全局汇总：多列布局（A-Z 从上到下，满列换下一列）
    _render_multicolumn_img(g_items, g_total, '拼豆用料总汇总',
                            os.path.join(OUTPUT_DIR, '_summary.png'))

    # 每个分类：各自单列
    for cat, cat_data in out['categories'].items():
        _render_singlecolumn_img(cat_data['materials'], cat_data['total_beads'], cat,
                                 os.path.join(OUTPUT_DIR, cat, '_summary.png'))

    print('  summary images done')

def _col_layout(img, draw, items, total, title, img_w, fonts, n_cols,
                hdr_h=None, col_hdr_h=None, show_name=True):
    """通用多列布局绘制：A-Z 从上到下，满列换下一列
    show_name=False 时只渲染 色块+色号+数量（适合横幅密排）"""
    font_title, font_head, font_body = fonts
    fs_body = font_body.size

    col_w     = img_w // n_cols
    pad       = round(col_w * 0.1)
    if hdr_h is None:
        hdr_h = round(img_w * 0.088)
    if col_hdr_h is None:
        col_hdr_h = round(img_w * 0.058)
    swatch_sz = round(col_w * 0.12)
    row_h     = round(col_w * 0.175)

    rows_per_col = -(-len(items) // n_cols)
    img_h = hdr_h + col_hdr_h + rows_per_col * row_h + pad

    img  = Image.new('RGB', (img_w, img_h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    draw.text((pad, round(hdr_h * 0.25)),
              f'{title}  ({len(items)} 种颜色，{total} 颗)',
              fill=(40, 40, 40), font=font_title)

    # 列标题
    y0 = hdr_h
    draw.rectangle([0, y0, img_w, y0 + col_hdr_h], fill=(235, 235, 235))
    for c in range(n_cols):
        cx   = c * col_w
        hy   = y0 + round(col_hdr_h * 0.22)
        r_pad = round(col_w * 0.04)
        if show_name:
            sw_  = round(col_w * 0.02)
            fc_  = round(col_w * 0.16)
            fn_  = round(col_w * 0.40)
            fct_ = round(col_w * 0.78)
            for label, dx in [('色块', sw_), ('色号', fc_), ('名称', fn_), ('数量', fct_)]:
                draw.text((cx + dx, hy), label, fill=(100, 100, 100), font=font_head)
        else:
            fc_  = round(col_w * 0.20)
            draw.text((cx + fc_,  hy), '色号', fill=(100, 100, 100), font=font_head)
            draw.text((cx + col_w - r_pad, hy), '数量',
                      fill=(100, 100, 100), font=font_head, anchor='rm')
        if c > 0:
            draw.line([cx, y0, cx, y0 + col_hdr_h], fill=(210, 210, 210))
    draw.line([0, y0 + col_hdr_h, img_w, y0 + col_hdr_h], fill=(200, 200, 200))

    # 数据行
    for i, m in enumerate(items):
        col    = i // rows_per_col
        row    = i %  rows_per_col
        cx     = col * col_w
        y      = y0 + col_hdr_h + row * row_h
        bg     = (250, 250, 250) if row % 2 == 0 else (255, 255, 255)

        draw.rectangle([cx, y, cx + col_w, y + row_h], fill=bg)
        if col > 0:
            draw.line([cx, y, cx, y + row_h], fill=(220, 220, 220))

        fill  = tuple(m['rgb'])
        cy_sw = y + (row_h - swatch_sz) // 2
        ty    = y + (row_h - fs_body) // 2 - 2
        r_pad = round(col_w * 0.04)

        if show_name:
            sw  = round(col_w * 0.02)
            fc  = round(col_w * 0.16)
            fn  = round(col_w * 0.40)
            fct = round(col_w * 0.78)
            draw.rounded_rectangle(
                [cx + sw, cy_sw, cx + sw + swatch_sz, cy_sw + swatch_sz],
                radius=3, fill=fill, outline=(180, 180, 180))
            draw.text((cx + fc,  ty), m['code'],         fill=(30, 30, 30), font=font_body)
            draw.text((cx + fn,  ty), m.get('name', ''), fill=(60, 60, 60), font=font_body)
            draw.text((cx + fct, ty), str(m['count']),   fill=(30, 30, 30), font=font_body)
        else:
            sw = round(col_w * 0.03)
            fc = round(col_w * 0.20)
            draw.rounded_rectangle(
                [cx + sw, cy_sw, cx + sw + swatch_sz, cy_sw + swatch_sz],
                radius=3, fill=fill, outline=(180, 180, 180))
            draw.text((cx + fc, ty), m['code'], fill=(30, 30, 30), font=font_body)
            draw.text((cx + col_w - r_pad, ty), str(m['count']),
                      fill=(30, 30, 30), font=font_body, anchor='rm')

        draw.line([cx, y + row_h, cx + col_w, y + row_h], fill=(235, 235, 235))

    return img

def _make_fonts(img_w, col_w):
    fs_title = round(img_w * 0.036)
    fs_body  = round(col_w * 0.13)
    try:
        font_title = ImageFont.truetype(FONT_PATH, fs_title)
        font_head  = ImageFont.truetype(FONT_PATH, fs_body)
        font_body  = ImageFont.truetype(FONT_PATH, fs_body)
    except:
        font_title = font_head = font_body = ImageFont.load_default()
    return font_title, font_head, font_body

def _render_multicolumn_img(items, total, title, out_path):
    """全局汇总：横幅，色块+色号+数量，宽:高≈2:1"""
    col_w = 300
    for n_cols in range(4, 20):
        img_w     = col_w * n_cols
        hdr_h     = round(col_w * 0.7)
        col_hdr_h = round(col_w * 0.35)
        row_h     = round(col_w * 0.175)
        rows_per_col = -(-len(items) // n_cols)
        est_h     = hdr_h + col_hdr_h + rows_per_col * row_h
        if img_w >= est_h * 1.8 or n_cols == 19:
            break
    fonts = _make_fonts(img_w, col_w)
    img = _col_layout(None, None, items, total, title, img_w, fonts, n_cols,
                      hdr_h=hdr_h, col_hdr_h=col_hdr_h, show_name=False)
    img.save(out_path)

def _render_singlecolumn_img(items, total, title, out_path):
    """分类汇总：单列"""
    img_w  = PHONE_W
    col_w  = img_w
    fonts  = _make_fonts(img_w, col_w)
    img = _col_layout(None, None, items, total, title, img_w, fonts, 1)
    img.save(out_path)

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

    if not args.file:
        print('\naggregating stats...')
        aggregate_stats(colors_by_code)

    print('\nall done!')


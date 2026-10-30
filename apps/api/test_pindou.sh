#!/bin/bash
set -e

BASE="http://localhost:8787"
PHONE="13900001234"
PASS="test1234"

echo "=== 注册/登录 ==="
TOKEN=$(curl -s -X POST "$BASE/api/app/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\"}" | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "登录失败，尝试注册..."
  TOKEN=$(curl -s -X POST "$BASE/api/app/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\",\"name\":\"测试用户\"}" | jq -r '.data.token')
fi
echo "Token: ${TOKEN:0:20}..."

AUTH="-H \"Authorization: Bearer $TOKEN\""

echo ""
echo "=== 收藏：添加单条 ==="
curl -s -X POST "$BASE/api/pindou/wishlist" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cat":"animals","name":"cat_01","display_name":"小猫"}' | jq .

echo ""
echo "=== 收藏：批量添加 ==="
curl -s -X POST "$BASE/api/pindou/wishlist/batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"cat":"animals","name":"dog_01","display_name":"小狗"},{"cat":"animals","name":"bird_01","display_name":"小鸟"}]}' | jq .

echo ""
echo "=== 收藏：获取全部 ==="
curl -s "$BASE/api/pindou/wishlist" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 收藏：删除单条 ==="
curl -s -X DELETE "$BASE/api/pindou/wishlist/animals/cat_01" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 收藏：删除整个分类 ==="
curl -s -X DELETE "$BASE/api/pindou/wishlist/animals" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 收藏：确认已清空 ==="
curl -s "$BASE/api/pindou/wishlist" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 已拼：标记 ==="
curl -s -X POST "$BASE/api/pindou/done" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cat":"animals","name":"cat_01","display_name":"小猫","done_at":1700000000000}' | jq .

echo ""
echo "=== 已拼：获取全部 ==="
curl -s "$BASE/api/pindou/done" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 已拼：取消 ==="
curl -s -X DELETE "$BASE/api/pindou/done/animals/cat_01" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 已拼：确认已清空 ==="
curl -s "$BASE/api/pindou/done" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 库存：设置色号 ==="
curl -s -X PUT "$BASE/api/pindou/inventory/221/A01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count":50}' | jq .

curl -s -X PUT "$BASE/api/pindou/inventory/221/B02" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count":30}' | jq .

echo ""
echo "=== 库存：获取色板 ==="
curl -s "$BASE/api/pindou/inventory/221" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 库存：设为 0 删除 ==="
curl -s -X PUT "$BASE/api/pindou/inventory/221/A01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count":0}' | jq .

echo ""
echo "=== 库存：确认 A01 已删除 ==="
curl -s "$BASE/api/pindou/inventory/221" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 库存：清空色板 ==="
curl -s -X DELETE "$BASE/api/pindou/inventory/221" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 库存：确认已清空 ==="
curl -s "$BASE/api/pindou/inventory/221" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 全部测试完成 ==="

#!/bin/bash
# 测试 app 用户体系和 KV 存储 API
# 使用前先启动本地服务: cd apps/api && npx wrangler dev
# 然后运行: bash test.sh

BASE="http://localhost:8787"
PHONE="13800001234"
PASSWORD="test123456"
NAME="测试用户"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; echo "  响应: $2"; }

echo "=== 注册 ==="

# 注册成功
RES=$(curl -s -X POST "$BASE/api/app/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASSWORD\",\"name\":\"$NAME\"}")
TOKEN=$(echo $RES | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$TOKEN" ]; then pass "注册成功，获取 token"; else fail "注册失败" "$RES"; exit 1; fi

# 重复注册
RES=$(curl -s -X POST "$BASE/api/app/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASSWORD\"}")
if echo $RES | grep -q "已注册"; then pass "重复注册返回错误"; else fail "重复注册应返回错误" "$RES"; fi

# 手机号格式错误
RES=$(curl -s -X POST "$BASE/api/app/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"phone":"12345","password":"test123456"}')
if echo $RES | grep -q "error"; then pass "无效手机号返回错误"; else fail "无效手机号应返回错误" "$RES"; fi

# 密码太短
RES=$(curl -s -X POST "$BASE/api/app/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900001234","password":"123"}')
if echo $RES | grep -q "error"; then pass "密码太短返回错误"; else fail "密码太短应返回错误" "$RES"; fi

echo ""
echo "=== 登录 ==="

# 登录成功
RES=$(curl -s -X POST "$BASE/api/app/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo $RES | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$TOKEN" ]; then pass "登录成功，获取 token"; else fail "登录失败" "$RES"; exit 1; fi

# 密码错误
RES=$(curl -s -X POST "$BASE/api/app/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"wrongpass\"}")
if echo $RES | grep -q "error"; then pass "密码错误返回 401"; else fail "密码错误应返回错误" "$RES"; fi

# 用户不存在
RES=$(curl -s -X POST "$BASE/api/app/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13999999999","password":"test123456"}')
if echo $RES | grep -q "error"; then pass "用户不存在返回错误"; else fail "用户不存在应返回错误" "$RES"; fi

echo ""
echo "=== 用户信息 ==="

# 获取用户信息
RES=$(curl -s -X GET "$BASE/api/app/auth/me" \
  -H "Authorization: Bearer $TOKEN")
if echo $RES | grep -q "$PHONE"; then pass "获取用户信息成功"; else fail "获取用户信息失败" "$RES"; fi

# 修改用户名
RES=$(curl -s -X PUT "$BASE/api/app/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"新用户名"}')
if echo $RES | grep -q "新用户名"; then pass "修改用户名成功"; else fail "修改用户名失败" "$RES"; fi

# 无 token 访问
RES=$(curl -s -X GET "$BASE/api/app/auth/me")
if echo $RES | grep -q "Unauthorized"; then pass "无 token 返回 401"; else fail "无 token 应返回 401" "$RES"; fi

echo ""
echo "=== KV 存储 ==="

# 写入 key
RES=$(curl -s -X PUT "$BASE/api/store/pindou/poem_queue" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"[1,2,3]"}')
if echo $RES | grep -q "ok"; then pass "写入 key 成功"; else fail "写入 key 失败" "$RES"; fi

# 读取 key
RES=$(curl -s -X GET "$BASE/api/store/pindou/poem_queue" \
  -H "Authorization: Bearer $TOKEN")
if echo $RES | grep -q '\[1,2,3\]'; then pass "读取 key 成功"; else fail "读取 key 失败" "$RES"; fi

# 覆写 key
RES=$(curl -s -X PUT "$BASE/api/store/pindou/poem_queue" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"[4,5,6]"}')
RES=$(curl -s -X GET "$BASE/api/store/pindou/poem_queue" \
  -H "Authorization: Bearer $TOKEN")
if echo $RES | grep -q '\[4,5,6\]'; then pass "覆写 key 成功"; else fail "覆写 key 失败" "$RES"; fi

# 写入另一个 key
curl -s -X PUT "$BASE/api/store/pindou/wishlist" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"{\"items\":[]}"}' > /dev/null

# 读取整个 app
RES=$(curl -s -X GET "$BASE/api/store/pindou" \
  -H "Authorization: Bearer $TOKEN")
if echo $RES | grep -q "poem_queue" && echo $RES | grep -q "wishlist"; then pass "读取 app 全量数据成功"; else fail "读取 app 全量数据失败" "$RES"; fi

# 不同 app 数据隔离
curl -s -X PUT "$BASE/api/store/study/poem_queue" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"[99]"}' > /dev/null
RES=$(curl -s -X GET "$BASE/api/store/pindou" \
  -H "Authorization: Bearer $TOKEN")
STUDY_RES=$(curl -s -X GET "$BASE/api/store/study" \
  -H "Authorization: Bearer $TOKEN")
if echo $STUDY_RES | grep -q "99" && ! echo $RES | grep -q "99"; then pass "不同 app 数据隔离正常"; else fail "app 数据隔离异常" "pindou:$RES study:$STUDY_RES"; fi

# 删除 key
RES=$(curl -s -X DELETE "$BASE/api/store/pindou/poem_queue" \
  -H "Authorization: Bearer $TOKEN")
if echo $RES | grep -q "ok"; then pass "删除 key 成功"; else fail "删除 key 失败" "$RES"; fi

RES=$(curl -s -X GET "$BASE/api/store/pindou/poem_queue" \
  -H "Authorization: Bearer $TOKEN")
if echo $RES | grep -q '"data":null'; then pass "删除后读取返回 null"; else fail "删除后读取应返回 null" "$RES"; fi

# 无 token 访问 store
RES=$(curl -s -X GET "$BASE/api/store/pindou/poem_queue")
if echo $RES | grep -q "Unauthorized"; then pass "无 token 访问 store 返回 401"; else fail "无 token 访问 store 应返回 401" "$RES"; fi

echo ""
echo "=== 完成 ==="

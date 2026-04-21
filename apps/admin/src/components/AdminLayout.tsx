import { Layout, Menu, Avatar, Dropdown, Space, Typography, Breadcrumb } from 'antd'
import {
  DashboardOutlined,
  BookOutlined,
  TagsOutlined,
  UserOutlined,
  HomeOutlined,
  BarChartOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom'
import { useAdminAuth } from '../store/auth'

const { Sider, Header, Content } = Layout

const NAV_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/recipes', icon: <BookOutlined />, label: '菜谱管理' },
  { key: '/enums', icon: <TagsOutlined />, label: '枚举管理' },
  { key: '/users', icon: <UserOutlined />, label: '用户列表' },
  { key: '/families', icon: <HomeOutlined />, label: '家庭列表' },
  { key: '/analytics', icon: <BarChartOutlined />, label: '推荐分析' },
]

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/recipes': '菜谱管理',
  '/recipes/new': '新建菜谱',
  '/enums': '枚举管理',
  '/users': '用户列表',
  '/families': '家庭列表',
  '/analytics': '推荐分析',
}

function getBreadcrumbs(pathname: string) {
  const items: { title: React.ReactNode }[] = [
    { title: <Link to="/dashboard">首页</Link> },
  ]

  if (pathname === '/dashboard') return items

  // 处理 /recipes/:id/edit
  const editMatch = pathname.match(/^\/recipes\/(\d+)\/edit$/)
  if (editMatch) {
    items.push({ title: <Link to="/recipes">菜谱管理</Link> })
    items.push({ title: '编辑菜谱' })
    return items
  }

  const label = ROUTE_LABELS[pathname]
  if (label) {
    // 子页面补充父级
    if (pathname === '/recipes/new') {
      items.push({ title: <Link to="/recipes">菜谱管理</Link> })
    }
    items.push({ title: label })
  }

  return items
}

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey = NAV_ITEMS.find(item => location.pathname.startsWith(item.key))?.key ?? '/dashboard'
  const breadcrumbs = getBreadcrumbs(location.pathname)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220} style={{ position: 'fixed', height: '100vh', left: 0, top: 0, bottom: 0, zIndex: 100 }}>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 16,
          fontWeight: 600,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          letterSpacing: 1,
        }}>
          今日膳 管理后台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={NAV_ITEMS}
          style={{ borderRight: 0, marginTop: 8 }}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout style={{ marginLeft: 220 }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <Breadcrumb items={breadcrumbs} />
          <Dropdown
            menu={{
              items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true }],
              onClick: ({ key }) => { if (key === 'logout') handleLogout() },
            }}
            placement="bottomRight"
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ background: '#e67e22' }} />
              <Typography.Text>{admin?.username}</Typography.Text>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minHeight: 'calc(100vh - 112px)' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

import { useState } from 'react'
import { ProLayout } from '@ant-design/pro-components'
import { Avatar, Dropdown, Space, Typography } from 'antd'
import {
  DashboardOutlined, BookOutlined, TagsOutlined,
  UserOutlined, HomeOutlined, BarChartOutlined, LogoutOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../store/auth'

const SERIF = "ui-serif, 'Songti SC', 'Noto Serif CJK SC', serif"

const FullLogo = (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1, color: '#fff' }}>膳</span>
    <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,.2)' }} />
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 18, padding: '1px 0' }}>
      <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 10, color: 'rgba(255,255,255,.55)', letterSpacing: '0.05em', lineHeight: 1 }}>/ shàn /</span>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.25em', color: '#fff', lineHeight: 1 }}>JINRI</span>
    </div>
  </div>
)

const MiniLogo = (
  <span style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1, color: '#fff' }}>膳</span>
)

const route = {
  path: '/',
  routes: [
    { path: '/dashboard', name: '仪表盘' },
    { path: '/recipes',   name: '菜谱管理' },
    { path: '/enums',     name: '枚举管理' },
    { path: '/users',     name: '用户列表' },
    { path: '/families',  name: '家庭列表' },
    { path: '/analytics', name: '推荐分析' },
  ],
}

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/recipes',   icon: <BookOutlined />,      label: '菜谱管理' },
  { key: '/enums',     icon: <TagsOutlined />,      label: '枚举管理' },
  { key: '/users',     icon: <UserOutlined />,      label: '用户列表' },
  { key: '/families',  icon: <HomeOutlined />,      label: '家庭列表' },
  { key: '/analytics', icon: <BarChartOutlined />,  label: '推荐分析' },
]

const layoutToken = {
  header: {
    colorBgHeader: '#141414',
    colorHeaderTitle: '#fff',
  },
  sider: {
    colorMenuBackground: '#141414',
    colorBgMenuItemSelected: '#e67e22',
    colorTextMenuSelected: '#fff',
    colorTextMenu: 'rgba(255,255,255,.75)',
    colorTextMenuItemHover: '#fff',
    colorTextMenuTitle: '#fff',
  },
}

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <ProLayout
      title={false}
      logo={collapsed ? MiniLogo : FullLogo}
      collapsed={collapsed}
      onCollapse={setCollapsed}
      route={route}
      token={layoutToken}
      location={location}
      menuProps={{
        items: menuItems,
        selectedKeys: [location.pathname],
        onClick: ({ key }) => navigate(key),
        theme: 'dark',
      }}
      avatarProps={{
        render: () => (
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
        ),
      }}
    >
      <Outlet />
    </ProLayout>
  )
}

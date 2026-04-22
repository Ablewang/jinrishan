import { ProLayout } from '@ant-design/pro-components'
import { Avatar, Dropdown, Space, Typography } from 'antd'
import {
  DashboardOutlined, BookOutlined, TagsOutlined,
  UserOutlined, HomeOutlined, BarChartOutlined, LogoutOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../store/auth'

const SiderLogo = (
  <span style={{
    fontFamily: "ui-serif, 'Songti SC', 'Noto Serif CJK SC', serif",
    fontSize: 24, lineHeight: 1, color: '#fff',
  }}>膳</span>
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

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <ProLayout
      title="JINRI"
      logo={SiderLogo}
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

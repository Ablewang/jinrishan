import { ProLayout } from '@ant-design/pro-components'
import { Avatar, Dropdown, Space, Typography } from 'antd'
import {
  DashboardOutlined, BookOutlined, TagsOutlined,
  UserOutlined, HomeOutlined, BarChartOutlined, LogoutOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../store/auth'

const route = {
  path: '/',
  routes: [
    { path: '/dashboard', name: '仪表盘', icon: <DashboardOutlined /> },
    { path: '/recipes', name: '菜谱管理', icon: <BookOutlined /> },
    { path: '/enums', name: '枚举管理', icon: <TagsOutlined /> },
    { path: '/users', name: '用户列表', icon: <UserOutlined /> },
    { path: '/families', name: '家庭列表', icon: <HomeOutlined /> },
    { path: '/analytics', name: '推荐分析', icon: <BarChartOutlined /> },
  ],
}


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
      title="今日膳管理"
      logo={false}
      route={route}
      location={location}
      token={layoutToken}
      menuProps={{
        selectedKeys: [location.pathname],
        onClick: ({ key }) => navigate(key),
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

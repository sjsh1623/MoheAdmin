import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

const navItems = [
  { path: '/monitor', label: 'Dashboard', icon: 'D', end: true },
  { path: '/monitor/pipeline', label: '파이프라인', icon: '⚙' },
  { path: '/monitor/analytics', label: '방문자 분석', icon: '📊' },
  { path: '/monitor/batch', label: 'Batch Monitor', icon: 'B' },
  { path: '/monitor/logs', label: 'Docker Logs', icon: 'L' },
  { path: '/monitor/places', label: 'Places', icon: 'P' },
  { path: '/monitor/crawling', label: '크롤링 지도', icon: 'C' },
]

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h1>Mohe Admin</h1>
      </div>
      <nav className={styles.nav}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

import { useLocation } from 'react-router-dom'
import styles from './Header.module.css'

const pageTitle = {
  '/monitor': 'Dashboard',
  '/monitor/batch': 'Batch Monitor',
  '/monitor/places': 'Places Management',
}

export default function Header() {
  const location = useLocation()
  const title = pageTitle[location.pathname] || 'Admin'

  return (
    <header className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.actions}>
        <span className={styles.status}>System Online</span>
      </div>
    </header>
  )
}

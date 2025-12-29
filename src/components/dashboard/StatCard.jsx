import Card from '../ui/Card'
import styles from './StatCard.module.css'

export default function StatCard({ title, value, subtitle, color = 'primary', icon }) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>
      <div className={`${styles.value} ${styles[color]}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </Card>
  )
}

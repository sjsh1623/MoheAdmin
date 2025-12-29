import Card from '../ui/Card'
import styles from './WorkerCard.module.css'

export default function WorkerCard({ worker }) {
  const isOnline = worker.status === 'RUNNING'

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={`${styles.status} ${isOnline ? styles.online : styles.offline}`} />
        <span className={styles.id}>{worker.workerId}</span>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>Processed</span>
          <span className={styles.value}>{worker.processedCount || 0}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Failed</span>
          <span className={`${styles.value} ${styles.failed}`}>{worker.failedCount || 0}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Threads</span>
          <span className={styles.value}>{worker.threads || 0}</span>
        </div>
      </div>
      {worker.currentTask && (
        <div className={styles.task}>
          <span className={styles.taskLabel}>Current:</span>
          <span className={styles.taskValue}>{worker.currentTask}</span>
        </div>
      )}
    </Card>
  )
}

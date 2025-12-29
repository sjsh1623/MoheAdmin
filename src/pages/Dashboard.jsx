import { useState, useEffect } from 'react'
import StatCard from '../components/dashboard/StatCard'
import WorkerCard from '../components/dashboard/WorkerCard'
import Spinner from '../components/ui/Spinner'
import Button from '../components/ui/Button'
import ApiService from '../services/ApiService'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboard = async () => {
    try {
      setRefreshing(true)
      const data = await ApiService.getDashboard()
      setDashboard(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Error loading dashboard: {error}</p>
        <Button onClick={fetchDashboard}>Retry</Button>
      </div>
    )
  }

  const { placeStats, batchStats, workers } = dashboard
  const workerList = workers ? Object.values(workers) : []

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h3>Overview</h3>
        <Button
          variant="secondary"
          size="small"
          onClick={fetchDashboard}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Place Statistics</h4>
        <div className={styles.statsGrid}>
          <StatCard
            title="Total Places"
            value={placeStats?.totalCount || 0}
            icon="📊"
            color="primary"
          />
          <StatCard
            title="Crawled"
            value={placeStats?.crawledCount || 0}
            subtitle="Data collected"
            icon="🔍"
            color="info"
          />
          <StatCard
            title="Embedded"
            value={placeStats?.embeddedCount || 0}
            subtitle="Production ready"
            icon="✅"
            color="success"
          />
          <StatCard
            title="Pending"
            value={placeStats?.pendingCount || 0}
            subtitle="Awaiting crawl"
            icon="⏳"
            color="warning"
          />
          <StatCard
            title="Not Found"
            value={placeStats?.notFoundCount || 0}
            subtitle="404 / Closed"
            icon="🚫"
            color="secondary"
          />
          <StatCard
            title="Failed"
            value={placeStats?.failedCount || 0}
            subtitle="Need attention"
            icon="❌"
            color="danger"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Batch Queue</h4>
        <div className={styles.statsGrid}>
          <StatCard
            title="Pending Tasks"
            value={batchStats?.pendingCount || 0}
            icon="📋"
            color="warning"
          />
          <StatCard
            title="Priority"
            value={batchStats?.priorityCount || 0}
            icon="⚡"
            color="info"
          />
          <StatCard
            title="Processing"
            value={batchStats?.processingCount || 0}
            icon="🔄"
            color="primary"
          />
          <StatCard
            title="Completed"
            value={batchStats?.completedCount || 0}
            icon="✅"
            color="success"
          />
          <StatCard
            title="Active Workers"
            value={batchStats?.activeWorkers || 0}
            icon="👷"
            color="primary"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Workers ({workerList.length})</h4>
        {workerList.length > 0 ? (
          <div className={styles.workersGrid}>
            {workerList.map((worker) => (
              <WorkerCard key={worker.workerId} worker={worker} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <p>No active workers</p>
          </div>
        )}
      </section>
    </div>
  )
}

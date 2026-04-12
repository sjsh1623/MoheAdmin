import { useState, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ApiService from '../services/ApiService'
import styles from './Pipeline.module.css'

export default function Pipeline() {
  const [progress, setProgress] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [triggeringJob, setTriggeringJob] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [progressData, pipelineStats] = await Promise.all([
        ApiService.getPipelineProgress().catch(() => null),
        ApiService.getPipelineStats(),
      ])
      setProgress(progressData)
      setStats(pipelineStats)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to fetch pipeline data:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleTriggerJob = async (jobName) => {
    setTriggeringJob(jobName)
    try {
      await ApiService.triggerJob(jobName)
    } catch (e) {
      console.error('Failed to trigger job:', e)
    } finally {
      setTriggeringJob(null)
      fetchData()
    }
  }

  const handleStopAll = async () => {
    setTriggeringJob('stopAll')
    try {
      await ApiService.stopAllJobs()
    } catch (e) {
      console.error('Failed to stop all jobs:', e)
    } finally {
      setTriggeringJob(null)
      fetchData()
    }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>

  const descTotal = progress?.description?.total || stats?.places?.total || 0
  const descDone = progress?.description?.completed || stats?.content?.aiDescriptions || 0
  const descPct = descTotal > 0 ? ((descDone / descTotal) * 100).toFixed(1) : 0

  const embTotal = progress?.embedding?.total || stats?.places?.total || 0
  const embDone = progress?.embedding?.completed || stats?.embedding?.embeddedPlaces || 0
  const embPct = embTotal > 0 ? ((embDone / embTotal) * 100).toFixed(1) : 0

  const imgTotal = progress?.image?.total || stats?.places?.total || 0
  const imgDone = progress?.image?.completed || stats?.content?.images || 0
  const imgPct = imgTotal > 0 ? ((imgDone / imgTotal) * 100).toFixed(1) : 0

  const jobs = stats?.jobs || {}
  const runningJobs = Object.entries(jobs)
    .filter(([, status]) => status === 'RUNNING')
    .map(([name]) => name)

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2>파이프라인 현황</h2>
        <span className={styles.updated}>
          {lastUpdated && `갱신: ${lastUpdated.toLocaleTimeString()}`}
        </span>
      </div>

      {/* Progress Bars */}
      <div className={styles.progressGrid}>
        <ProgressCard
          label="Description"
          done={descDone}
          total={descTotal}
          pct={descPct}
          color="#4A90D9"
        />
        <ProgressCard
          label="Embedding"
          done={embDone}
          total={embTotal}
          pct={embPct}
          color="#27AE60"
        />
        <ProgressCard
          label="Image"
          done={imgDone}
          total={imgTotal}
          pct={imgPct}
          color="#F39C12"
        />
      </div>

      {/* Running Jobs */}
      <h3 className={styles.sectionTitle}>실행 중인 작업</h3>
      <Card className={styles.jobsCard}>
        {runningJobs.length === 0 ? (
          <div className={styles.noJobs}>현재 실행 중인 작업이 없습니다.</div>
        ) : (
          <div className={styles.jobList}>
            {runningJobs.map((jobName) => (
              <div key={jobName} className={styles.jobItem}>
                <span className={styles.jobDot} />
                <span className={styles.jobName}>{jobName}</span>
                <span className={styles.jobStatus}>실행 중</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* All Jobs Status */}
      <h3 className={styles.sectionTitle}>전체 작업 상태</h3>
      <Card className={styles.jobsCard}>
        {Object.entries(jobs).map(([name, status]) => (
          <div key={name} className={styles.jobRow}>
            <div className={styles.jobInfo}>
              <span className={styles.jobNameFull}>{name}</span>
              <span className={status === 'RUNNING' ? styles.badgeRunning : styles.badgeIdle}>
                {status === 'RUNNING' ? '● RUNNING' : '○ IDLE'}
              </span>
            </div>
          </div>
        ))}
      </Card>

      {/* Controls */}
      <h3 className={styles.sectionTitle}>작업 제어</h3>
      <Card className={styles.controlsCard}>
        <div className={styles.controlButtons}>
          <Button
            variant="primary"
            loading={triggeringJob === 'updateCrawledDataJob'}
            disabled={jobs.updateCrawledDataJob === 'RUNNING'}
            onClick={() => handleTriggerJob('updateCrawledDataJob')}
          >
            크롤링 시작
          </Button>
          <Button
            variant="primary"
            loading={triggeringJob === 'vectorEmbeddingJob'}
            disabled={jobs.vectorEmbeddingJob === 'RUNNING'}
            onClick={() => handleTriggerJob('vectorEmbeddingJob')}
          >
            임베딩 시작
          </Button>
          <Button
            variant="primary"
            loading={triggeringJob === 'imageUpdateJob'}
            disabled={jobs.imageUpdateJob === 'RUNNING'}
            onClick={() => handleTriggerJob('imageUpdateJob')}
          >
            이미지 갱신
          </Button>
          <Button
            variant="danger"
            loading={triggeringJob === 'stopAll'}
            onClick={handleStopAll}
          >
            전체 중지
          </Button>
        </div>
      </Card>
    </div>
  )
}

function ProgressCard({ label, done, total, pct, color }) {
  return (
    <Card className={styles.progressCard}>
      <div className={styles.progressLabel}>{label}</div>
      <div className={styles.progressBarOuter}>
        <div
          className={styles.progressBarInner}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className={styles.progressStats}>
        <span>{done.toLocaleString()} / {total.toLocaleString()}</span>
        <span className={styles.progressPct}>{pct}%</span>
      </div>
    </Card>
  )
}

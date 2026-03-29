import { useState, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import StatCard from '../components/dashboard/StatCard'
import ApiService from '../services/ApiService'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [recentCrawls, setRecentCrawls] = useState([])
  const [kakaoQueue, setKakaoQueue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [triggeringJob, setTriggeringJob] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [pipelineStats, recentActivity, crawls] = await Promise.all([
        ApiService.getPipelineStats(),
        ApiService.getRecentActivity(),
        ApiService.getRecentCrawls(10, 30)
      ])
      setStats(pipelineStats)
      setActivity(recentActivity)
      setRecentCrawls(crawls || [])
      setLastUpdated(new Date())

      try {
        const mapData = await ApiService.getCrawlingMap()
        if (mapData?.data) setKakaoQueue(mapData.data)
      } catch {}
    } catch (e) {
      console.error('Failed to fetch pipeline stats:', e)
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

  const handleStartQueue = async () => {
    try {
      await ApiService.startQueueCrawling()
      fetchData()
    } catch (e) {
      console.error('Failed to start queue:', e)
    }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!stats) return <div className={styles.loading}>Failed to load data</div>

  const { places, embedding, content, jobs } = stats

  return (
    <div className={styles.dashboard}>
      <div className={styles.headerRow}>
        <h2>Pipeline Dashboard</h2>
        <span className={styles.updated}>
          {lastUpdated && `Updated ${lastUpdated.toLocaleTimeString()}`}
        </span>
      </div>

      {/* Pipeline Flow */}
      <Card className={styles.pipelineFlow}>
        <h3>Pipeline Flow</h3>
        <div className={styles.flowSteps}>
          <FlowStep
            label="Kakao 수집"
            count={places.pendingCrawl}
            sublabel="PENDING"
            color="info"
            status={kakaoQueue?.summary?.in_progress > 0 ? 'active' : 'idle'}
          />
          <div className={styles.flowArrow}>&rarr;</div>
          <FlowStep
            label="크롤링 + AI"
            count={places.awaitingEmbedding}
            sublabel="COMPLETED"
            color="warning"
            status={jobs.updateCrawledDataJob}
          />
          <div className={styles.flowArrow}>&rarr;</div>
          <FlowStep
            label="임베딩"
            count={places.fullyProcessed}
            sublabel="EMBEDDED"
            color="success"
            status={jobs.vectorEmbeddingJob}
          />
          <div className={styles.flowArrow}>&rarr;</div>
          <FlowStep
            label="이미지"
            count={content.images}
            sublabel="총 이미지"
            color="primary"
            status={jobs.imageUpdateJob}
          />
        </div>
      </Card>

      {/* Place Statistics */}
      <h3 className={styles.sectionTitle}>장소 데이터</h3>
      <div className={styles.statGrid}>
        <StatCard title="전체 장소" value={places.total} color="primary" />
        <StatCard title="완전 처리" value={places.fullyProcessed} color="success"
          subtitle={`${((places.fullyProcessed / places.total) * 100).toFixed(1)}%`} />
        <StatCard title="임베딩 대기" value={places.awaitingEmbedding} color="warning" />
        <StatCard title="크롤링 대기" value={places.pendingCrawl} color="info" />
        <StatCard title="실패" value={places.failed} color="danger" />
        <StatCard title="미발견" value={places.notFound} color="muted" />
      </div>

      {/* Embedding Stats */}
      <h3 className={styles.sectionTitle}>임베딩</h3>
      <div className={styles.statGrid}>
        <StatCard title="임베딩 완료 장소" value={embedding.embeddedPlaces} color="success" />
        <StatCard title="총 벡터 수" value={embedding.totalVectors} color="primary" />
        <StatCard title="키워드 캐시" value={embedding.cachedKeywords} color="info"
          subtitle="룩업 테이블" />
      </div>

      {/* Content Stats */}
      <h3 className={styles.sectionTitle}>컨텐츠</h3>
      <div className={styles.statGrid}>
        <StatCard title="AI 설명" value={content.aiDescriptions} color="primary" />
        <StatCard title="리뷰" value={content.reviews} color="info" />
        <StatCard title="이미지" value={content.images} color="success" />
        <StatCard title="영업시간" value={content.businessHours} color="warning" />
        <StatCard title="메뉴" value={content.menus} color="primary" />
        <StatCard title="SNS" value={content.sns} color="info" />
      </div>

      {/* Kakao Queue */}
      {kakaoQueue?.summary && (
        <>
          <h3 className={styles.sectionTitle}>Kakao 수집 큐</h3>
          <div className={styles.statGrid}>
            <StatCard title="완료" value={kakaoQueue.summary.completed || 0} color="success" />
            <StatCard title="진행 중" value={kakaoQueue.summary.in_progress || 0} color="warning" />
            <StatCard title="대기" value={kakaoQueue.summary.pending || 0} color="info" />
            <StatCard title="전체" value={kakaoQueue.summary.total || 0} color="primary"
              subtitle={`${(kakaoQueue.summary.completion_rate || 0).toFixed(1)}%`} />
          </div>
        </>
      )}

      {/* Job Controls */}
      <h3 className={styles.sectionTitle}>배치 Job 제어</h3>
      <Card className={styles.jobControls}>
        <div className={styles.jobRow}>
          <div className={styles.jobInfo}>
            <span className={styles.jobName}>크롤링 + AI</span>
            <JobBadge status={jobs.updateCrawledDataJob} />
          </div>
          <Button size="small"
            variant={jobs.updateCrawledDataJob === 'RUNNING' ? 'secondary' : 'primary'}
            loading={triggeringJob === 'updateCrawledDataJob'}
            disabled={jobs.updateCrawledDataJob === 'RUNNING'}
            onClick={() => handleTriggerJob('updateCrawledDataJob')}>
            실행
          </Button>
        </div>
        <div className={styles.jobRow}>
          <div className={styles.jobInfo}>
            <span className={styles.jobName}>임베딩</span>
            <JobBadge status={jobs.vectorEmbeddingJob} />
          </div>
          <Button size="small"
            variant={jobs.vectorEmbeddingJob === 'RUNNING' ? 'secondary' : 'primary'}
            loading={triggeringJob === 'vectorEmbeddingJob'}
            disabled={jobs.vectorEmbeddingJob === 'RUNNING'}
            onClick={() => handleTriggerJob('vectorEmbeddingJob')}>
            실행
          </Button>
        </div>
        <div className={styles.jobRow}>
          <div className={styles.jobInfo}>
            <span className={styles.jobName}>이미지 처리</span>
            <JobBadge status={jobs.imageUpdateJob} />
          </div>
          <Button size="small"
            variant={jobs.imageUpdateJob === 'RUNNING' ? 'secondary' : 'primary'}
            loading={triggeringJob === 'imageUpdateJob'}
            disabled={jobs.imageUpdateJob === 'RUNNING'}
            onClick={() => handleTriggerJob('imageUpdateJob')}>
            실행
          </Button>
        </div>
        <div className={styles.jobRow}>
          <div className={styles.jobInfo}>
            <span className={styles.jobName}>Kakao 수집</span>
            <span className={styles.badgeIdle}>큐 기반</span>
          </div>
          <Button size="small" variant="success" onClick={handleStartQueue}>
            큐 시작
          </Button>
        </div>
      </Card>

      {/* Recent Crawls */}
      {recentCrawls.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>
            최근 크롤링 장소
            <span className={styles.todayCount}>{recentCrawls.length}개 (10분 내)</span>
          </h3>
          <Card className={styles.crawlTableCard}>
            <div className={styles.crawlTable}>
              <div className={styles.crawlHeader}>
                <span>장소명</span>
                <span>위치</span>
                <span>상태</span>
                <span>리뷰</span>
                <span>키워드</span>
                <span>시간</span>
              </div>
              {recentCrawls.map((place) => {
                const time = place.updatedAt ? new Date(place.updatedAt).toLocaleTimeString() : ''
                const ago = place.updatedAt
                  ? Math.round((Date.now() - new Date(place.updatedAt).getTime()) / 60000)
                  : null
                return (
                  <div key={place.id} className={styles.crawlRow}>
                    <span className={styles.crawlName} title={place.name}>
                      {place.name}
                    </span>
                    <span className={styles.crawlAddr} title={place.roadAddress}>
                      {place.roadAddress || `${place.latitude?.toFixed(4)}, ${place.longitude?.toFixed(4)}`}
                    </span>
                    <span className={place.crawlStatus === 'COMPLETED' ? styles.statusOk : styles.statusFail}>
                      {place.crawlStatus === 'COMPLETED' ? '✅' : '❌'}
                    </span>
                    <span>{place.reviewCount || 0}</span>
                    <span>{place.keywordCount || 0}</span>
                    <span className={styles.crawlTime}>
                      {ago !== null ? (ago < 1 ? '방금' : `${ago}분 전`) : time}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}

      {/* Recent Activity Chart */}
      {activity.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>
            최근 24시간 장소 수집
            <span className={styles.todayCount}>오늘 +{stats.newPlacesToday?.toLocaleString()}</span>
          </h3>
          <Card className={styles.activityCard}>
            <div className={styles.activityChart}>
              {activity.map((item, idx) => {
                const maxCount = Math.max(...activity.map(a => a.count))
                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                const hour = new Date(item.hour).getHours()
                return (
                  <div key={idx} className={styles.barCol}>
                    <div className={styles.barValue}>
                      {item.count > 0 ? item.count.toLocaleString() : ''}
                    </div>
                    <div className={styles.bar} style={{ height: `${Math.max(height, 2)}%` }} />
                    <div className={styles.barLabel}>{hour}h</div>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function FlowStep({ label, count, sublabel, color, status }) {
  const isRunning = status === 'RUNNING' || status === 'active'
  return (
    <div className={`${styles.flowStep} ${styles[`flow_${color}`]}`}>
      <div className={styles.flowLabel}>{label}</div>
      <div className={styles.flowCount}>
        {typeof count === 'number' ? count.toLocaleString() : count}
      </div>
      <div className={styles.flowSublabel}>{sublabel}</div>
      <div className={isRunning ? styles.flowRunning : styles.flowIdle}>
        {isRunning ? '● 실행 중' : '○ 대기'}
      </div>
    </div>
  )
}

function JobBadge({ status }) {
  const isRunning = status === 'RUNNING'
  return (
    <span className={isRunning ? styles.badgeRunning : styles.badgeIdle}>
      {isRunning ? '● RUNNING' : '○ IDLE'}
    </span>
  )
}

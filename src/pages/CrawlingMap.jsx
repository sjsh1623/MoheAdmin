import { useState, useEffect, useCallback } from 'react'
import styles from './CrawlingMap.module.css'

const API_BASE = '/api/admin/monitor'

const STATUS_LABEL = {
  PENDING:     { label: '대기', color: '#9ca3af' },
  IN_PROGRESS: { label: '수집 중', color: '#f59e0b' },
  COMPLETED:   { label: '완료', color: '#10b981' },
  FAILED:      { label: '실패', color: '#ef4444' },
}

// 시도 그룹핑 (지도 레이아웃용)
const SIDO_GROUPS = [
  { sido_code: '1',  name: '서울', row: 2, col: 3 },
  { sido_code: '2',  name: '인천', row: 2, col: 2 },
  { sido_code: '3',  name: '대전', row: 4, col: 3 },
  { sido_code: '4',  name: '대구', row: 4, col: 5 },
  { sido_code: '5',  name: '광주', row: 5, col: 2 },
  { sido_code: '6',  name: '부산', row: 5, col: 5 },
  { sido_code: '7',  name: '울산', row: 4, col: 6 },
  { sido_code: '8',  name: '세종', row: 3, col: 3 },
  { sido_code: '31', name: '경기', row: 2, col: 4 },
  { sido_code: '32', name: '강원', row: 2, col: 5 },
  { sido_code: '33', name: '충북', row: 3, col: 4 },
  { sido_code: '34', name: '충남', row: 3, col: 2 },
  { sido_code: '35', name: '경북', row: 3, col: 5 },
  { sido_code: '36', name: '경남', row: 5, col: 4 },
  { sido_code: '37', name: '전북', row: 4, col: 2 },
  { sido_code: '38', name: '전남', row: 5, col: 3 },
  { sido_code: '39', name: '제주', row: 7, col: 3 },
]

function getSidoStatus(regions) {
  if (!regions || regions.length === 0) return 'PENDING'
  const total = regions.length
  const completed = regions.filter(r => r.status === 'COMPLETED').length
  const inProgress = regions.filter(r => r.status === 'IN_PROGRESS').length
  const failed = regions.filter(r => r.status === 'FAILED').length
  if (inProgress > 0) return 'IN_PROGRESS'
  if (completed === total) return 'COMPLETED'
  if (failed > 0 && completed + failed === total) return 'FAILED'
  return 'PENDING'
}

function getSidoProgress(regions) {
  if (!regions || regions.length === 0) return { total: 0, completed: 0, pct: 0 }
  const total = regions.length
  const completed = regions.filter(r => r.status === 'COMPLETED').length
  return { total, completed, pct: Math.round((completed / total) * 100) }
}

export default function CrawlingMap() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSido, setSelectedSido] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [startingQueue, setStartingQueue] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/crawling/map`)
      const json = await res.json()
      if (json.success && json.data?.data) {
        setData(json.data.data)
        setLastUpdated(new Date())
        setError(null)
      } else {
        setError(json.error?.message || '데이터를 불러올 수 없습니다.')
      }
    } catch (e) {
      setError('배치 콜렉터에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchData, 10000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchData])

  const handleStartQueue = async () => {
    if (!confirm('전국 자동 순환 크롤링을 시작하시겠습니까?')) return
    setStartingQueue(true)
    try {
      const res = await fetch(`${API_BASE}/crawling/start-queue`, { method: 'POST' })
      const json = await res.json()
      alert(json.success ? '큐 기반 수집을 시작했습니다.' : `실패: ${json.error?.message}`)
      fetchData()
    } finally {
      setStartingQueue(false)
    }
  }

  if (loading) return <div className={styles.center}>데이터 로딩 중...</div>
  if (error) return <div className={styles.center + ' ' + styles.error}>{error}</div>

  const summary = data?.summary || {}
  const regions = data?.regions || []

  // 시도별 그룹핑
  const sidoMap = {}
  for (const r of regions) {
    if (!sidoMap[r.sido_code]) sidoMap[r.sido_code] = []
    sidoMap[r.sido_code].push(r)
  }

  const totalSuccess = regions.reduce((s, r) => s + (r.success_count || 0), 0)

  const selectedRegions = selectedSido ? (sidoMap[selectedSido] || []) : []
  const selectedSidoInfo = SIDO_GROUPS.find(g => g.sido_code === selectedSido)

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <h1 className={styles.title}>전국 크롤링 현황</h1>
        <div className={styles.headerActions}>
          <label className={styles.autoRefreshLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            자동 갱신 (10초)
          </label>
          <button className={styles.refreshBtn} onClick={fetchData}>새로고침</button>
          <button
            className={styles.startBtn}
            onClick={handleStartQueue}
            disabled={startingQueue}
          >
            {startingQueue ? '시작 중...' : '전국 자동 순환 시작'}
          </button>
        </div>
        {lastUpdated && (
          <div className={styles.lastUpdated}>마지막 갱신: {lastUpdated.toLocaleTimeString()}</div>
        )}
      </div>

      {/* 요약 통계 */}
      <div className={styles.summaryGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{summary.total || 0}</div>
          <div className={styles.statLabel}>전체 지역</div>
        </div>
        <div className={styles.statCard} style={{ borderColor: STATUS_LABEL.COMPLETED.color }}>
          <div className={styles.statValue} style={{ color: STATUS_LABEL.COMPLETED.color }}>
            {summary.completed || 0}
          </div>
          <div className={styles.statLabel}>완료</div>
        </div>
        <div className={styles.statCard} style={{ borderColor: STATUS_LABEL.IN_PROGRESS.color }}>
          <div className={styles.statValue} style={{ color: STATUS_LABEL.IN_PROGRESS.color }}>
            {summary.in_progress || 0}
          </div>
          <div className={styles.statLabel}>수집 중</div>
        </div>
        <div className={styles.statCard} style={{ borderColor: STATUS_LABEL.PENDING.color }}>
          <div className={styles.statValue}>{summary.pending || 0}</div>
          <div className={styles.statLabel}>대기</div>
        </div>
        <div className={styles.statCard} style={{ borderColor: STATUS_LABEL.FAILED.color }}>
          <div className={styles.statValue} style={{ color: STATUS_LABEL.FAILED.color }}>
            {summary.failed || 0}
          </div>
          <div className={styles.statLabel}>실패</div>
        </div>
        <div className={styles.statCard} style={{ borderColor: '#3b82f6' }}>
          <div className={styles.statValue} style={{ color: '#3b82f6' }}>
            {totalSuccess.toLocaleString()}
          </div>
          <div className={styles.statLabel}>수집된 장소</div>
        </div>
      </div>

      {/* 전체 진행률 */}
      <div className={styles.progressSection}>
        <div className={styles.progressLabel}>
          전국 진행률 {summary.completion_rate || 0}%
          ({summary.completed || 0} / {summary.total || 0} 지역)
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${summary.completion_rate || 0}%` }}
          />
        </div>
      </div>

      <div className={styles.body}>
        {/* 지도 그리드 */}
        <div className={styles.mapSection}>
          <h2 className={styles.sectionTitle}>시도별 현황 (클릭하면 상세 보기)</h2>
          <div className={styles.mapGrid}>
            {SIDO_GROUPS.map(sido => {
              const sidoRegions = sidoMap[sido.sido_code] || []
              const status = getSidoStatus(sidoRegions)
              const progress = getSidoProgress(sidoRegions)
              const isSelected = selectedSido === sido.sido_code
              const statusInfo = STATUS_LABEL[status]

              return (
                <div
                  key={sido.sido_code}
                  className={`${styles.sidoCell} ${isSelected ? styles.selected : ''}`}
                  style={{
                    gridRow: sido.row,
                    gridColumn: sido.col,
                    backgroundColor: statusInfo.color + '22',
                    borderColor: statusInfo.color,
                  }}
                  onClick={() => setSelectedSido(isSelected ? null : sido.sido_code)}
                >
                  <div className={styles.sidoName}>{sido.name}</div>
                  <div className={styles.sidoStatus} style={{ color: statusInfo.color }}>
                    {statusInfo.label}
                  </div>
                  <div className={styles.sidoProgress}>
                    {progress.completed}/{progress.total}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 범례 */}
          <div className={styles.legend}>
            {Object.entries(STATUS_LABEL).map(([key, val]) => (
              <div key={key} className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: val.color }} />
                <span>{val.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 시군구 상세 패널 */}
        {selectedSido && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <h2>{selectedSidoInfo?.name} 시군구 상세</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedSido(null)}>✕</button>
            </div>
            <div className={styles.detailList}>
              {selectedRegions.length === 0 ? (
                <div className={styles.empty}>데이터 없음</div>
              ) : (
                selectedRegions.map(r => {
                  const si = STATUS_LABEL[r.status] || STATUS_LABEL.PENDING
                  return (
                    <div key={r.id} className={styles.detailItem}>
                      <div className={styles.detailLeft}>
                        <div
                          className={styles.detailDot}
                          style={{ backgroundColor: si.color }}
                        />
                        <span className={styles.detailName}>
                          {r.sigungu_name || r.sigungu_code}
                        </span>
                      </div>
                      <div className={styles.detailRight}>
                        <span className={styles.detailStatusLabel} style={{ color: si.color }}>
                          {si.label}
                        </span>
                        <span className={styles.detailCount}>
                          +{(r.success_count || 0).toLocaleString()}개
                        </span>
                        {r.last_collected_at && (
                          <span className={styles.detailDate}>
                            {new Date(r.last_collected_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

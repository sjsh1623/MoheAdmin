import { useState, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import ApiService from '../services/ApiService'
import styles from './Analytics.module.css'

export default function Analytics() {
  const [summary, setSummary] = useState(null)
  const [hourly, setHourly] = useState([])
  const [devices, setDevices] = useState([])
  const [browsers, setBrowsers] = useState([])
  const [os, setOs] = useState([])
  const [pages, setPages] = useState([])
  const [visitors, setVisitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [visitorPage, setVisitorPage] = useState(0)
  const [visitorTotalPages, setVisitorTotalPages] = useState(0)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, hourlyData, deviceData, browserData, osData, pageData, visitorData] =
        await Promise.all([
          ApiService.getAnalyticsSummary().catch(() => null),
          ApiService.getAnalyticsHourly().catch(() => []),
          ApiService.getAnalyticsDevices().catch(() => []),
          ApiService.getAnalyticsBrowsers().catch(() => []),
          ApiService.getAnalyticsOs().catch(() => []),
          ApiService.getAnalyticsPages(20).catch(() => []),
          ApiService.getAnalyticsVisitors(visitorPage, 20).catch(() => ({ content: [], totalPages: 0 })),
        ])
      setSummary(summaryData)
      setHourly(Array.isArray(hourlyData) ? hourlyData : [])
      setDevices(Array.isArray(deviceData) ? deviceData : [])
      setBrowsers(Array.isArray(browserData) ? browserData : [])
      setOs(Array.isArray(osData) ? osData : [])
      setPages(Array.isArray(pageData) ? pageData : [])
      setVisitors(visitorData?.content || (Array.isArray(visitorData) ? visitorData : []))
      setVisitorTotalPages(visitorData?.totalPages || 0)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to fetch analytics:', e)
    } finally {
      setLoading(false)
    }
  }, [visitorPage])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="large" />
      </div>
    )
  }

  const maxHourlyCount = Math.max(...hourly.map((h) => h.count || 0), 1)

  const maskIp = (ip) => {
    if (!ip) return '-'
    const parts = ip.split('.')
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`
    return ip
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2>방문자 분석</h2>
        <span className={styles.updated}>
          {lastUpdated && `갱신: ${lastUpdated.toLocaleTimeString()}`}
        </span>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className={styles.summaryGrid}>
          <SummaryCard label="오늘 방문자" value={summary.todayVisitors ?? 0} color="#4A90D9" />
          <SummaryCard label="오늘 페이지뷰" value={summary.todayPageviews ?? 0} color="#27AE60" />
          <SummaryCard label="주간 방문자" value={summary.weekVisitors ?? 0} color="#F39C12" />
          <SummaryCard label="월간 방문자" value={summary.monthVisitors ?? 0} color="#E74C3C" />
        </div>
      )}

      {/* Hourly Chart */}
      {hourly.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>시간대별 페이지뷰 (24시간)</h3>
          <Card className={styles.chartCard}>
            <div className={styles.chart}>
              {hourly.map((item, i) => {
                const height = maxHourlyCount > 0 ? (item.count / maxHourlyCount) * 100 : 0
                return (
                  <div key={i} className={styles.barCol}>
                    <div className={styles.barValue}>
                      {item.count > 0 ? item.count : ''}
                    </div>
                    <div
                      className={styles.bar}
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <span className={styles.barLabel}>{item.hour ?? i}h</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}

      {/* Device Breakdown */}
      {devices.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>디바이스 분포</h3>
          <Card className={styles.breakdownCard}>
            {devices.map((d, i) => {
              const total = devices.reduce((s, x) => s + (x.count || 0), 0)
              const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : 0
              return (
                <div key={i} className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>{d.name || d.device || '기타'}</span>
                  <div className={styles.breakdownBarOuter}>
                    <div
                      className={styles.breakdownBarInner}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={styles.breakdownPct}>{pct}%</span>
                  <span className={styles.breakdownCount}>{(d.count || 0).toLocaleString()}</span>
                </div>
              )
            })}
          </Card>
        </>
      )}

      {/* Two Column: Browser & OS */}
      <div className={styles.twoCol}>
        {browsers.length > 0 && (
          <div>
            <h3 className={styles.sectionTitle}>브라우저</h3>
            <Card className={styles.statsTableCard}>
              <table className={styles.statsTable}>
                <thead>
                  <tr>
                    <th>브라우저</th>
                    <th>방문 수</th>
                  </tr>
                </thead>
                <tbody>
                  {browsers.map((b, i) => (
                    <tr key={i}>
                      <td>{b.name || b.browser || '기타'}</td>
                      <td>{(b.count || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {os.length > 0 && (
          <div>
            <h3 className={styles.sectionTitle}>운영체제</h3>
            <Card className={styles.statsTableCard}>
              <table className={styles.statsTable}>
                <thead>
                  <tr>
                    <th>OS</th>
                    <th>방문 수</th>
                  </tr>
                </thead>
                <tbody>
                  {os.map((o, i) => (
                    <tr key={i}>
                      <td>{o.name || o.os || '기타'}</td>
                      <td>{(o.count || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>

      {/* Top Pages */}
      {pages.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>인기 페이지</h3>
          <Card className={styles.statsTableCard}>
            <table className={styles.statsTable}>
              <thead>
                <tr>
                  <th>페이지</th>
                  <th>조회 수</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p, i) => (
                  <tr key={i}>
                    <td className={styles.pagePath}>{p.path || p.page || '-'}</td>
                    <td>{(p.count || p.views || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Recent Visitors */}
      <h3 className={styles.sectionTitle}>최근 방문자</h3>
      <Card className={styles.statsTableCard}>
        {visitors.length === 0 ? (
          <div className={styles.noData}>방문자 데이터가 없습니다.</div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.statsTable}>
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>IP</th>
                    <th>디바이스</th>
                    <th>OS</th>
                    <th>브라우저</th>
                    <th>페이지</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v, i) => (
                    <tr key={i}>
                      <td className={styles.visitorTime}>
                        {v.visitedAt
                          ? new Date(v.visitedAt).toLocaleTimeString('ko-KR')
                          : '-'}
                      </td>
                      <td>{maskIp(v.ip)}</td>
                      <td>{v.device || '-'}</td>
                      <td>{v.os || '-'}</td>
                      <td>{v.browser || '-'}</td>
                      <td className={styles.pagePath}>{v.page || v.path || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visitorTotalPages > 1 && (
              <div className={styles.pagination}>
                <Button
                  variant="secondary"
                  size="small"
                  disabled={visitorPage === 0}
                  onClick={() => setVisitorPage(visitorPage - 1)}
                >
                  이전
                </Button>
                <span className={styles.pageInfo}>
                  {visitorPage + 1} / {visitorTotalPages}
                </span>
                <Button
                  variant="secondary"
                  size="small"
                  disabled={visitorPage >= visitorTotalPages - 1}
                  onClick={() => setVisitorPage(visitorPage + 1)}
                >
                  다음
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <Card className={styles.summaryCard}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={styles.summaryValue} style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </Card>
  )
}

import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import ApiService from '../services/ApiService'
import styles from './Places.module.css'

const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'ready', label: 'Ready' },
  { value: 'crawled', label: 'Crawled' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
]

export default function Places() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // null = batch, id = single
  const [deleting, setDeleting] = useState(false)
  const [detailPlace, setDetailPlace] = useState(null)

  const fetchPlaces = async () => {
    setLoading(true)
    try {
      const result = await ApiService.searchPlaces({ keyword, status, page, size: 20 })
      setPlaces(result.places || [])
      setTotalPages(result.totalPages || 0)
      setTotalElements(result.totalElements || 0)
    } catch (err) {
      console.error('Failed to fetch places:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlaces()
  }, [status, page])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(0)
    fetchPlaces()
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === places.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(places.map((p) => p.id)))
    }
  }

  const handleDeleteClick = (id = null) => {
    setDeleteTarget(id)
    setShowDeleteConfirm(true)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      if (deleteTarget) {
        await ApiService.deletePlace(deleteTarget)
      } else {
        await ApiService.deletePlacesBatch([...selectedIds])
      }
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
      fetchPlaces()
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (place) => {
    if (place.ready) return <span className={`${styles.badge} ${styles.ready}`}>Ready</span>
    if (place.crawlStatus === 'NOT_FOUND') return <span className={`${styles.badge} ${styles.notFound}`}>NotFound</span>
    if (place.crawlerFound) return <span className={`${styles.badge} ${styles.crawled}`}>Crawled</span>
    if (place.crawlerFound === false) return <span className={`${styles.badge} ${styles.failed}`}>Failed</span>
    return <span className={`${styles.badge} ${styles.pending}`}>Pending</span>
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const selectedCount = deleteTarget ? 1 : selectedIds.size

  return (
    <div className={styles.container}>
      <Card className={styles.searchCard}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="장소명으로 검색..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(0)
            }}
            className={styles.statusSelect}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={loading}>
            검색
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="danger" onClick={() => handleDeleteClick()}>
              선택 삭제 ({selectedIds.size})
            </Button>
          )}
        </form>
        <div className={styles.resultInfo}>
          전체: {totalElements.toLocaleString()}개 장소
        </div>
      </Card>

      {loading ? (
        <div className={styles.loading}>
          <Spinner size="large" />
        </div>
      ) : places.length === 0 ? (
        <Card>
          <div className={styles.empty}>
            <p>장소를 찾을 수 없습니다</p>
          </div>
        </Card>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.checkboxCol}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === places.length && places.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>ID</th>
                  <th>장소명</th>
                  <th>주소</th>
                  <th>카테고리</th>
                  <th>평점</th>
                  <th>리뷰</th>
                  <th>이미지</th>
                  <th>상태</th>
                  <th>수정일</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {places.map((place) => (
                  <tr key={place.id} className={selectedIds.has(place.id) ? styles.selectedRow : ''}>
                    <td className={styles.checkboxCol}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(place.id)}
                        onChange={() => toggleSelect(place.id)}
                      />
                    </td>
                    <td>{place.id}</td>
                    <td
                      className={styles.nameClickable}
                      onClick={() => setDetailPlace(place)}
                    >
                      {place.name}
                    </td>
                    <td className={styles.address}>{place.roadAddress || '-'}</td>
                    <td className={styles.category}>
                      {place.category?.slice(0, 2).join(', ') || '-'}
                    </td>
                    <td>{place.rating?.toFixed(1) || '-'}</td>
                    <td>{place.reviewCount || 0}</td>
                    <td>{place.imageCount || 0}</td>
                    <td>{getStatusBadge(place)}</td>
                    <td className={styles.date}>{formatDate(place.updatedAt)}</td>
                    <td>
                      <button
                        className={styles.deleteIconBtn}
                        onClick={() => handleDeleteClick(place.id)}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <Button
              variant="secondary"
              size="small"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              이전
            </Button>
            <span className={styles.pageInfo}>
              {page + 1} / {totalPages} 페이지
            </span>
            <Button
              variant="secondary"
              size="small"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              다음
            </Button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>정말 삭제하시겠습니까?</h3>
            <p>{selectedCount}개의 장소가 영구 삭제됩니다.</p>
            <div className={styles.modalActions}>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                삭제
              </Button>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailPlace && (
        <div className={styles.modalOverlay} onClick={() => setDetailPlace(null)}>
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailHeader}>
              <h3>{detailPlace.name}</h3>
              <button className={styles.closeBtn} onClick={() => setDetailPlace(null)}>
                ✕
              </button>
            </div>
            <div className={styles.detailBody}>
              <DetailRow label="ID" value={detailPlace.id} />
              <DetailRow label="주소" value={detailPlace.roadAddress || detailPlace.address || '-'} />
              <DetailRow label="카테고리" value={detailPlace.category?.join(', ') || '-'} />
              <DetailRow label="평점" value={detailPlace.rating?.toFixed(1) || '-'} />
              <DetailRow label="리뷰 수" value={detailPlace.reviewCount || 0} />
              <DetailRow label="이미지 수" value={detailPlace.imageCount || 0} />
              <DetailRow label="좌표" value={
                detailPlace.latitude && detailPlace.longitude
                  ? `${detailPlace.latitude}, ${detailPlace.longitude}`
                  : '-'
              } />
              <DetailRow label="상태" value={
                detailPlace.ready ? 'Ready'
                  : detailPlace.crawlerFound ? 'Crawled'
                  : detailPlace.crawlerFound === false ? 'Failed'
                  : 'Pending'
              } />
              <DetailRow label="생성일" value={formatDate(detailPlace.createdAt)} />
              <DetailRow label="수정일" value={formatDate(detailPlace.updatedAt)} />

              {detailPlace.aiDescription && (
                <div className={styles.detailSection}>
                  <div className={styles.detailLabel}>AI 설명</div>
                  <div className={styles.detailText}>{detailPlace.aiDescription}</div>
                </div>
              )}

              {detailPlace.keywords && detailPlace.keywords.length > 0 && (
                <div className={styles.detailSection}>
                  <div className={styles.detailLabel}>키워드</div>
                  <div className={styles.keywordList}>
                    {detailPlace.keywords.map((kw, i) => (
                      <span key={i} className={styles.keyword}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {detailPlace.images && detailPlace.images.length > 0 && (
                <div className={styles.detailSection}>
                  <div className={styles.detailLabel}>이미지</div>
                  <div className={styles.imageGrid}>
                    {detailPlace.images.slice(0, 6).map((img, i) => (
                      <img
                        key={i}
                        src={typeof img === 'string' ? img : img.url}
                        alt={`${detailPlace.name} ${i + 1}`}
                        className={styles.detailImage}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  )
}

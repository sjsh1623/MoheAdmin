import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import ApiService from '../services/ApiService'
import styles from './Places.module.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
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

  const getStatusBadge = (place) => {
    if (place.ready) return <span className={`${styles.badge} ${styles.ready}`}>Ready</span>
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

  return (
    <div className={styles.container}>
      <Card className={styles.searchCard}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search by name..."
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
            Search
          </Button>
        </form>
        <div className={styles.resultInfo}>
          Total: {totalElements.toLocaleString()} places
        </div>
      </Card>

      {loading ? (
        <div className={styles.loading}>
          <Spinner size="large" />
        </div>
      ) : places.length === 0 ? (
        <Card>
          <div className={styles.empty}>
            <p>No places found</p>
          </div>
        </Card>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Category</th>
                  <th>Rating</th>
                  <th>Reviews</th>
                  <th>Images</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {places.map((place) => (
                  <tr key={place.id}>
                    <td>{place.id}</td>
                    <td className={styles.name}>{place.name}</td>
                    <td className={styles.address}>{place.roadAddress || '-'}</td>
                    <td className={styles.category}>
                      {place.category?.slice(0, 2).join(', ') || '-'}
                    </td>
                    <td>{place.rating?.toFixed(1) || '-'}</td>
                    <td>{place.reviewCount || 0}</td>
                    <td>{place.imageCount || 0}</td>
                    <td>{getStatusBadge(place)}</td>
                    <td className={styles.date}>{formatDate(place.updatedAt)}</td>
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
              Previous
            </Button>
            <span className={styles.pageInfo}>
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="small"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

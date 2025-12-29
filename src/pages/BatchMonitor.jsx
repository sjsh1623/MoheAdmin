import { useState, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import StatCard from '../components/dashboard/StatCard'
import WorkerCard from '../components/dashboard/WorkerCard'
import ApiService from '../services/ApiService'
import styles from './BatchMonitor.module.css'

const WORKER_COUNT = 3 // Workers available (0, 1, 2)

const ENDPOINTS = {
  queue: [
    { id: 'push', method: 'POST', path: '/push/{placeId}', name: 'Push Single Place', input: 'placeId', inputLabel: 'Place ID' },
    { id: 'push-all', method: 'POST', path: '/push-all', name: 'Push All Pending', params: ['menus', 'images', 'reviews'] },
    { id: 'push-batch', method: 'POST', path: '/push-batch', name: 'Push Batch', input: 'placeIds', inputLabel: 'Place IDs (comma separated)' },
    { id: 'retry-failed', method: 'POST', path: '/retry-failed', name: 'Retry Failed' },
    { id: 'worker-start', method: 'POST', path: '/worker/start', name: 'Start Queue Worker' },
    { id: 'worker-stop', method: 'POST', path: '/worker/stop', name: 'Stop Queue Worker' },
  ],
  update: [
    { id: 'update-menus', method: 'POST', path: '/menus', name: 'Update Menus' },
    { id: 'update-images', method: 'POST', path: '/images', name: 'Update Images' },
    { id: 'update-reviews', method: 'POST', path: '/reviews', name: 'Update Reviews' },
    { id: 'update-menus-images', method: 'POST', path: '/menus-with-images', name: 'Menus + Images' },
    { id: 'update-start-all', method: 'POST', path: '/start-all', name: 'Start All Updates' },
  ],
  embedding: [
    { id: 'embedding-start', method: 'POST', path: '/start', name: 'Start Embedding' },
    { id: 'embedding-stop', method: 'POST', path: '/stop', name: 'Stop Embedding' },
  ],
}

export default function BatchMonitor() {
  const [servers, setServers] = useState([])
  const [selectedServer, setSelectedServer] = useState('')
  const [batchStats, setBatchStats] = useState(null)
  const [workers, setWorkers] = useState({})
  const [batchStatus, setBatchStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState(null)
  const [inputs, setInputs] = useState({})
  const [checkboxes, setCheckboxes] = useState({ menus: true, images: true, reviews: true })
  const [selectedWorkers, setSelectedWorkers] = useState(new Set([0, 1, 2]))

  const fetchServers = async () => {
    try {
      const serverList = await ApiService.getBatchServers()
      setServers(serverList || [])
      if (serverList?.length > 0 && !selectedServer) {
        setSelectedServer(serverList[0].name)
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err)
      setServers([{ name: 'local', url: 'http://localhost:8081', enabled: true }])
      if (!selectedServer) setSelectedServer('local')
    }
  }

  const fetchData = useCallback(async () => {
    if (!selectedServer) return
    try {
      const [stats, workersData] = await Promise.all([
        ApiService.getBatchStats(selectedServer),
        ApiService.getWorkers(selectedServer)
      ])
      setBatchStats(stats)
      setWorkers(workersData || {})

      // Fetch batch status for worker info
      try {
        const status = await ApiService.executeBatchEndpoint(selectedServer, 'GET', '/batch/status', null)
        setBatchStatus(status)
      } catch (e) {
        console.log('Could not fetch batch status')
      }
    } catch (err) {
      console.error('Failed to fetch batch data:', err)
      setBatchStats(null)
      setWorkers({})
    } finally {
      setLoading(false)
    }
  }, [selectedServer])

  useEffect(() => {
    fetchServers()
  }, [])

  useEffect(() => {
    if (selectedServer) {
      setLoading(true)
      fetchData()
      const interval = setInterval(fetchData, 5000)
      return () => clearInterval(interval)
    }
  }, [selectedServer, fetchData])

  const handleServerSelect = (serverName) => {
    setSelectedServer(serverName)
    setLoading(true)
  }

  const toggleWorkerSelection = (workerId) => {
    const newSelected = new Set(selectedWorkers)
    if (newSelected.has(workerId)) {
      newSelected.delete(workerId)
    } else {
      newSelected.add(workerId)
    }
    setSelectedWorkers(newSelected)
  }

  const selectAllWorkers = () => {
    const all = new Set(Array.from({ length: WORKER_COUNT }, (_, i) => i))
    setSelectedWorkers(all)
  }

  const deselectAllWorkers = () => {
    setSelectedWorkers(new Set())
  }

  const startSelectedWorkers = async () => {
    if (selectedWorkers.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one worker' })
      return
    }
    setActionLoading('start-workers')
    try {
      const workerIds = Array.from(selectedWorkers).sort((a, b) => a - b)
      for (const workerId of workerIds) {
        await ApiService.executeBatchEndpoint(selectedServer, 'POST', `/batch/start/${workerId}`, null)
      }
      setMessage({ type: 'success', text: `Started ${workerIds.length} workers: ${workerIds.join(', ')}` })
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to start workers: ${err.message}` })
    } finally {
      setActionLoading(null)
    }
  }

  const stopSelectedWorkers = async () => {
    if (selectedWorkers.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one worker' })
      return
    }
    setActionLoading('stop-workers')
    try {
      const workerIds = Array.from(selectedWorkers).sort((a, b) => a - b)
      for (const workerId of workerIds) {
        await ApiService.executeBatchEndpoint(selectedServer, 'POST', `/batch/stop/${workerId}`, null)
      }
      setMessage({ type: 'success', text: `Stopped ${workerIds.length} workers: ${workerIds.join(', ')}` })
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to stop workers: ${err.message}` })
    } finally {
      setActionLoading(null)
    }
  }

  const startAllWorkers = async () => {
    setActionLoading('start-all')
    try {
      await ApiService.executeBatchEndpoint(selectedServer, 'POST', '/batch/start-all', null)
      setMessage({ type: 'success', text: 'Started all workers' })
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: `Failed: ${err.message}` })
    } finally {
      setActionLoading(null)
    }
  }

  const stopAllWorkers = async () => {
    setActionLoading('stop-all')
    try {
      await ApiService.executeBatchEndpoint(selectedServer, 'POST', '/batch/stop-all', null)
      setMessage({ type: 'success', text: 'Stopped all workers' })
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: `Failed: ${err.message}` })
    } finally {
      setActionLoading(null)
    }
  }

  const executeEndpoint = async (category, endpoint) => {
    const actionId = `${category}-${endpoint.id}`
    setActionLoading(actionId)

    try {
      let path = endpoint.path
      let body = null

      if (endpoint.input && path.includes(`{${endpoint.input}}`)) {
        const inputValue = inputs[endpoint.id]
        if (!inputValue) {
          setMessage({ type: 'error', text: `Please enter ${endpoint.inputLabel}` })
          setActionLoading(null)
          return
        }
        path = path.replace(`{${endpoint.input}}`, inputValue)
      }

      if (endpoint.id === 'push-batch') {
        const inputValue = inputs[endpoint.id]
        if (!inputValue) {
          setMessage({ type: 'error', text: 'Please enter Place IDs' })
          setActionLoading(null)
          return
        }
        body = { placeIds: inputValue.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) }
      }

      if (endpoint.id === 'push-all') {
        path = `${path}?menus=${checkboxes.menus}&images=${checkboxes.images}&reviews=${checkboxes.reviews}`
      }

      const basePath = category === 'queue' ? '/batch/queue' :
                       category === 'update' ? '/batch/update' :
                       category === 'embedding' ? '/batch/embedding' : '/batch'

      const result = await ApiService.executeBatchEndpoint(selectedServer, endpoint.method, basePath + path, body)

      setMessage({
        type: 'success',
        text: `${endpoint.name} executed successfully`
      })
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: `${endpoint.name} failed: ${err.message}` })
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const workerList = Object.values(workers)
  // batchStatus.workers is an array of {workerId, status, ...}
  const runningWorkerIds = batchStatus?.workers
    ? batchStatus.workers
        .filter(w => w.status === 'STARTED' || w.status === 'STARTING')
        .map(w => w.workerId)
    : []

  return (
    <div className={styles.container}>
      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Server Selection */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Batch Servers</h3>
        <div className={styles.serverGrid}>
          {servers.map((server) => (
            <div
              key={server.name}
              className={`${styles.serverCard} ${selectedServer === server.name ? styles.selected : ''} ${server.enabled ? '' : styles.disabled}`}
              onClick={() => server.enabled && handleServerSelect(server.name)}
            >
              <div className={styles.serverHeader}>
                <span className={styles.serverName}>{server.name}</span>
                <span className={`${styles.serverStatus} ${server.enabled ? styles.online : styles.offline}`}>
                  {server.enabled ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className={styles.serverUrl}>{server.url}</div>
            </div>
          ))}
        </div>
      </section>

      {loading ? (
        <div className={styles.loading}>
          <Spinner size="large" />
        </div>
      ) : (
        <>
          {/* Queue Statistics */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Queue Statistics - {selectedServer}</h3>
            <div className={styles.statsGrid}>
              <StatCard title="Pending" value={batchStats?.pendingCount || 0} icon="📋" color="warning" />
              <StatCard title="Priority" value={batchStats?.priorityCount || 0} icon="⚡" color="info" />
              <StatCard title="Processing" value={batchStats?.processingCount || 0} icon="🔄" color="primary" />
              <StatCard title="Completed" value={batchStats?.completedCount || 0} icon="✅" color="success" />
              <StatCard title="Failed" value={batchStats?.failedCount || 0} icon="❌" color="danger" />
              <StatCard title="Active" value={batchStats?.activeWorkers || runningWorkerIds.length || 0} icon="👷" color="info" />
            </div>
          </section>

          {/* Worker Management */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Worker Management</h3>
            <Card>
              <div className={styles.workerManagement}>
                <div className={styles.workerControls}>
                  <div className={styles.workerButtons}>
                    <Button variant="success" onClick={startSelectedWorkers} loading={actionLoading === 'start-workers'} disabled={actionLoading !== null}>
                      Start Selected ({selectedWorkers.size})
                    </Button>
                    <Button variant="danger" onClick={stopSelectedWorkers} loading={actionLoading === 'stop-workers'} disabled={actionLoading !== null}>
                      Stop Selected ({selectedWorkers.size})
                    </Button>
                    <Button variant="primary" onClick={startAllWorkers} loading={actionLoading === 'start-all'} disabled={actionLoading !== null}>
                      Start All
                    </Button>
                    <Button variant="secondary" onClick={stopAllWorkers} loading={actionLoading === 'stop-all'} disabled={actionLoading !== null}>
                      Stop All
                    </Button>
                  </div>
                  <div className={styles.selectButtons}>
                    <button className={styles.linkButton} onClick={selectAllWorkers}>Select All</button>
                    <button className={styles.linkButton} onClick={deselectAllWorkers}>Deselect All</button>
                  </div>
                </div>
                <div className={styles.workerGrid}>
                  {Array.from({ length: WORKER_COUNT }, (_, i) => i).map((workerId) => {
                    const isRunning = runningWorkerIds.includes(workerId)
                    const isSelected = selectedWorkers.has(workerId)
                    return (
                      <button
                        key={workerId}
                        type="button"
                        className={`${styles.workerButton} ${isSelected ? styles.selected : ''} ${isRunning ? styles.running : ''}`}
                        onClick={() => toggleWorkerSelection(workerId)}
                      >
                        <span className={styles.workerId}>W{workerId}</span>
                        {isRunning && <span className={styles.runningDot} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </Card>
          </section>

          {/* Queue Actions */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Queue Actions</h3>
            <Card>
              <div className={styles.queueActions}>
                {/* Push Single Place */}
                <div className={styles.actionRow}>
                  <span className={styles.actionLabel}>Push Single</span>
                  <div className={styles.actionControls}>
                    <input
                      type="text"
                      className={styles.actionInput}
                      placeholder="Place ID"
                      value={inputs['push'] || ''}
                      onChange={(e) => setInputs({ ...inputs, 'push': e.target.value })}
                    />
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => executeEndpoint('queue', ENDPOINTS.queue[0])}
                      loading={actionLoading === 'queue-push'}
                      disabled={actionLoading !== null}
                    >
                      Push
                    </Button>
                  </div>
                </div>

                {/* Push Batch */}
                <div className={styles.actionRow}>
                  <span className={styles.actionLabel}>Push Batch</span>
                  <div className={styles.actionControls}>
                    <input
                      type="text"
                      className={`${styles.actionInput} ${styles.wideInput}`}
                      placeholder="Place IDs (comma separated)"
                      value={inputs['push-batch'] || ''}
                      onChange={(e) => setInputs({ ...inputs, 'push-batch': e.target.value })}
                    />
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => executeEndpoint('queue', ENDPOINTS.queue[2])}
                      loading={actionLoading === 'queue-push-batch'}
                      disabled={actionLoading !== null}
                    >
                      Push
                    </Button>
                  </div>
                </div>

                {/* Push All Pending */}
                <div className={styles.actionRow}>
                  <span className={styles.actionLabel}>Push All</span>
                  <div className={styles.actionControls}>
                    <div className={styles.toggleGroup}>
                      {['menus', 'images', 'reviews'].map((param) => (
                        <button
                          key={param}
                          type="button"
                          className={`${styles.toggleButton} ${checkboxes[param] ? styles.active : ''}`}
                          onClick={() => setCheckboxes({ ...checkboxes, [param]: !checkboxes[param] })}
                        >
                          {param}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => executeEndpoint('queue', ENDPOINTS.queue[1])}
                      loading={actionLoading === 'queue-push-all'}
                      disabled={actionLoading !== null}
                    >
                      Push All
                    </Button>
                  </div>
                </div>

                {/* Simple Actions */}
                <div className={styles.actionRow}>
                  <span className={styles.actionLabel}>Actions</span>
                  <div className={styles.actionButtons}>
                    <Button
                      variant="warning"
                      size="small"
                      onClick={() => executeEndpoint('queue', ENDPOINTS.queue[3])}
                      loading={actionLoading === 'queue-retry-failed'}
                      disabled={actionLoading !== null}
                    >
                      Retry Failed
                    </Button>
                    <Button
                      variant="success"
                      size="small"
                      onClick={() => executeEndpoint('queue', ENDPOINTS.queue[4])}
                      loading={actionLoading === 'queue-worker-start'}
                      disabled={actionLoading !== null}
                    >
                      Start Worker
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => executeEndpoint('queue', ENDPOINTS.queue[5])}
                      loading={actionLoading === 'queue-worker-stop'}
                      disabled={actionLoading !== null}
                    >
                      Stop Worker
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Update & Embedding Actions */}
          <section className={styles.section}>
            <div className={styles.twoColumns}>
              <div>
                <h3 className={styles.sectionTitle}>Update Actions</h3>
                <Card>
                  <div className={styles.buttonList}>
                    {ENDPOINTS.update.map((endpoint) => (
                      <Button
                        key={endpoint.id}
                        variant="primary"
                        size="small"
                        onClick={() => executeEndpoint('update', endpoint)}
                        loading={actionLoading === `update-${endpoint.id}`}
                        disabled={actionLoading !== null}
                        fullWidth
                      >
                        {endpoint.name}
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
              <div>
                <h3 className={styles.sectionTitle}>Embedding Actions</h3>
                <Card>
                  <div className={styles.buttonList}>
                    {ENDPOINTS.embedding.map((endpoint) => (
                      <Button
                        key={endpoint.id}
                        variant={endpoint.id.includes('stop') ? 'danger' : 'success'}
                        size="small"
                        onClick={() => executeEndpoint('embedding', endpoint)}
                        loading={actionLoading === `embedding-${endpoint.id}`}
                        disabled={actionLoading !== null}
                        fullWidth
                      >
                        {endpoint.name}
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </section>

          {/* Workers Status from Batch */}
          {batchStatus?.workers && batchStatus.workers.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Worker Status ({batchStatus.runningCount || 0} running)</h3>
              <div className={styles.workerStatusGrid}>
                {batchStatus.workers.map((worker) => (
                  <div key={worker.workerId} className={`${styles.workerStatusCard} ${worker.status === 'STARTED' || worker.status === 'STARTING' ? styles.active : ''}`}>
                    <div className={styles.workerStatusHeader}>
                      <span className={styles.workerStatusId}>Worker {worker.workerId}</span>
                      <span className={`${styles.workerStatusBadge} ${styles[worker.status?.toLowerCase() || 'unknown']}`}>
                        {worker.status || 'UNKNOWN'}
                      </span>
                    </div>
                    {worker.status !== 'NOT_STARTED' && (
                      <div className={styles.workerStatusDetails}>
                        {worker.processedCount !== undefined && (
                          <div>Processed: {worker.processedCount}</div>
                        )}
                        {worker.progressPercent && (
                          <div>Progress: {worker.progressPercent}%</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

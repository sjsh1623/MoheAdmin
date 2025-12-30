import { useState, useEffect, useCallback, useRef } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import ApiService from '../services/ApiService'
import styles from './DockerLogs.module.css'

export default function DockerLogs() {
  // Server selection
  const [servers, setServers] = useState([])
  const [selectedServer, setSelectedServer] = useState('')

  // Container and logs
  const [dockerContainers, setDockerContainers] = useState([])
  const [selectedContainer, setSelectedContainer] = useState('')
  const [dockerLogs, setDockerLogs] = useState('')
  const [containersLoading, setContainersLoading] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logLines, setLogLines] = useState(200)
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const logsEndRef = useRef(null)
  const logsContainerRef = useRef(null)

  const fetchServers = async () => {
    try {
      const serverList = await ApiService.getBatchServers()
      setServers(serverList || [])
      if (serverList?.length > 0 && !selectedServer) {
        setSelectedServer(serverList[0].name)
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err)
      setServers([{ name: 'local', enabled: true, dockerHost: 'localhost' }])
      if (!selectedServer) setSelectedServer('local')
    }
  }

  const fetchDockerContainers = useCallback(async () => {
    if (!selectedServer) return
    setContainersLoading(true)
    setDockerContainers([])
    setSelectedContainer('')
    setDockerLogs('')

    try {
      const containers = await ApiService.getDockerContainers(selectedServer)
      setDockerContainers(containers || [])
      if (containers?.length > 0) {
        // Auto-select first mohe-batch container if available
        const batchContainer = containers.find(c =>
          c.name.includes('batch') && !c.name.includes('redis') && !c.name.includes('crawler')
        )
        setSelectedContainer(batchContainer?.name || containers[0].name)
      }
    } catch (err) {
      console.error('Failed to fetch Docker containers:', err)
      setDockerContainers([])
    } finally {
      setContainersLoading(false)
    }
  }, [selectedServer])

  const fetchDockerLogs = useCallback(async () => {
    if (!selectedContainer || !selectedServer) return
    setLogsLoading(true)
    try {
      const result = await ApiService.getDockerLogs(selectedContainer, logLines, selectedServer)
      if (result?.logs) {
        setDockerLogs(result.logs)
      }
    } catch (err) {
      console.error('Failed to fetch Docker logs:', err)
      setDockerLogs('Error loading logs: ' + err.message)
    } finally {
      setLogsLoading(false)
    }
  }, [selectedContainer, selectedServer, logLines])

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToTop = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0
    }
  }

  useEffect(() => {
    fetchServers()
  }, [])

  useEffect(() => {
    if (selectedServer) {
      fetchDockerContainers()
    }
  }, [selectedServer, fetchDockerContainers])

  useEffect(() => {
    if (selectedContainer && selectedServer) {
      fetchDockerLogs()
    }
  }, [selectedContainer, selectedServer, fetchDockerLogs])

  useEffect(() => {
    let logsInterval
    if (autoRefreshLogs && selectedContainer && selectedServer) {
      logsInterval = setInterval(fetchDockerLogs, 3000)
    }
    return () => {
      if (logsInterval) clearInterval(logsInterval)
    }
  }, [autoRefreshLogs, selectedContainer, selectedServer, fetchDockerLogs])

  const handleServerSelect = (serverName) => {
    setSelectedServer(serverName)
    setSelectedContainer('')
    setDockerLogs('')
  }

  const getContainerStatusClass = (container) => {
    if (!container.running) return styles.stopped
    if (container.status?.includes('healthy')) return styles.healthy
    return styles.running
  }

  const getServerStatusClass = (server) => {
    if (!server.enabled) return styles.serverDisabled
    if (!server.dockerHost) return styles.serverNoDocker
    return styles.serverOnline
  }

  const filteredLogs = searchTerm
    ? dockerLogs.split('\n').filter(line =>
        line.toLowerCase().includes(searchTerm.toLowerCase())
      ).join('\n')
    : dockerLogs

  const highlightLogs = (logs) => {
    return logs.split('\n').map((line, index) => {
      let className = styles.logLine
      if (line.includes('ERROR') || line.includes('ERRO')) {
        className = `${styles.logLine} ${styles.error}`
      } else if (line.includes('WARN')) {
        className = `${styles.logLine} ${styles.warn}`
      } else if (line.includes('INFO')) {
        className = `${styles.logLine} ${styles.info}`
      } else if (line.includes('DEBUG')) {
        className = `${styles.logLine} ${styles.debug}`
      }
      return <div key={index} className={className}>{line}</div>
    })
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Docker Logs</h2>

      {/* Server Selection */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Servers</h3>
        <div className={styles.serverGrid}>
          {servers.map((server) => (
            <button
              key={server.name}
              className={`${styles.serverCard} ${selectedServer === server.name ? styles.selected : ''} ${getServerStatusClass(server)}`}
              onClick={() => server.enabled && handleServerSelect(server.name)}
              disabled={!server.enabled}
            >
              <div className={styles.serverHeader}>
                <span className={styles.serverName}>{server.name}</span>
                <span className={`${styles.statusDot} ${server.enabled ? styles.online : styles.offline}`} />
              </div>
              <div className={styles.serverInfo}>
                <span className={styles.dockerHost}>
                  {server.dockerHost || 'No Docker'} : {server.dockerPort || '-'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Container Selection */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Containers
          {containersLoading && <Spinner size="small" className={styles.inlineSpinner} />}
        </h3>
        {containersLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner size="medium" />
            <span>Loading containers from {selectedServer}...</span>
          </div>
        ) : dockerContainers.length > 0 ? (
          <div className={styles.containerGrid}>
            {dockerContainers.map((container) => (
              <button
                key={container.name}
                className={`${styles.containerCard} ${selectedContainer === container.name ? styles.selected : ''} ${getContainerStatusClass(container)}`}
                onClick={() => setSelectedContainer(container.name)}
              >
                <div className={styles.containerHeader}>
                  <span className={styles.containerName}>{container.name}</span>
                  <span className={`${styles.statusDot} ${container.running ? styles.online : styles.offline}`} />
                </div>
                <div className={styles.containerInfo}>
                  <span className={styles.containerImage}>{container.image}</span>
                  <span className={styles.containerStatus}>{container.status}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.noContainers}>
            No containers found on {selectedServer}.
            <br />
            Make sure Docker TCP API is enabled on port 2375.
          </div>
        )}
      </section>

      {/* Logs Viewer */}
      <section className={styles.section}>
        <Card>
          <div className={styles.logsHeader}>
            <div className={styles.logsTitle}>
              <h3>{selectedContainer ? `${selectedServer} / ${selectedContainer}` : 'Select a container'}</h3>
              {selectedContainer && (
                <span className={styles.logCount}>
                  {filteredLogs.split('\n').filter(l => l).length} lines
                </span>
              )}
            </div>
            <div className={styles.logsControls}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className={styles.linesSelect}
                value={logLines}
                onChange={(e) => setLogLines(Number(e.target.value))}
              >
                <option value={50}>50 lines</option>
                <option value={100}>100 lines</option>
                <option value={200}>200 lines</option>
                <option value={500}>500 lines</option>
                <option value={1000}>1000 lines</option>
                <option value={2000}>2000 lines</option>
              </select>
              <Button
                variant="primary"
                size="small"
                onClick={fetchDockerLogs}
                loading={logsLoading}
                disabled={!selectedContainer}
              >
                Refresh
              </Button>
              <label className={styles.autoRefreshLabel}>
                <input
                  type="checkbox"
                  checked={autoRefreshLogs}
                  onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                />
                Auto (3s)
              </label>
            </div>
          </div>
          <div className={styles.logsViewer} ref={logsContainerRef}>
            {logsLoading && !dockerLogs ? (
              <div className={styles.logsLoading}>
                <Spinner size="small" />
                <span>Loading logs...</span>
              </div>
            ) : (
              <div className={styles.logsContent}>
                {selectedContainer ? highlightLogs(filteredLogs) : 'Select a container to view logs'}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
          <div className={styles.logsFooter}>
            <Button variant="secondary" size="small" onClick={scrollToTop}>
              Top
            </Button>
            <Button variant="secondary" size="small" onClick={scrollToBottom}>
              Bottom
            </Button>
          </div>
        </Card>
      </section>
    </div>
  )
}

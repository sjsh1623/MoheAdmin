import styles from './Spinner.module.css'

export default function Spinner({ size = 'medium' }) {
  return <div className={`${styles.spinner} ${styles[size]}`} />
}

/** Without this a single render error blanks the whole site. One panel fails instead. */
import { Component } from 'react'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import { COLOR } from '../theme'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Render failed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-xl border bg-white p-6 text-center shadow-sm" style={{ borderColor: COLOR.grid }}>
          <ErrorOutlineIcon sx={{ fontSize: 34, color: COLOR.critical }} />
          <h1 className="mt-2 text-lg font-semibold" style={{ color: COLOR.ink }}>This screen failed to load</h1>
          <p className="mt-1 text-sm" style={{ color: COLOR.ink2 }}>
            The rest of the site still works. Reload, or go back to the overview.
          </p>
          <p className="mt-2 break-words text-xs" style={{ color: COLOR.muted }}>
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button type="button" onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: COLOR.seq[4] }}>
            Try again
          </button>
        </div>
      </div>
    )
  }
}

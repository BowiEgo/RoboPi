import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import Versions from './Versions'

// 模拟 electron 的 process.versions
beforeAll(() => {
  ;(window as any).electron = {
    process: {
      versions: {
        electron: '30.0.0',
        chrome: '120.0.0',
        node: '20.0.0'
      }
    }
  }
})

describe('Versions component', () => {
  it('should render electron version', () => {
    render(() => <Versions />)
    expect(screen.getByText('Electron v30.0.0')).toBeTruthy()
  })

  it('should render chrome version', () => {
    render(() => <Versions />)
    expect(screen.getByText('Chromium v120.0.0')).toBeTruthy()
  })

  it('should render node version', () => {
    render(() => <Versions />)
    expect(screen.getByText('Node v20.0.0')).toBeTruthy()
  })
})

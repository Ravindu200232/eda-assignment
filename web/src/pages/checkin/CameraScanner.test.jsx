/*
 * File:    CameraScanner.test.jsx
 * Module:  Operator Check-in - unit tests
 * Owner:   Ravindu
 * Purpose: Checks the camera scanner with a fake ZXing reader: a read code is
 *          passed on once, the camera is stopped, switching cameras starts a
 *          clean preview, and camera problems are explained to the operator.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CameraScanner from './CameraScanner'

const reader = vi.hoisted(() => ({ decode: vi.fn(), list: vi.fn() }))

vi.mock('@zxing/browser', () => ({
  BrowserQRCodeReader: class {
    decodeFromVideoDevice(...args) {
      return reader.decode(...args)
    }

    static listVideoInputDevices() {
      return reader.list()
    }
  },
}))

// Makes jsdom look like a secure page with a camera (or without one).
function setCameraSupport(supported) {
  Object.defineProperty(window, 'isSecureContext', { value: supported, configurable: true })
  Object.defineProperty(navigator, 'mediaDevices', {
    value: supported ? { getUserMedia: vi.fn() } : undefined,
    configurable: true,
  })
}

beforeEach(() => {
  setCameraSupport(true)
  reader.list.mockResolvedValue([
    { deviceId: 'front', label: 'Front camera' },
    { deviceId: 'back', label: 'Back camera' },
  ])
})

afterEach(() => {
  setCameraSupport(false)
})

describe('CameraScanner', () => {
  it('passes the first code on and stops the camera', async () => {
    const stop = vi.fn()
    reader.decode.mockImplementation(async (deviceId, video, onResult) => {
      setTimeout(() => {
        onResult({ getText: () => 'SSG1.abc.def.ghi' })
        onResult({ getText: () => 'SSG1.second.read' })
      }, 0)
      return { stop }
    })
    const onScan = vi.fn()

    render(<CameraScanner onScan={onScan} />)

    await waitFor(() => expect(onScan).toHaveBeenCalledWith('SSG1.abc.def.ghi'))
    expect(onScan).toHaveBeenCalledTimes(1)
    expect(stop).toHaveBeenCalled()
  })

  it('offers a camera choice when there is more than one camera', async () => {
    reader.decode.mockResolvedValue({ stop: vi.fn() })

    render(<CameraScanner onScan={vi.fn()} />)

    expect(await screen.findByRole('combobox', { name: 'Camera' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Back camera' })).toBeInTheDocument()
    expect(screen.getByText('Hold the QR code inside the frame. It is read automatically.')).toBeInTheDocument()
  })

  it('starts a fresh preview when another camera is chosen', async () => {
    const stops = [vi.fn(), vi.fn()]
    reader.decode.mockImplementationOnce(async () => ({ stop: stops[0] }))
    reader.decode.mockImplementationOnce(async () => ({ stop: stops[1] }))
    const { container } = render(<CameraScanner onScan={vi.fn()} />)

    const choice = await screen.findByRole('combobox', { name: 'Camera' })
    fireEvent.change(choice, { target: { value: 'back' } })

    await waitFor(() => expect(reader.decode).toHaveBeenCalledTimes(2))
    const [firstVideo, secondVideo] = reader.decode.mock.calls.map((call) => call[1])
    expect(reader.decode.mock.calls[1][0]).toBe('back')
    expect(stops[0]).toHaveBeenCalled()
    expect(firstVideo).not.toBe(secondVideo)
    expect(container.contains(firstVideo)).toBe(false)
    expect(container.contains(secondVideo)).toBe(true)
  })

  it('explains a blocked camera permission', async () => {
    reader.decode.mockRejectedValue(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }))

    render(<CameraScanner onScan={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Camera access was blocked.')
  })

  it('explains why the camera cannot be used on an insecure page', () => {
    setCameraSupport(false)

    render(<CameraScanner onScan={vi.fn()} />)

    expect(screen.getByText('Camera not available on this page')).toBeInTheDocument()
    expect(reader.decode).not.toHaveBeenCalled()
  })
})

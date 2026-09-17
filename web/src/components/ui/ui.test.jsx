/*
 * File:    ui.test.jsx
 * Module:  Core UI - unit tests
 * Owner:   Ravindu
 * Purpose: Checks the shared components that every page relies on:
 *          accessible fields, keyboard tabs, dialogs and list states.
 */
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DataTable from './DataTable'
import EmptyState from './EmptyState'
import Field from './Field'
import FormAlert from './FormAlert'
import Input from './Input'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import Tabs from './Tabs'

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'current', label: 'Current', count: 3 },
  { value: 'history', label: 'History' },
]

// Tabs with their own state, like a page would use them.
function TabsDemo() {
  const [value, setValue] = useState('pending')
  return (
    <>
      <Tabs label="Booking lists" tabs={TABS} value={value} onChange={setValue} />
      <p>showing {value}</p>
    </>
  )
}

describe('Field and Input', () => {
  it('links the label, error and hint to the control', () => {
    render(
      <Field label="Email" hint="Use your work email." error="Enter a valid email address." required>
        <Input />
      </Field>,
    )

    const input = screen.getByLabelText(/^Email/)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toBeRequired()
    expect(input).toHaveAccessibleDescription('Enter a valid email address. Use your work email.')
  })
})

describe('Tabs', () => {
  it('changes the selection by click and with the arrow keys', async () => {
    render(<TabsDemo />)
    const pending = screen.getByRole('tab', { name: 'Pending' })
    expect(pending).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Current 3' })).toHaveAttribute('tabindex', '-1')

    await userEvent.click(screen.getByRole('tab', { name: 'History' }))
    expect(screen.getByText('showing history')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('tab', { name: 'History' }), { key: 'ArrowRight' })
    expect(screen.getByText('showing pending')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pending' })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Pending' }), { key: 'End' })
    expect(screen.getByText('showing history')).toBeInTheDocument()
  })
})

describe('Modal', () => {
  it('shows its content only while open and closes with Escape', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <Modal open={false} onClose={onClose} title="Edit station">
        <p>Form body</p>
      </Modal>,
    )
    expect(screen.queryByText('Form body')).not.toBeInTheDocument()

    rerender(
      <Modal open onClose={onClose} title="Edit station">
        <p>Form body</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Edit station' })).toBeInTheDocument()

    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stays open on Escape while it is busy', () => {
    const onClose = vi.fn()
    render(
      <Modal open dismissible={false} onClose={onClose} title="Saving">
        <p>Please wait</p>
      </Modal>,
    )

    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})

describe('DataTable', () => {
  const columns = [
    { key: 'name', header: 'Name', primary: true },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ]

  it('draws a row per record', () => {
    render(<DataTable caption="Stations" columns={columns} rows={[{ id: 1, name: 'Malabe', status: 'Active' }]} />)

    expect(screen.getByRole('table', { name: 'Stations' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Malabe' })).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows loading, error and empty states', async () => {
    const retry = vi.fn()
    const { rerender } = render(<DataTable columns={columns} rows={undefined} loading />)
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument()

    rerender(<DataTable columns={columns} rows={[]} error="Cannot reach the API." onRetry={retry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach the API.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalled()

    rerender(<DataTable columns={columns} rows={[]} empty={<EmptyState title="No stations yet" />} />)
    expect(screen.getByRole('heading', { name: 'No stations yet' })).toBeInTheDocument()
  })
})

describe('small helpers', () => {
  it('StatusBadge writes enum values as words', () => {
    render(<StatusBadge status="GridOperator" />)
    expect(screen.getByText('Grid Operator')).toBeInTheDocument()
  })

  it('FormAlert points to field errors instead of repeating them', () => {
    const { rerender } = render(<FormAlert error="NIC is required." fieldErrors={{ nic: 'NIC is required.' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Please check the highlighted fields.')

    rerender(<FormAlert error="This station has booking history." />)
    expect(screen.getByRole('alert')).toHaveTextContent('This station has booking history.')

    rerender(<FormAlert error={null} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

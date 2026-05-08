import { render, screen } from '@testing-library/react'
import Home from '../app/page'
import { expect, test, vi } from 'vitest'

// Mock framer-motion to avoid issues with animations in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

test('renders the landing page with the correct title', () => {
  render(<Home />)
  // There are multiple "OmniReads" (nav logo and footer copyright)
  const logoElements = screen.getAllByText(/OmniReads/i)
  expect(logoElements.length).toBeGreaterThan(0)
  
  expect(screen.getByText(/Curate. Review./i)).toBeDefined()
})

test('renders the "Get Started" link', () => {
  render(<Home />)
  const link = screen.getByText(/Get Started/i)
  expect(link).toBeDefined()
})

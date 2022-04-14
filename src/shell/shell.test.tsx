import React from 'react';
import { render, screen } from '@testing-library/react';
import Shell from './shell';

test('renders shell waiting', () => {
  render(<Shell />);
  const waitingElement = screen.getByText(/Please wait/i);
  expect(waitingElement).toBeInTheDocument();
});

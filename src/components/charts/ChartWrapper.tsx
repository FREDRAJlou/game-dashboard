'use client';

import { ReactNode } from 'react';
import { Box, Paper, Typography, CircularProgress, Alert } from '@mui/material';

interface ChartWrapperProps {
  title?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  height?: number | string;
  showEmpty?: boolean;
}

export default function ChartWrapper({
  title,
  children,
  loading = false,
  error = null,
  emptyMessage = 'No data available',
  height = 350,
  showEmpty = false,
}: ChartWrapperProps) {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {title && (
        <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
          {title}
        </Typography>
      )}

      <Box
        sx={{
          flexGrow: 1,
          minHeight: typeof height === 'number' ? `${height}px` : height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        ) : showEmpty ? (
          <Alert severity="info" sx={{ width: '100%' }}>
            {emptyMessage}
          </Alert>
        ) : (
          <Box sx={{ width: '100%', height: '100%' }}>{children}</Box>
        )}
      </Box>
    </Paper>
  );
}

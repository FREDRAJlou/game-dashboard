'use client';

import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  Fade,
  useTheme,
  alpha,
} from '@mui/material';
import {
  SportsEsports,
  Leaderboard,
  Speed,
  EmojiEvents,
  ArrowForward,
} from '@mui/icons-material';
import * as THREE from 'three';

// 3D Ping Pong Ball Component
function PingPongBall({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere args={[0.8, 32, 32]} position={position}>
        <MeshDistortMaterial
          color="#00e5ff"
          attach="material"
          distort={0.3}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
}

// 3D Table Tennis Paddle
function Paddle({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <group position={position} rotation={[0.3, 0.5, 0]}>
        {/* Paddle face */}
        <mesh>
          <cylinderGeometry args={[1.2, 1.2, 0.1, 32]} />
          <meshStandardMaterial color="#ff1744" metalness={0.3} roughness={0.4} />
        </mesh>
        {/* Handle */}
        <mesh position={[0, -1, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 1, 16]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      </group>
    </Float>
  );
}

// 3D Scene
function Scene3D() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00e5ff" />
      
      <PingPongBall position={[-2, 0, 0]} />
      <PingPongBall position={[2, 1, -1]} />
      <Paddle position={[0, -1, 0]} />
      
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
    </>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const theme = useTheme();

  const features = [
    {
      icon: <Leaderboard sx={{ fontSize: 48 }} />,
      title: 'Live Rankings',
      description: 'Real-time leaderboard updates as matches complete',
    },
    {
      icon: <Speed sx={{ fontSize: 48 }} />,
      title: 'Quick Match',
      description: 'Record match results instantly with intuitive controls',
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 48 }} />,
      title: 'Tournaments',
      description: 'Organize and track competitive tournaments',
    },
    {
      icon: <SportsEsports sx={{ fontSize: 48 }} />,
      title: 'Performance Stats',
      description: 'Detailed analytics and match history tracking',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.grey[900]} 0%, #0a0a0f 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 3D Background Canvas */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      >
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <Suspense fallback={null}>
            <Scene3D />
          </Suspense>
        </Canvas>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 8 }}>
        <Stack spacing={8} alignItems="center">
          {/* Hero Section */}
          <Fade in timeout={1000}>
            <Stack spacing={4} alignItems="center" textAlign="center" sx={{ pt: 8 }}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '3rem', md: '6rem' },
                  fontWeight: 900,
                  background: 'linear-gradient(45deg, #00e5ff 30%, #7c4dff 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 40px rgba(0, 229, 255, 0.3)',
                }}
              >
                TABLE TENNIS
              </Typography>
              
              <Typography
                variant="h3"
                sx={{
                  fontSize: { xs: '1.5rem', md: '2.5rem' },
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                Tournament Dashboard
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  maxWidth: 800,
                  color: theme.palette.grey[300],
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  lineHeight: 1.6,
                }}
              >
                Track your matches, analyze your performance, and dominate the leaderboard 
                in the ultimate ping pong showdown!
              </Typography>

              {/* CTA Buttons */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ mt: 4, width: '100%', justifyContent: 'center' }}
              >
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => router.push('/login')}
                  sx={{
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    background: 'linear-gradient(45deg, #00e5ff 30%, #2196f3 90%)',
                    boxShadow: '0 8px 32px rgba(0, 229, 255, 0.35)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #00b8d4 30%, #1976d2 90%)',
                      boxShadow: '0 12px 40px rgba(0, 229, 255, 0.5)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Get Started
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => router.push('/dashboard')}
                  sx={{
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    borderWidth: 2,
                    borderColor: '#00e5ff',
                    color: '#00e5ff',
                    '&:hover': {
                      borderWidth: 2,
                      borderColor: '#00e5ff',
                      backgroundColor: alpha('#00e5ff', 0.1),
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  View Leaderboard
                </Button>
              </Stack>
            </Stack>
          </Fade>

          {/* Features Grid */}
          <Grid container spacing={3} sx={{ mt: 4 }}>
            {features.map((feature, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                <Fade in timeout={1000 + index * 200}>
                  <Card
                    sx={{
                      height: '100%',
                      background: alpha(theme.palette.background.paper, 0.1),
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha('#00e5ff', 0.2)}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        border: `1px solid ${alpha('#00e5ff', 0.5)}`,
                        boxShadow: `0 12px 32px ${alpha('#00e5ff', 0.3)}`,
                      },
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2} alignItems="center" textAlign="center">
                        <Box sx={{ color: '#00e5ff' }}>{feature.icon}</Box>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: theme.palette.grey[400] }}>
                          {feature.description}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>

          {/* Footer */}
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.grey[600],
              mt: 8,
              pb: 4,
            }}
          >
            Built with ❤️ for ping pong enthusiasts
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}

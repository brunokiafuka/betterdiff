import { useEffect, useRef, useState } from 'react'
import './FlickeringGrid.css'

interface FlickeringGridProps {
  squareSize?: number
  gridGap?: number
  flickerChance?: number
  color?: string
  width?: number
  height?: number
  className?: string
  maxOpacity?: number
}

export function FlickeringGrid({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.1,
  color = '#6B7280',
  width,
  height,
  className = '',
  maxOpacity = 0.5,
}: FlickeringGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const [dimensions, setDimensions] = useState({ width: 1200, height: 3000 })

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: width || window.innerWidth,
        height: height || window.innerHeight * 3,
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [width, height])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = dimensions.width
    canvas.height = dimensions.height

    const cols = Math.floor(dimensions.width / (squareSize + gridGap))
    const rows = Math.floor(dimensions.height / (squareSize + gridGap))
    const squares: Array<{ opacity: number; x: number; y: number }> = []

    // Initialize squares
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        squares.push({
          opacity: Math.random() * maxOpacity,
          x: col * (squareSize + gridGap),
          y: row * (squareSize + gridGap),
        })
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height)
      ctx.fillStyle = color

      squares.forEach((square) => {
        // Randomly flicker squares
        if (Math.random() < flickerChance) {
          square.opacity = Math.random() * maxOpacity
        }

        ctx.globalAlpha = square.opacity
        ctx.fillRect(square.x, square.y, squareSize, squareSize)
      })

      ctx.globalAlpha = 1
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [squareSize, gridGap, flickerChance, color, dimensions.width, dimensions.height, maxOpacity])

  return (
    <canvas
      ref={canvasRef}
      className={`flickering-grid ${className}`}
    />
  )
}

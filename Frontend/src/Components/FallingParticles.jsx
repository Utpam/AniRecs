import React, { useEffect, useRef } from 'react';

const FallingParticles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle Configuration
    const particleCount = 40;
    const particles = [];

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -canvas.height;
        this.size = Math.random() * 3 + 1;
        
        this.speedY = Math.random() * 0.5 + 0.2; // Was Math.random() * 2 + 1 (Slows vertical fall)
        this.speedX = Math.random() * 0.2 - 0.1; // Was Math.random() * 1 - 0.5 (Slows side drift)
        
        this.color = 'rgba(255, 255, 255, 0.8)';
       }

      update() {
        this.y += this.speedY;
        this.x += this.speedX;

        // Reset particle when it goes off the bottom
        if (this.y > canvas.height) {
          this.y = -10;
          this.x = Math.random() * canvas.width;
          
          // Update the reset speed to match your new slow speeds
          this.speedY = Math.random() * 0.5 + 0.2; 
        }
        if (this.x > canvas.width || this.x < 0) {
          this.x = Math.random() * canvas.width;
        }
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Animation Loop
    const animate = () => {
      // Use a slight opacity clear for a motion blur effect, or clearRect for crisp dots
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1, // Places it behind your content
        // background: '#111827', // Dark background 
      }}
      className='absolute overflow-x-hidden block'
    />
  );
};

export default FallingParticles;

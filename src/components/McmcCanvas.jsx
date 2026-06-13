import React, { useRef, useEffect, useState, useCallback } from 'react';

const McmcCanvas = ({ sampler, isRunning, onStep, version }) => {
  const canvasRef = useRef(null);
  const backgroundCanvasRef = useRef(null); // Offscreen canvas for heatmap cache
  const [ctx, setCtx] = useState(null);

  // Coordinate mapping: Math (-4 to 4) -> Canvas (0 to 500)
  const range = 8;
  const offset = 4;
  const canvasSize = 1000; // Logical size for high res

  const mathToCanvas = (val) => ((val + offset) / range) * canvasSize;
  
  // Render heatmap background once when distribution changes
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Setup offscreen canvas
    if (!backgroundCanvasRef.current) {
      backgroundCanvasRef.current = document.createElement('canvas');
      backgroundCanvasRef.current.width = canvasSize;
      backgroundCanvasRef.current.height = canvasSize;
    }
    
    const bgCtx = backgroundCanvasRef.current.getContext('2d');
    const imageData = bgCtx.createImageData(canvasSize, canvasSize);
    const data = imageData.data;

    // Determine max PDF value for scaling colors
    let maxPdf = 0;
    // Fast coarse pass to find approx max
    for (let x = 0; x < canvasSize; x += 10) {
      for (let y = 0; y < canvasSize; y += 10) {
        const mathX = (x / canvasSize) * range - offset;
        const mathY = -((y / canvasSize) * range - offset); // flip Y
        const p = sampler.distribution.pdf(mathX, mathY);
        if (p > maxPdf) maxPdf = p;
      }
    }

    // Fill image data
    for (let x = 0; x < canvasSize; x++) {
      for (let y = 0; y < canvasSize; y++) {
        const mathX = (x / canvasSize) * range - offset;
        const mathY = -((y / canvasSize) * range - offset);
        
        let p = sampler.distribution.pdf(mathX, mathY);
        let intensity = p / maxPdf;
        
        // Custom colormap (Dark Blue -> Purple -> Pink -> White)
        // using simple interpolation for the "heatmap" look
        const i = (y * canvasSize + x) * 4;
        
        data[i] = Math.min(255, intensity * 255 + 20);     // R
        data[i + 1] = Math.min(255, intensity * 100 + 20); // G
        data[i + 2] = Math.min(255, intensity * 200 + 40); // B
        data[i + 3] = 255;                                 // A
      }
    }
    
    bgCtx.putImageData(imageData, 0, 0);
    
    const mainCtx = canvasRef.current.getContext('2d');
    setCtx(mainCtx);
    
    // Initial draw
    mainCtx.drawImage(backgroundCanvasRef.current, 0, 0);
    
  }, [sampler.distribution]); // Re-run when distribution changes

  // Extract drawing logic so it can be called manually or in loop
  const drawFrame = useCallback(() => {
    if (!ctx) return;
    // 1. Draw Background
    ctx.drawImage(backgroundCanvasRef.current, 0, 0);

    // 3. Draw History (faint dots)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    sampler.samples.forEach(s => {
      const cx = mathToCanvas(s.x);
      const cy = mathToCanvas(-s.y); // Flip Y
      ctx.fillRect(cx, cy, 4, 4); // Larger dots for high res
    });

    // 4. Draw Current Proposal lines (just the last few to show movement)
    const recentProposals = sampler.proposals.slice(-20);
    recentProposals.forEach((p, idx) => {
      const alpha = (idx + 1) / 20; // Fade out older proposals
      const fromX = mathToCanvas(p.fromX);
      const fromY = mathToCanvas(-p.fromY);
      const toX = mathToCanvas(p.toX);
      const toY = mathToCanvas(-p.toY);

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = p.accepted 
        ? `rgba(16, 185, 129, ${alpha})` // Green success
        : `rgba(239, 68, 68, ${alpha})`; // Red reject
      ctx.lineWidth = 3; // Thicker lines for high res
      ctx.stroke();
      
      // Draw dot at proposed location
      ctx.beginPath();
      ctx.arc(toX, toY, 6, 0, 2 * Math.PI); // Larger dots
      ctx.fillStyle = p.accepted 
        ? `rgba(16, 185, 129, ${alpha})` 
        : `rgba(239, 68, 68, ${alpha})`;
      ctx.fill();
    });

    // 5. Draw Current State (bright dot)
    if (sampler.samples.length > 0) {
      const current = sampler.samples[sampler.samples.length - 1];
      ctx.beginPath();
      ctx.arc(mathToCanvas(current.x), mathToCanvas(-current.y), 10, 0, 2 * Math.PI); // Larger dot
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4; // Thicker stroke
      ctx.stroke();
    }
  }, [ctx, sampler]);

  // Draw once when version changes (useful for manual stepping when not running)
  useEffect(() => {
    if (!isRunning) {
      drawFrame();
    }
  }, [version, isRunning, drawFrame]);

  // Animation Loop for Continuous Mode
  useEffect(() => {
    if (!ctx || !isRunning) return;

    let animationFrameId;
    let stepsPerFrame = 5; // Speed up animation

    const render = () => {
      // Take steps in math engine
      for(let i=0; i<stepsPerFrame; i++) {
        sampler.step();
      }
      onStep(); // Notify parent to update metrics
      
      drawFrame();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [ctx, isRunning, sampler, onStep, drawFrame]);

  return (
    <div className="canvas-container">
      <canvas 
        ref={canvasRef} 
        width={canvasSize} 
        height={canvasSize}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
};

export default McmcCanvas;

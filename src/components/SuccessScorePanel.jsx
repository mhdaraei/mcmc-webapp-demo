import React, { useMemo } from 'react';

// A simple utility to compute the empirical histogram intersection (overlap)
const computeOverlapScore = (samples, distribution) => {
  if (samples.length < 50) return null; // Wait for enough samples

  const bins = 30;
  const min = -5;
  const max = 5;
  const range = max - min;
  
  // 1. Calculate normalized GT density
  let gtSum = 0;
  const gtGrid = new Float32Array(bins * bins);
  for (let i = 0; i < bins; i++) {
    for (let j = 0; j < bins; j++) {
      const x = min + (i + 0.5) * (range / bins);
      const y = min + (j + 0.5) * (range / bins);
      const prob = Math.exp(distribution.logPdf(x, y));
      gtGrid[i * bins + j] = prob;
      gtSum += prob;
    }
  }
  
  // 2. Bin the samples
  const sampleGrid = new Float32Array(bins * bins);
  let validSamples = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.x >= min && s.x < max && s.y >= min && s.y < max) {
      const bx = Math.floor(((s.x - min) / range) * bins);
      const by = Math.floor(((s.y - min) / range) * bins);
      if (bx >= 0 && bx < bins && by >= 0 && by < bins) {
        sampleGrid[bx * bins + by]++;
        validSamples++;
      }
    }
  }
  
  if (validSamples === 0) return 0;
  
  // 3. Compute Histogram Intersection
  let overlap = 0;
  for (let i = 0; i < bins * bins; i++) {
    const gtProb = gtGrid[i] / gtSum;
    const sampleProb = sampleGrid[i] / validSamples;
    overlap += Math.min(gtProb, sampleProb);
  }
  
  return overlap;
};

const SuccessScorePanel = ({ sampler, version }) => {
  const score = useMemo(() => {
    return computeOverlapScore(sampler.samples, sampler.distribution);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, sampler]); // update when version changes

  return (
    <div className="panel">
      <div className="panel-header">Simulation Success Score</div>
      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2rem 1rem' }}>
        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
          This panel computes the <strong>Bhattacharyya Histogram Intersection</strong> between the Ground Truth (GT) target density and the empirical density of your samples.
          <br/><br/>
          A score of 100% means the MCMC chain has perfectly mapped the target distribution.
        </p>

        {score === null ? (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Collecting more samples... ({sampler.samples.length} / 50)
          </div>
        ) : (
          <>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: 'bold', 
              color: score > 0.8 ? 'var(--accent-success)' : (score > 0.5 ? '#f59e0b' : 'var(--accent-danger)'),
              fontFamily: 'var(--font-mono)'
            }}>
              {(score * 100).toFixed(1)}%
            </div>
            <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
              {score > 0.8 ? 'Excellent Fit!' : (score > 0.5 ? 'Moderate Fit' : 'Poor Fit / Burn-in Phase')}
            </div>
            
            {/* Simple progress bar visual */}
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${score * 100}%`, 
                background: score > 0.8 ? 'var(--accent-success)' : (score > 0.5 ? '#f59e0b' : 'var(--accent-danger)'),
                transition: 'width 0.3s ease-in-out'
              }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SuccessScorePanel;

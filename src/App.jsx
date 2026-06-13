import React, { useState, useEffect, useMemo, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Play, Pause, StepForward, RotateCcw } from 'lucide-react';
import './App.css';
import { IsotropicGaussian, Rosenbrock, GaussianMixture } from './math/distributions';
import { MetropolisHastings } from './math/sampler';
import McmcCanvas from './components/McmcCanvas';
import TracePlot from './components/TracePlot';
import MarginalHistogram from './components/MarginalHistogram';
import SuccessScorePanel from './components/SuccessScorePanel';

// Custom KaTeX wrappers to avoid third-party bugs
const InlineMath = ({ math }) => (
  <span dangerouslySetInnerHTML={{ __html: katex.renderToString(math, { throwOnError: false }) }} />
);
const BlockMath = ({ math }) => (
  <div className="katex-display" dangerouslySetInnerHTML={{ __html: katex.renderToString(math, { displayMode: true, throwOnError: false }) }} />
);

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [stepSize, setStepSize] = useState(1.0);
  const [targetType, setTargetType] = useState('gaussian');
  const [gmmDistance, setGmmDistance] = useState(2.5);
  
  // State for the Step Inspector
  const [lastStepData, setLastStepData] = useState(null);
  
  // Metrics state
  const [acceptanceRate, setAcceptanceRate] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [samplesVersion, setSamplesVersion] = useState(0); // For forcing chart updates

  const distributions = useMemo(() => ({
    gaussian: new IsotropicGaussian(0, 0, 1.5),
    rosenbrock: new Rosenbrock(1, 10),
    gmm: new GaussianMixture(gmmDistance)
  }), [gmmDistance]);

  const sampler = useMemo(() => {
    return new MetropolisHastings(distributions[targetType], 0, 0, stepSize);
  }, []);

  useEffect(() => {
    setIsRunning(false);
    sampler.setDistribution(distributions[targetType]);
    setTotalSteps(0);
    setAcceptanceRate(0);
    setLastStepData(null);
    setSamplesVersion(v => v + 1);
  }, [targetType, sampler, distributions]);

  useEffect(() => {
    sampler.setStepSize(stepSize);
  }, [stepSize, sampler]);

  const handleManualStep = () => {
    setIsRunning(false);
    const result = sampler.step();
    setLastStepData(result);
    setAcceptanceRate(sampler.getAcceptanceRate());
    setTotalSteps(sampler.totalSteps);
    setSamplesVersion(v => v + 1);
  };

  const handleContinuousStep = useCallback(() => {
    // We don't update the LastStepData in continuous mode to save performance, 
    // or we just take the last one of the batch.
    setAcceptanceRate(sampler.getAcceptanceRate());
    setTotalSteps(sampler.totalSteps);
    setSamplesVersion(v => v + 1);
    
    if (sampler.proposals.length > 0) {
      setLastStepData(sampler.proposals[sampler.proposals.length - 1]);
    }
  }, [sampler]);

  const handleReset = () => {
    setIsRunning(false);
    sampler.reset(0, 0);
    setTotalSteps(0);
    setAcceptanceRate(0);
    setLastStepData(null);
    setSamplesVersion(v => v + 1);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar - Explanatory Text and Controls */}
      <aside className="sidebar">
        <header className="sidebar-header">
          <h2>MCMC Laboratory</h2>
          <p>Interactive Metropolis-Hastings</p>
        </header>

        <div className="sidebar-content">
          <div className="control-panel">
            <h3>Target Distribution</h3>
            <select 
              value={targetType} 
              onChange={(e) => setTargetType(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.1)', color: 'white', 
                padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--card-border)',
                width: '100%', marginBottom: '0.5rem'
              }}
            >
              <option value="gaussian">Isotropic Gaussian (Easy)</option>
              <option value="rosenbrock">Rosenbrock Banana (Hard)</option>
              <option value="gmm">Gaussian Mixture (Multi-modal)</option>
            </select>
            {targetType === 'gaussian' && (
              <BlockMath math={String.raw`f(x, y) = \exp\left(-\frac{x^2 + y^2}{2\sigma^2}\right)`} />
            )}
            {targetType === 'rosenbrock' && (
              <BlockMath math={String.raw`f(x, y) = \exp\left(-\left[(1-x)^2 + 10(y-x^2)^2\right]\right)`} />
            )}
            {targetType === 'gmm' && (
              <>
                <BlockMath math={String.raw`f(x,y) = \sum_{i=1}^2 \mathcal{N}(\mu_i, \Sigma)`} />
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85em'}}>
                  <span>Mode Separation</span>
                  <span style={{color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)'}}>{gmmDistance.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="1.0" max="4.0" step="0.1" 
                  value={gmmDistance} 
                  onChange={(e) => setGmmDistance(parseFloat(e.target.value))} 
                />
              </>
            )}
            
            <p style={{fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '1rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem'}}>
              <strong>What is MCMC?</strong><br/>
              Markov Chain Monte Carlo algorithms help us sample from complex probability distributions <InlineMath math={String.raw`P(X,Y)`} /> where direct sampling is impossible. It does this by creating a "random walk" (a Markov chain) that spends more time in high-probability regions. Here, <InlineMath math={String.raw`X`} /> and <InlineMath math={String.raw`Y`} /> represent two abstract parameters we are trying to infer (for example, the slope and intercept of a line).
            </p>
          </div>

          <div className="control-panel">
            <h3>Proposal Configuration</h3>
            <p style={{fontSize: '0.85em', color: 'var(--text-muted)'}}>
              Symmetric Gaussian Walk: <InlineMath math={String.raw`q(x'|x) \sim \mathcal{N}(x, \sigma^2)`} />
            </p>
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem'}}>
              <span>Step Size (<InlineMath math={String.raw`\sigma`} />)</span>
              <span style={{color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)'}}>{stepSize.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0.1" max="5.0" step="0.1" 
              value={stepSize} 
              onChange={(e) => setStepSize(parseFloat(e.target.value))} 
            />
          </div>

          <div className="control-panel">
            <h3>Execution Controls</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button className="primary" onClick={handleManualStep} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                <StepForward size={14} /> Next Step
              </button>
              <button onClick={() => setIsRunning(!isRunning)} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                {isRunning ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Run Auto</>}
              </button>
            </div>
            <button onClick={handleReset} style={{marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
              <RotateCcw size={14} /> Reset Simulation
            </button>
          </div>

          <div className="control-panel">
            <h3>Global Metrics</h3>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: 'var(--text-muted)'}}>Total Steps:</span>
              <span style={{fontFamily: 'var(--font-mono)'}}>{totalSteps.toLocaleString()}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem'}}>
              <span style={{color: 'var(--text-muted)'}}>Acceptance Rate:</span>
              <span style={{fontFamily: 'var(--font-mono)'}}>{(acceptanceRate * 100).toFixed(1)}%</span>
            </div>
            <p style={{fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
              Optimal rate is typically between 23% and 50%.
            </p>
          </div>
        </div>
      </aside>

      {/* Main 4-Panel Grid */}
      <main className="main-content">
        <div className="lab-grid">
          
          {/* Panel 1 (Left Col, Row 1): Main Arena */}
          <div className="panel">
            <div className="panel-header">Phase Space & Particle Trajectory</div>
            <div className="panel-body" style={{padding: '0'}}>
               <McmcCanvas 
                 sampler={sampler} 
                 isRunning={isRunning} 
                 onStep={handleContinuousStep}
                 version={samplesVersion}
               />
            </div>
          </div>

          {/* Panel 2 (Right Col, Row 1): Step Inspector */}
          <div className="panel">
            <div className="panel-header">Step-by-Step Inspector</div>
            <div className="panel-body">
              {!lastStepData ? (
                <div style={{textAlign: 'center', color: 'var(--text-muted)'}}>
                  Click "Next Step" to see the math engine in action.
                </div>
              ) : (
                <div className="inspector-grid">
                  <div className="inspector-box">
                    <span style={{color: 'var(--text-muted)'}}>Current <InlineMath math={String.raw`x`} /></span>
                    <br/>
                    ({lastStepData.fromX.toFixed(2)}, {lastStepData.fromY.toFixed(2)})
                  </div>
                  <div className="inspector-box">
                    <span style={{color: 'var(--text-muted)'}}>Proposal <InlineMath math={String.raw`x'`} /></span>
                    <br/>
                    ({lastStepData.toX.toFixed(2)}, {lastStepData.toY.toFixed(2)})
                  </div>
                  
                  <div className="inspector-box" style={{gridColumn: 'span 2'}}>
                    <span style={{color: 'var(--text-muted)'}}>Acceptance Probability <InlineMath math={String.raw`\alpha`} /></span>
                    <BlockMath math={String.raw`\alpha = \min\left(1, \frac{f(x')}{f(x)}\right)`} />
                    <div style={{textAlign: 'center', fontFamily: 'var(--font-mono)'}}>
                       = Math.min(1, exp({lastStepData.logProbProposal.toFixed(2)} - {lastStepData.logProbCurrent.toFixed(2)}))
                       <br/>
                       = {lastStepData.alpha.toFixed(4)}
                    </div>
                  </div>

                  <div className={`inspector-result ${lastStepData.accepted ? 'accept' : 'reject'}`}>
                    <InlineMath math={String.raw`u \sim \mathcal{U}(0,1)`} /> = {lastStepData.u.toFixed(4)}
                    <br/>
                    {lastStepData.u <= lastStepData.alpha ? (
                      <span><InlineMath math={String.raw`u \le \alpha \implies `} /> <strong>ACCEPTED</strong></span>
                    ) : (
                      <span><InlineMath math={String.raw`u > \alpha \implies `} /> <strong>REJECTED</strong></span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel 3 (Left Col, Row 2): Success Score Panel */}
          <SuccessScorePanel sampler={sampler} version={samplesVersion} />

          {/* Panel 4 (Right Col, Row 2): Plots */}
          <div className="panel" style={{display: 'flex', flexDirection: 'column', gap: '0'}}>
             <div className="panel-header">Trace Plots & Marginals</div>
             <div className="panel-body" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
               <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0'}}>
                 <strong>What are we looking at?</strong> These charts track the history of the sampler. <br/>
                 • <strong>Trace Plots:</strong> Shows the value of parameter <InlineMath math={String.raw`X`} /> and parameter <InlineMath math={String.raw`Y`} /> at each step. A "hairy caterpillar" look means good mixing. Long flat lines mean the sampler is stuck (low acceptance).<br/>
                 • <strong>Marginal Histograms:</strong> Shows the accumulated density of samples for each parameter independently. Over time, these should match the true 1D marginal distributions.
               </p>
               <TracePlot samples={sampler.samples} version={samplesVersion} />
               <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                 <MarginalHistogram samples={sampler.samples} dimension="x" color="rgba(59, 130, 246, 0.6)" version={samplesVersion} />
                 <MarginalHistogram samples={sampler.samples} dimension="y" color="rgba(139, 92, 246, 0.6)" version={samplesVersion} />
               </div>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;

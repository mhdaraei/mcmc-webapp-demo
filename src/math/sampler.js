/**
 * Box-Muller transform to generate normally distributed random numbers.
 */
function randomNormal() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class MetropolisHastings {
  constructor(distribution, startX = 0, startY = 0, stepSize = 1.0) {
    this.distribution = distribution;
    this.x = startX;
    this.y = startY;
    this.stepSize = stepSize;
    
    // Tracking
    this.samples = [{x: startX, y: startY}];
    this.proposals = []; // Track proposed states for visualization
    this.acceptedCount = 0;
    this.totalSteps = 0;
    
    // For calculating the acceptance probability of the last step
    this.lastAlpha = 0;
  }

  setStepSize(size) {
    this.stepSize = size;
  }
  
  setDistribution(dist) {
    this.distribution = dist;
    // We keep the current position but clear history to avoid confusing artifacts
    this.reset(this.x, this.y);
  }

  reset(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.samples = [{x, y}];
    this.proposals = [];
    this.acceptedCount = 0;
    this.totalSteps = 0;
  }

  step() {
    this.totalSteps++;
    
    // 1. Propose a new state from a symmetric Gaussian proposal distribution
    const propX = this.x + randomNormal() * this.stepSize;
    const propY = this.y + randomNormal() * this.stepSize;
    
    // 2. Calculate log acceptance probability
    // Since proposal is symmetric, q(x'|x) = q(x|x'), they cancel out.
    // alpha = min(1, P(x') / P(x)) => log(alpha) = min(0, logP(x') - logP(x))
    const logProbCurrent = this.distribution.logPdf(this.x, this.y);
    const logProbProposal = this.distribution.logPdf(propX, propY);
    
    const logAlpha = logProbProposal - logProbCurrent;
    this.lastAlpha = Math.exp(Math.min(0, logAlpha));
    
    // 3. Accept or reject
    const logU = Math.log(Math.random());
    let accepted = false;
    
    if (logU < logAlpha) {
      this.x = propX;
      this.y = propY;
      this.acceptedCount++;
      accepted = true;
    }
    
    // Record for visualization and inspector
    const state = {
      fromX: this.samples[this.samples.length - 1].x,
      fromY: this.samples[this.samples.length - 1].y,
      toX: propX,
      toY: propY,
      logProbCurrent,
      logProbProposal,
      logAlpha,
      alpha: Math.exp(Math.min(0, logAlpha)),
      u: Math.exp(logU),
      accepted
    };
    
    this.proposals.push(state);
    this.samples.push({x: this.x, y: this.y});
    
    return state;
  }

  getAcceptanceRate() {
    if (this.totalSteps === 0) return 0;
    return this.acceptedCount / this.totalSteps;
  }
}

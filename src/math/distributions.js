/**
 * Base class for a 2D probability distribution.
 */
export class Distribution2D {
  // Returns the unnormalized log probability density at (x, y)
  logPdf(x, y) {
    return 0;
  }
  
  // Returns the probability density at (x, y), scaled for visualization
  pdf(x, y) {
    return Math.exp(this.logPdf(x, y));
  }
}

export class IsotropicGaussian extends Distribution2D {
  constructor(muX = 0, muY = 0, sigma = 1) {
    super();
    this.muX = muX;
    this.muY = muY;
    this.sigma = sigma;
    this.variance = sigma * sigma;
  }

  logPdf(x, y) {
    const dx = x - this.muX;
    const dy = y - this.muY;
    return -(dx * dx + dy * dy) / (2 * this.variance);
  }
}

export class CorrelatedGaussian extends Distribution2D {
  constructor(muX = 0, muY = 0, sigmaX = 1, sigmaY = 1, rho = 0.8) {
    super();
    this.muX = muX;
    this.muY = muY;
    this.sigmaX = sigmaX;
    this.sigmaY = sigmaY;
    this.rho = rho;
    this.zScale = -1 / (2 * (1 - rho * rho));
  }

  logPdf(x, y) {
    const dx = (x - this.muX) / this.sigmaX;
    const dy = (y - this.muY) / this.sigmaY;
    const z = dx * dx - 2 * this.rho * dx * dy + dy * dy;
    return this.zScale * z;
  }
}

export class Rosenbrock extends Distribution2D {
  constructor(a = 1, b = 10) {
    super();
    this.a = a;
    this.b = b;
    // Scale down the output slightly to fit well in typical (-3, 3) coordinate spaces
    this.scale = 0.05; 
  }

  logPdf(x, y) {
    // Rosenbrock function: f(x,y) = (a-x)^2 + b(y-x^2)^2
    // We want to sample from exp(-f(x,y))
    const term1 = this.a - x;
    const term2 = y - x * x;
    const val = (term1 * term1) + this.b * (term2 * term2);
    return -val * this.scale;
  }
}

export class GaussianMixture extends Distribution2D {
  constructor(distance = 2.5) {
    super();
    this.distance = distance;
    this.sigma = 0.8;
    this.variance = this.sigma * this.sigma;
  }

  logPdf(x, y) {
    // Two modes, one at (-distance, -distance) and one at (distance, distance)
    const dx1 = x + this.distance;
    const dy1 = y + this.distance;
    const term1 = Math.exp(-(dx1 * dx1 + dy1 * dy1) / (2 * this.variance));

    const dx2 = x - this.distance;
    const dy2 = y - this.distance;
    const term2 = Math.exp(-(dx2 * dx2 + dy2 * dy2) / (2 * this.variance));

    // We add the probabilities (mixture) and then take the log
    // We can add a tiny epsilon to prevent log(0)
    return Math.log(term1 + term2 + 1e-10);
  }
}

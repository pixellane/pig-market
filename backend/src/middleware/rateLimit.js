import rateLimit from 'express-rate-limit';

// Strict login rate limiter: prevents brute-force attempts against admin login
// Window: 15 minutes, Max: 10 attempts per IP
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res /*, next */) => {
    // Generic response to avoid revealing sensitive info
    return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
  },
});

export default loginRateLimiter;

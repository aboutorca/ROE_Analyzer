/**
 * Rate Limiter for SEC EDGAR API Compliance
 * 
 * Enforces SEC EDGAR API guidelines:
 * - Maximum 10 requests per second
 * - 100ms delay between requests
 * - Exponential backoff for retries (2^attempt * 1000ms)
 * - Promise-based approach for async operations
 */
class RateLimiter {
    constructor() {
        this.maxRequestsPerSecond = 10;
        this.delayBetweenRequests = 100; // 100ms
        this.requestTimes = [];
        this.lastRequestTime = 0;
    }

    /**
     * Acquire permission to make a request (alias for waitForSlot)
     * @returns {Promise<void>}
     */
    async acquire() {
        return this.waitForSlot();
    }

    /**
     * Wait for an available slot to make a request
     * Ensures compliance with 10 requests/sec limit and 100ms delay
     * @returns {Promise<void>}
     */
    async waitForSlot() {
        const now = Date.now();
        
        // Clean up request times older than 1 second
        this.requestTimes = this.requestTimes.filter(time => now - time < 1000);
        
        // Check if we've hit the rate limit (10 requests per second)
        if (this.requestTimes.length >= this.maxRequestsPerSecond) {
            const oldestRequest = Math.min(...this.requestTimes);
            const waitTime = 1000 - (now - oldestRequest);
            
            if (waitTime > 0) {
                await this.sleep(waitTime);
                return this.waitForSlot(); // Recursively check again
            }
        }
        
        // Ensure minimum 100ms delay between requests
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.delayBetweenRequests) {
            const delayNeeded = this.delayBetweenRequests - timeSinceLastRequest;
            await this.sleep(delayNeeded);
        }
        
        // Record this request time
        const requestTime = Date.now();
        this.requestTimes.push(requestTime);
        this.lastRequestTime = requestTime;
        
        return Promise.resolve();
    }

    /**
     * Handle errors with exponential backoff
     * @param {number} attempt - The current attempt number (0-based)
     * @returns {Promise<void>}
     */
    async handleError(attempt) {
        if (attempt < 0) {
            throw new Error('Attempt number must be non-negative');
        }
        
        // Exponential backoff: 2^attempt * 1000ms
        const backoffTime = Math.pow(2, attempt) * 1000;
        
        // Cap the maximum backoff time at 30 seconds for practical purposes
        const maxBackoffTime = 30000;
        const actualBackoffTime = Math.min(backoffTime, maxBackoffTime);
        
        console.log(`Rate limiter: Backing off for ${actualBackoffTime}ms (attempt ${attempt + 1})`);
        
        await this.sleep(actualBackoffTime);
        return Promise.resolve();
    }

    /**
     * Sleep for a specified number of milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current rate limiter statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        const now = Date.now();
        const recentRequests = this.requestTimes.filter(time => now - time < 1000);
        
        return {
            requestsInLastSecond: recentRequests.length,
            maxRequestsPerSecond: this.maxRequestsPerSecond,
            timeSinceLastRequest: now - this.lastRequestTime,
            delayBetweenRequests: this.delayBetweenRequests
        };
    }

    /**
     * Reset the rate limiter state
     * Useful for testing or reinitializing
     */
    reset() {
        this.requestTimes = [];
        this.lastRequestTime = 0;
    }
}

export default RateLimiter;

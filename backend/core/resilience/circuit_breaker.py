from tenacity import retry, stop_after_attempt, wait_exponential, circuit_breaker
import logging

logger = logging.getLogger(__name__)

# Circuit breaker configuration
# Open after 5 failures
# Attempt to reset after 60 seconds
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout

    @retry(
        stop=stop_after_attempt(3), 
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def call_external_api(self, func, *args, **kwargs):
        """
        Wrap external API calls (e.g., to LLM provider) with retry logic.
        """
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logger.error(f"External API call failed: {str(e)}")
            raise e

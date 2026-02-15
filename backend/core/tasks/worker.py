from arq.connections import RedisSettings
from datetime import timedelta

class WorkerSettings:
    functions = [] # We will add task functions here
    redis_settings = RedisSettings(host='localhost', port=6379)
    on_startup = None
    on_shutdown = None
    max_jobs = 10
    job_timeout = timedelta(minutes=10)

async def startup(ctx):
    # Initialize DB connection pool, etc.
    pass

async def shutdown(ctx):
    # Close DB connections
    pass

WorkerSettings.on_startup = startup
WorkerSettings.on_shutdown = shutdown

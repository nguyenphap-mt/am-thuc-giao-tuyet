from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from fastapi import FastAPI

def setup_tracing(app: FastAPI):
    """
    Configure OpenTelemetry tracing for the FastAPI application.
    """
    provider = TracerProvider()
    
    # In production, we would use OTLPSpanExporter to send to Jaeger/Tempo
    processor = BatchSpanProcessor(ConsoleSpanExporter())
    provider.add_span_processor(processor)
    
    trace.set_tracer_provider(provider)
    
    # Auto-instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)
    
    return trace.get_tracer(__name__)

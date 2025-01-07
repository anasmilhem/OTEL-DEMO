# Auto-Instrumentation and Trace Collection with OpenTelemetry

## Introduction
After setting up log collection, the next step is to configure automatic instrumentation for Node.js applications and collect traces. This guide covers:
1. Setting up auto-instrumentation configuration
2. Enabling instrumentation via namespace annotation
3. Understanding the trace collection process

## Step 1: Enable Auto-Instrumentation via Namespace Annotation

Add the auto-instrumentation annotation to your namespace:

```yaml:k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: custom-otel-app
  annotations:
    instrumentation.opentelemetry.io/inject-nodejs: "true"
```

### Method 1: Using kubectl apply after updating the namespace.yaml file
```bash
kubectl apply -f k8s/namespace.yaml
```

### Method 2: Using kubectl annotate (for existing namespace)
```bash
# Add annotation to existing namespace
kubectl annotate namespace custom-otel-app instrumentation.opentelemetry.io/inject-nodejs="true"

# If you need to update an existing annotation, add --overwrite
kubectl annotate namespace custom-otel-app instrumentation.opentelemetry.io/inject-nodejs="true" --overwrite

# To verify the annotation
kubectl get namespace custom-otel-app -o yaml | grep -A 1 annotations
```


## Step 2: Creating the Auto-Instrumentation Configuration

Let's create the instrumentation configuration file:

```yaml:k8s/otel-instrumentation/node.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: demo-instrumentation
spec:
  exporter:
    endpoint: http://dynatrace-logs-collector.dynatrace.svc.cluster.local:4318
  propagators:
    - tracecontext    # Enables distributed tracing context
    - baggage        # Enables passing metadata between services
  sampler:
    type: parentbased_traceidratio    # Sampling strategy
    argument: "1"    # Sample 100% of traces
  nodejs:
    env:
      - name: OTEL_NODE_ENABLED_INSTRUMENTATIONS
        value: http,express,mongodb,winston,mongoose
      - name: OTEL_EXPORTER_OTLP_PROTOCOL
        value: "http/protobuf"
      - name: OTEL_EXPORTER_OTLP_ENDPOINT
        value: "http://dynatrace-logs-collector.dynatrace.svc.cluster.local:4318"
      - name: OTEL_NODE_INCLUDE_TRACE_CONTEXT
        value: "true"
      - name: OTEL_LOG_LEVEL
        value: "debug"
```

```bash
kubectl apply -f https://raw.githubusercontent.com/anasmilhem/OTEL-DEMO/main/k8s/otel-instrumentation/node.yaml -n custom-otel-app
```

### Understanding the Configuration

1. **Exporter Configuration**:
   - Points to our DaemonSet collector
   - Uses OTLP HTTP protocol
   - Ensures traces go through the same pipeline as logs

2. **Propagators**:
   - `tracecontext`: W3C standard for trace context propagation
   - `baggage`: Allows metadata to flow between services

3. **Sampling Configuration**:
   - Uses parent-based sampling
   - Set to 100% for development (adjust for production)

4. **Node.js Specific Settings**:
   - Enables specific instrumentations (http, express, etc.)
   - Configures debug logging
   - Ensures trace context is included

## Step 2: Enable Auto-Instrumentation via Namespace Annotation

Add the auto-instrumentation annotation to your namespace:

```yaml:k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: custom-otel-app
  annotations:
    instrumentation.opentelemetry.io/inject-nodejs: "true"
```

### Method 1: Using kubectl apply after updating the namespace.yaml file
```bash
kubectl apply -f k8s/namespace.yaml
```

### Method 2: Using kubectl annotate (for existing namespace)
```bash
# Add annotation to existing namespace
kubectl annotate namespace custom-otel-app instrumentation.opentelemetry.io/inject-nodejs="true"

# If you need to update an existing annotation, add --overwrite
kubectl annotate namespace custom-otel-app instrumentation.opentelemetry.io/inject-nodejs="true" --overwrite

# To verify the annotation
kubectl get namespace custom-otel-app -o yaml | grep -A 1 annotations
```

### How Auto-Instrumentation Works

1. **Injection Process**:
   - OpenTelemetry Operator watches for pods in annotated namespaces
   - Automatically injects the instrumentation agent
   - Modifies pod spec to include necessary environment variables

2. **Agent Initialization**:
   - Agent loads before application code
   - Automatically instruments supported libraries
   - Establishes connection to collector

3. **Runtime Impact**:
   - Minimal performance overhead
   - No code changes required
   - Automatic context propagation

## Step 3: Verifying the Setup

1. **Check Operator Logs**:

```bash
kubectl logs -n opentelemetry-operator-system deployment/opentelemetry-operator-controller-manager
```

2. **Verify Pod Injection**:

```bash
kubectl get pods -n custom-otel-app -o yaml | grep -i opentelemetry
```

3. **Monitor Trace Flow**:
```bash
kubectl logs -n dynatrace deployment/dynatrace-logs-collector | grep "trace"
```


## Troubleshooting

1. **No Traces Appearing**:
   - Verify namespace annotation
   - Check collector endpoint configuration
   - Inspect pod environment variables

2. **Missing Context**:
   - Ensure propagators are configured
   - Verify instrumentation list includes all needed libraries
   - Check for manual context handling in code

3. **Performance Issues**:
   - Adjust sampling rate
   - Monitor memory usage
   - Check batch export settings

## Next Steps

1. **Custom Instrumentation**:
   - Add manual spans for business logic
   - Implement custom attributes
   - Configure specific instrumentation settings

2. **Monitoring**:
   - Set up trace analytics in Dynatrace
   - Create custom dashboards
   - Configure alerts

3. **Production Readiness**:
   - Review security settings
   - Optimize sampling configuration
   - Plan scaling strategy

## Step 4: Update DaemonSet Collector Configuration

Before traces can flow through our system, we need to update our DaemonSet collector configuration to handle trace data. Add the following to your `dynatrace-otel-collecter-daemonset-template.yaml`:

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
// ... existing config ...
    service:
      pipelines:
        logs:
          receivers: [filelog]
          processors: [k8sattributes, resourcedetection/gcp, resource, attributes, batch]
          exporters: [otlphttp/dynatrace]
        traces:    # Add this new pipeline
          receivers: [otlp]
          processors: [k8sattributes, resourcedetection/gcp, resource, attributes, batch]
          exporters: [otlphttp/dynatrace]
```

```bash
kubectl apply -f dynatrace-otel-collecter-daemonset-template.yaml
```

### Understanding the Trace Pipeline

1. **Receivers**:
   - Uses `otlp` receiver to accept traces from auto-instrumented applications
   - Supports both HTTP (4318) and gRPC (4317) protocols

2. **Processors**:
   - Uses the same processor chain as logs for consistency
   - Enriches traces with Kubernetes metadata
   - Adds cloud resource detection
   - Standardizes attributes
   - Batches for efficient export

3. **Exporters**:
   - Sends traces to Dynatrace using the same exporter as logs
   - Maintains consistent authentication and endpoint configuration

This configuration ensures that:
- Traces and logs use consistent processing
- Both telemetry types are enriched with the same metadata
- The collector can handle both types of data efficiently

## Step 5: Enable OpenTelemetry Collector in Demo Application to send traces and logs from otel demo app collected by the otel sdk

If you've previously installed the OpenTelemetry demo with the collector disabled, you can enable it using one of these methods:

### Method 1: Upgrade Existing Installation
```bash
# Upgrade existing installation with collector enabled
helm upgrade my-otel-demo open-telemetry/opentelemetry-demo `
    --version 0.32.8 `
    --set opentelemetry-collector.enabled=true `
    --values https://raw.githubusercontent.com/anasmilhem/OTEL-DEMO/main/k8s/otel-demo-app/collecter-values.yaml `
    --namespace otel-demo

# Verify the collector is running
kubectl get pods -n otel-demo | grep collector
```

### Method 2: Uninstall and Reinstall
```bash
# Uninstall existing deployment
helm uninstall my-otel-demo -n otel-demo

# Reinstall with collector enabled
helm install my-otel-demo open-telemetry/opentelemetry-demo \
    --version 0.32.8 \
    --set opentelemetry-collector.enabled=true \
    --values https://raw.githubusercontent.com/anasmilhem/OTEL-DEMO/main/k8s/otel-demo-app/collecter-values.yaml \
    --namespace otel-demo \
    --create-namespace
```

## Step 6: Apply the Complete Collecter Configuration

If you've had any issues following along, you can apply the complete final configuration directly:

```bash
kubectl apply -f https://raw.githubusercontent.com/anasmilhem/OTEL-DEMO/main/k8s/otel-collector/dynatrace-otel-collector-daemonset.yaml
```









